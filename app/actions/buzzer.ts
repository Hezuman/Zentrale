"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { addScore } from "@/app/actions/gaming";
import { BUZZER_QUEUE_WINDOW_MS } from "@/lib/buzzer-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyHostOrAdmin(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  userId: string
): Promise<boolean> {
  const { data: participant } = await supabase
    .from("session_participants")
    .select("role")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .single();

  if (participant?.role === "host") return true;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return profile?.role === "admin";
}

async function getCurrentRound(
  supabase: ReturnType<typeof createClient>,
  sessionId: string
) {
  const { data } = await supabase
    .from("buzzer_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

// ---------------------------------------------------------------------------
// Round queries
// ---------------------------------------------------------------------------

export async function getBuzzerRound(sessionId: string) {
  const supabase = createClient();

  const round = await getCurrentRound(supabase, sessionId);
  if (!round) return { round: null, queue: [] };

  const { data: queue } = await supabase
    .from("buzzer_queue")
    .select("*, profile:profiles(username, role)")
    .eq("round_id", round.id)
    .order("position", { ascending: true });

  return { round, queue: queue || [] };
}

// ---------------------------------------------------------------------------
// startNewRound – Game Master creates the next round
// ---------------------------------------------------------------------------

export async function startNewRound(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert." };

  const isAllowed = await verifyHostOrAdmin(supabase, sessionId, user.id);
  if (!isAllowed) return { error: "Nur der Game Master kann Runden starten." };

  // Session must be running
  const { data: session } = await supabase
    .from("game_sessions")
    .select("status")
    .eq("id", sessionId)
    .single();

  if (!session || session.status !== "running") {
    return { error: "Session läuft nicht." };
  }

  // Resolve any unresolved round first
  const currentRound = await getCurrentRound(supabase, sessionId);
  if (currentRound && currentRound.state !== "resolved") {
    await supabase
      .from("buzzer_rounds")
      .update({ state: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", currentRound.id);
  }

  const nextNumber = currentRound ? currentRound.round_number + 1 : 1;

  const { data: newRound, error } = await supabase
    .from("buzzer_rounds")
    .insert({
      session_id: sessionId,
      round_number: nextNumber,
      state: "open",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating buzzer round:", error);
    return { error: "Runde konnte nicht gestartet werden." };
  }

  revalidatePath(`/spiele/${sessionId}`);
  return { error: null, round: newRound };
}

// ---------------------------------------------------------------------------
// buzz – Player buzzes in
// ---------------------------------------------------------------------------

export async function buzz(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert." };

  // Verify player is a non-host participant
  const { data: participant } = await supabase
    .from("session_participants")
    .select("role, is_active")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!participant || !participant.is_active) {
    return { error: "Du bist kein aktiver Teilnehmer." };
  }
  if (participant.role === "host") {
    return { error: "Der Game Master kann nicht buzzern." };
  }

  // Get current round
  const round = await getCurrentRound(supabase, sessionId);
  if (!round) return { error: "Keine aktive Runde." };

  // Round must be open or queue still accepting (within window)
  if (round.state !== "open") {
    // If queue_locked, answering, or resolved – reject
    return { error: "Buzzern ist nicht mehr möglich." };
  }

  // Check queue window: if first_buzz_at exists, check whether window expired
  if (round.first_buzz_at) {
    const elapsed = Date.now() - new Date(round.first_buzz_at).getTime();
    if (elapsed > BUZZER_QUEUE_WINDOW_MS) {
      return { error: "Buzz-Fenster ist abgelaufen." };
    }
  }

  // Check if player already buzzed this round
  const { data: existing } = await supabase
    .from("buzzer_queue")
    .select("id")
    .eq("round_id", round.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { error: "Du hast bereits gebuzzert." };
  }

  // Determine position (server-authoritative order)
  const { count } = await supabase
    .from("buzzer_queue")
    .select("id", { count: "exact", head: true })
    .eq("round_id", round.id);

  const position = (count || 0) + 1;

  // Insert buzz
  const { error: insertError } = await supabase
    .from("buzzer_queue")
    .insert({
      round_id: round.id,
      user_id: user.id,
      position,
    });

  if (insertError) {
    console.error("Error inserting buzz:", insertError);
    return { error: "Buzz fehlgeschlagen." };
  }

  // If this is the first buzz, set first_buzz_at on the round
  if (!round.first_buzz_at) {
    await supabase
      .from("buzzer_rounds")
      .update({ first_buzz_at: new Date().toISOString() })
      .eq("id", round.id);
  }

  revalidatePath(`/spiele/${sessionId}`);
  return { error: null, position };
}

// ---------------------------------------------------------------------------
// lockQueue – Game Master locks the queue and starts answering phase
// ---------------------------------------------------------------------------

export async function lockQueue(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert." };

  const isAllowed = await verifyHostOrAdmin(supabase, sessionId, user.id);
  if (!isAllowed)
    return { error: "Nur der Game Master kann die Queue sperren." };

  const round = await getCurrentRound(supabase, sessionId);
  if (!round || round.state !== "open") {
    return { error: "Runde ist nicht offen." };
  }

  // Get first player in queue
  const { data: firstInQueue } = await supabase
    .from("buzzer_queue")
    .select("user_id")
    .eq("round_id", round.id)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("buzzer_rounds")
    .update({
      state: "answering",
      queue_locked_at: new Date().toISOString(),
      active_responder_id: firstInQueue?.user_id || null,
    })
    .eq("id", round.id);

  if (error) {
    console.error("Error locking queue:", error);
    return { error: "Queue konnte nicht gesperrt werden." };
  }

  revalidatePath(`/spiele/${sessionId}`);
  return { error: null };
}

// ---------------------------------------------------------------------------
// markCorrect – Game Master marks the active responder as correct
// ---------------------------------------------------------------------------

export async function markCorrect(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert." };

  const isAllowed = await verifyHostOrAdmin(supabase, sessionId, user.id);
  if (!isAllowed) return { error: "Nur der Game Master kann bewerten." };

  const round = await getCurrentRound(supabase, sessionId);
  if (!round || round.state !== "answering" || !round.active_responder_id) {
    return { error: "Keine aktive Antwortphase." };
  }

  // Mark queue entry as correct
  await supabase
    .from("buzzer_queue")
    .update({ is_correct: true })
    .eq("round_id", round.id)
    .eq("user_id", round.active_responder_id);

  // Award score (1 point × multiplier, handled by existing addScore)
  const scoreResult = await addScore(
    sessionId,
    round.active_responder_id,
    1,
    "buzzer_correct"
  );

  if (scoreResult.error) {
    return { error: scoreResult.error };
  }

  // Resolve round
  await supabase
    .from("buzzer_rounds")
    .update({
      state: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", round.id);

  revalidatePath(`/spiele/${sessionId}`);
  return { error: null };
}

// ---------------------------------------------------------------------------
// markWrong – Game Master marks active responder as wrong, next in queue
// ---------------------------------------------------------------------------

export async function markWrong(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert." };

  const isAllowed = await verifyHostOrAdmin(supabase, sessionId, user.id);
  if (!isAllowed) return { error: "Nur der Game Master kann bewerten." };

  const round = await getCurrentRound(supabase, sessionId);
  if (!round || round.state !== "answering" || !round.active_responder_id) {
    return { error: "Keine aktive Antwortphase." };
  }

  // Mark queue entry as wrong
  await supabase
    .from("buzzer_queue")
    .update({ is_correct: false })
    .eq("round_id", round.id)
    .eq("user_id", round.active_responder_id);

  // Find current position of the active responder
  const { data: currentEntry } = await supabase
    .from("buzzer_queue")
    .select("position")
    .eq("round_id", round.id)
    .eq("user_id", round.active_responder_id)
    .single();

  // Find next in queue (position > current, is_correct is null)
  const { data: nextInQueue } = await supabase
    .from("buzzer_queue")
    .select("user_id")
    .eq("round_id", round.id)
    .is("is_correct", null)
    .gt("position", currentEntry?.position || 0)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextInQueue) {
    // Move to next responder
    await supabase
      .from("buzzer_rounds")
      .update({ active_responder_id: nextInQueue.user_id })
      .eq("id", round.id);
  } else {
    // No more players – resolve round with no winner
    await supabase
      .from("buzzer_rounds")
      .update({
        state: "resolved",
        active_responder_id: null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", round.id);
  }

  revalidatePath(`/spiele/${sessionId}`);
  return { error: null };
}

// ---------------------------------------------------------------------------
// skipPlayer – Game Master skips current responder without penalty
// ---------------------------------------------------------------------------

export async function skipPlayer(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert." };

  const isAllowed = await verifyHostOrAdmin(supabase, sessionId, user.id);
  if (!isAllowed) return { error: "Nur der Game Master kann überspringen." };

  const round = await getCurrentRound(supabase, sessionId);
  if (!round || round.state !== "answering" || !round.active_responder_id) {
    return { error: "Keine aktive Antwortphase." };
  }

  // Get current position
  const { data: currentEntry } = await supabase
    .from("buzzer_queue")
    .select("position")
    .eq("round_id", round.id)
    .eq("user_id", round.active_responder_id)
    .single();

  // Find next unevaluated player
  const { data: nextInQueue } = await supabase
    .from("buzzer_queue")
    .select("user_id")
    .eq("round_id", round.id)
    .is("is_correct", null)
    .gt("position", currentEntry?.position || 0)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextInQueue) {
    await supabase
      .from("buzzer_rounds")
      .update({ active_responder_id: nextInQueue.user_id })
      .eq("id", round.id);
  } else {
    // No more players
    await supabase
      .from("buzzer_rounds")
      .update({
        state: "resolved",
        active_responder_id: null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", round.id);
  }

  revalidatePath(`/spiele/${sessionId}`);
  return { error: null };
}

// ---------------------------------------------------------------------------
// resolveRound – Game Master manually resolves (e.g. no one buzzed)
// ---------------------------------------------------------------------------

export async function resolveRound(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert." };

  const isAllowed = await verifyHostOrAdmin(supabase, sessionId, user.id);
  if (!isAllowed) return { error: "Nur der Game Master kann Runden beenden." };

  const round = await getCurrentRound(supabase, sessionId);
  if (!round || round.state === "resolved") {
    return { error: "Keine aktive Runde." };
  }

  await supabase
    .from("buzzer_rounds")
    .update({
      state: "resolved",
      active_responder_id: null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", round.id);

  revalidatePath(`/spiele/${sessionId}`);
  return { error: null };
}
