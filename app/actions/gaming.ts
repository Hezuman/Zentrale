"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CreateSessionParams } from "@/lib/gaming-types";

// ---------------------------------------------------------------------------
// Game Types
// ---------------------------------------------------------------------------

export async function getGameTypes() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("game_types")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching game types:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ---------------------------------------------------------------------------
// Game Sessions
// ---------------------------------------------------------------------------

export async function getGameSessions(filter?: {
  status?: string;
  game_type_id?: string;
}) {
  const supabase = createClient();

  let query = supabase
    .from("game_sessions")
    .select(
      `*, game_type:game_types(*), participants:session_participants(id, user_id, role, score, score_multiplier, is_active, joined_at)`
    )
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }
  if (filter?.game_type_id) {
    query = query.eq("game_type_id", filter.game_type_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching game sessions:", error);
    return { data: null, error: error.message };
  }

  // Attach profiles for creators and participants
  if (data && data.length > 0) {
    const allUserIds = new Set<string>();
    for (const s of data as any[]) {
      allUserIds.add(s.created_by);
      for (const p of s.participants || []) {
        allUserIds.add(p.user_id);
      }
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, role")
      .in("id", Array.from(allUserIds));

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, { username: p.username, role: p.role }])
    );

    for (const session of data as any[]) {
      session.creator_profile = profileMap.get(session.created_by) || null;
      for (const p of session.participants || []) {
        p.profile = profileMap.get(p.user_id) || null;
      }
    }
  }

  return { data, error: null };
}

export async function getGameSession(id: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("game_sessions")
    .select(
      `*, game_type:game_types(*), participants:session_participants(id, user_id, role, score, score_multiplier, is_active, joined_at)`
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching game session:", error);
    return { data: null, error: error.message };
  }

  // Attach profiles separately (avoids indirect FK join through auth.users)
  if (data) {
    const userIds = new Set<string>();
    userIds.add((data as any).created_by);
    for (const p of (data as any).participants || []) {
      userIds.add(p.user_id);
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, role")
      .in("id", Array.from(userIds));

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, { username: p.username, role: p.role }])
    );

    (data as any).creator_profile = profileMap.get((data as any).created_by) || null;
    for (const p of (data as any).participants || []) {
      p.profile = profileMap.get(p.user_id) || null;
    }
  }

  return { data, error: null };
}

export async function createGameSession(params: CreateSessionParams) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "Nicht authentifiziert." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["admin", "family", "close_friends", "friends"].includes(profile.role)
  ) {
    return { data: null, error: "Keine Berechtigung." };
  }

  // Validate
  if (!params.game_type_id) {
    return { data: null, error: "Spieltyp muss ausgewählt werden." };
  }

  const insertData: Record<string, unknown> = {
    game_type_id: params.game_type_id,
    created_by: user.id,
    status: "lobby",
    name: params.name?.trim() || null,
    max_players: params.max_players || null,
    target_score: params.target_score || null,
    mentos_stake: params.mentos_stake || 0,
    settings: params.settings || {},
  };

  const { data, error } = await supabase
    .from("game_sessions")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Error creating game session:", error);
    return { data: null, error: "Session konnte nicht erstellt werden." };
  }

  // Auto-join creator as host
  await supabase.from("session_participants").insert({
    session_id: data.id,
    user_id: user.id,
    role: "host",
  });

  // If there's a mentos stake, deduct from creator
  if (params.mentos_stake && params.mentos_stake > 0) {
    await deductMentosStake(user.id, data.id, params.mentos_stake);
  }

  revalidatePath("/spiele");
  return { data, error: null };
}

export async function joinGameSession(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["admin", "family", "close_friends", "friends"].includes(profile.role)
  ) {
    return { error: "Keine Berechtigung." };
  }

  // Check session is in lobby
  const { data: session } = await supabase
    .from("game_sessions")
    .select("id, status, max_players, mentos_stake")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return { error: "Session nicht gefunden." };
  }

  if (session.status !== "lobby") {
    return { error: "Session ist nicht mehr in der Lobby." };
  }

  // Check max players
  if (session.max_players) {
    const { count } = await supabase
      .from("session_participants")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("is_active", true);

    if (count !== null && count >= session.max_players) {
      return { error: "Session ist voll." };
    }
  }

  // Check if already joined
  const { data: existing } = await supabase
    .from("session_participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { error: "Du bist bereits in dieser Session." };
  }

  const { error } = await supabase.from("session_participants").insert({
    session_id: sessionId,
    user_id: user.id,
    role: "player",
  });

  if (error) {
    console.error("Error joining session:", error);
    return { error: "Beitritt fehlgeschlagen." };
  }

  // Deduct stake if applicable (negative balance allowed)
  if (session.mentos_stake > 0) {
    await deductMentosStake(user.id, sessionId, session.mentos_stake);
  }

  revalidatePath(`/spiele/${sessionId}`);
  revalidatePath("/spiele");
  return { error: null };
}

export async function leaveGameSession(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  // Check session is in lobby
  const { data: session } = await supabase
    .from("game_sessions")
    .select("id, status, mentos_stake")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return { error: "Session nicht gefunden." };
  }

  if (session.status !== "lobby") {
    return { error: "Du kannst nur in der Lobby die Session verlassen." };
  }

  // Check that user is a participant but NOT the host
  const { data: participant } = await supabase
    .from("session_participants")
    .select("id, role")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    return { error: "Du bist nicht in dieser Session." };
  }

  if (participant.role === "host") {
    return { error: "Der Host kann die Session nicht verlassen. Breche die Session ab." };
  }

  const { error } = await supabase
    .from("session_participants")
    .delete()
    .eq("id", participant.id);

  if (error) {
    console.error("Error leaving session:", error);
    return { error: "Verlassen fehlgeschlagen." };
  }

  // Refund stake if applicable
  if (session.mentos_stake > 0) {
    await refundMentosStake(user.id, sessionId, session.mentos_stake);
  }

  revalidatePath(`/spiele/${sessionId}`);
  revalidatePath("/spiele");
  return { error: null };
}

export async function startGameSession(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  // Verify user is host
  const { data: participant } = await supabase
    .from("session_participants")
    .select("role")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!participant || participant.role !== "host") {
    // Allow admin override
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return { error: "Nur der Host kann die Session starten." };
    }
  }

  const { error } = await supabase
    .from("game_sessions")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("status", "lobby");

  if (error) {
    console.error("Error starting session:", error);
    return { error: "Session konnte nicht gestartet werden." };
  }

  revalidatePath(`/spiele/${sessionId}`);
  revalidatePath("/spiele");
  return { error: null };
}

export async function finishGameSession(
  sessionId: string,
  winnerId?: string,
  winnerSummary?: string
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  // Verify user is host or admin
  const { data: participant } = await supabase
    .from("session_participants")
    .select("role")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!participant || participant.role !== "host") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return { error: "Nur der Host kann die Session beenden." };
    }
  }

  const updateData: Record<string, unknown> = {
    status: "finished",
    finished_at: new Date().toISOString(),
  };

  if (winnerId) {
    updateData.winner_id = winnerId;
  }
  if (winnerSummary) {
    updateData.winner_summary = winnerSummary;
  }

  const { error } = await supabase
    .from("game_sessions")
    .update(updateData)
    .eq("id", sessionId)
    .eq("status", "running");

  if (error) {
    console.error("Error finishing session:", error);
    return { error: "Session konnte nicht beendet werden." };
  }

  // Payout mentos if there's a winner and stake
  if (winnerId) {
    const { data: session } = await supabase
      .from("game_sessions")
      .select("mentos_stake")
      .eq("id", sessionId)
      .single();

    if (session && session.mentos_stake > 0) {
      const { count } = await supabase
        .from("session_participants")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .eq("is_active", true);

      const totalPot = session.mentos_stake * (count || 0);
      await creditMentosPayout(winnerId, sessionId, totalPot);
    }

    // Update winner stats
    await incrementUserStats(winnerId, { wins: 1 });
  }

  // Update all participants stats
  const { data: participants } = await supabase
    .from("session_participants")
    .select("user_id, score")
    .eq("session_id", sessionId)
    .eq("is_active", true);

  if (participants) {
    for (const p of participants) {
      await incrementUserStats(p.user_id, {
        sessions: 1,
        score: p.score,
      });
    }
  }

  revalidatePath(`/spiele/${sessionId}`);
  revalidatePath("/spiele");
  return { error: null };
}

export async function cancelGameSession(sessionId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  // Verify host or admin
  const { data: participant } = await supabase
    .from("session_participants")
    .select("role")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!participant || participant.role !== "host") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return { error: "Nur der Host kann die Session abbrechen." };
    }
  }

  // Get session to check for refunds
  const { data: session } = await supabase
    .from("game_sessions")
    .select("status, mentos_stake")
    .eq("id", sessionId)
    .single();

  if (!session || (session.status !== "lobby" && session.status !== "running")) {
    return { error: "Session kann nicht mehr abgebrochen werden." };
  }

  const { error } = await supabase
    .from("game_sessions")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    console.error("Error cancelling session:", error);
    return { error: "Session konnte nicht abgebrochen werden." };
  }

  // Refund stakes if session had mentos stake
  if (session.mentos_stake > 0) {
    const { data: participants } = await supabase
      .from("session_participants")
      .select("user_id")
      .eq("session_id", sessionId)
      .eq("is_active", true);

    if (participants) {
      for (const p of participants) {
        await refundMentosStake(p.user_id, sessionId, session.mentos_stake);
      }
    }
  }

  revalidatePath(`/spiele/${sessionId}`);
  revalidatePath("/spiele");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Score management
// ---------------------------------------------------------------------------

export async function addScore(
  sessionId: string,
  userId: string,
  points: number,
  reason?: string
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  // Verify caller is host or admin
  const { data: callerParticipant } = await supabase
    .from("session_participants")
    .select("role")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!callerParticipant || callerParticipant.role !== "host") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return { error: "Nur der Host kann Punkte vergeben." };
    }
  }

  // Get participant to apply multiplier
  const { data: targetParticipant } = await supabase
    .from("session_participants")
    .select("id, score, score_multiplier")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .single();

  if (!targetParticipant) {
    return { error: "Spieler nicht in dieser Session." };
  }

  const effectivePoints = Math.round(points * targetParticipant.score_multiplier);
  const newScore = targetParticipant.score + effectivePoints;

  // Update participant score
  await supabase
    .from("session_participants")
    .update({ score: newScore })
    .eq("id", targetParticipant.id);

  // Log score entry
  await supabase.from("session_score_log").insert({
    session_id: sessionId,
    user_id: userId,
    points: effectivePoints,
    reason: reason || null,
  });

  revalidatePath(`/spiele/${sessionId}`);
  return { error: null, newScore };
}

export async function updateParticipantMultiplier(
  sessionId: string,
  userId: string,
  multiplier: number
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nicht authentifiziert." };
  }

  if (multiplier <= 0) {
    return { error: "Multiplikator muss größer als 0 sein." };
  }

  const { error } = await supabase
    .from("session_participants")
    .update({ score_multiplier: multiplier })
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating multiplier:", error);
    return { error: "Multiplikator konnte nicht aktualisiert werden." };
  }

  revalidatePath(`/spiele/${sessionId}`);
  return { error: null };
}

// ---------------------------------------------------------------------------
// Mentos Coin helpers
// ---------------------------------------------------------------------------

async function ensureMentosBalance(userId: string) {
  const supabase = createClient();

  const { data } = await supabase
    .from("mentos_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    await supabase
      .from("mentos_balances")
      .insert({ user_id: userId, balance: 0 });
    return 0;
  }

  return data.balance;
}

async function deductMentosStake(
  userId: string,
  sessionId: string,
  amount: number
) {
  const supabase = createClient();
  const currentBalance = await ensureMentosBalance(userId);
  const newBalance = currentBalance - amount;

  await supabase
    .from("mentos_balances")
    .update({ balance: newBalance })
    .eq("user_id", userId);

  await supabase.from("mentos_transactions").insert({
    user_id: userId,
    session_id: sessionId,
    tx_type: "session_stake",
    amount: -amount,
    balance_after: newBalance,
    note: "Einsatz für Spielsession",
  });

  // Update stats
  await incrementUserStats(userId, { mentosLost: amount });
}

async function creditMentosPayout(
  userId: string,
  sessionId: string,
  amount: number
) {
  const supabase = createClient();
  const currentBalance = await ensureMentosBalance(userId);
  const newBalance = currentBalance + amount;

  await supabase
    .from("mentos_balances")
    .update({ balance: newBalance })
    .eq("user_id", userId);

  await supabase.from("mentos_transactions").insert({
    user_id: userId,
    session_id: sessionId,
    tx_type: "session_payout",
    amount: amount,
    balance_after: newBalance,
    note: "Gewinn aus Spielsession",
  });

  await incrementUserStats(userId, { mentosWon: amount });
}

async function refundMentosStake(
  userId: string,
  sessionId: string,
  amount: number
) {
  const supabase = createClient();
  const currentBalance = await ensureMentosBalance(userId);
  const newBalance = currentBalance + amount;

  await supabase
    .from("mentos_balances")
    .update({ balance: newBalance })
    .eq("user_id", userId);

  await supabase.from("mentos_transactions").insert({
    user_id: userId,
    session_id: sessionId,
    tx_type: "session_refund",
    amount: amount,
    balance_after: newBalance,
    note: "Rückerstattung wegen Abbruch",
  });
}

// ---------------------------------------------------------------------------
// Mentos Coin public queries
// ---------------------------------------------------------------------------

export async function getMentosBalance(userId: string) {
  const supabase = createClient();

  const { data } = await supabase
    .from("mentos_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.balance ?? 0;
}

export async function getMentosTransactions(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("mentos_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching mentos transactions:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ---------------------------------------------------------------------------
// User gaming stats helpers
// ---------------------------------------------------------------------------

async function incrementUserStats(
  userId: string,
  increments: {
    sessions?: number;
    wins?: number;
    score?: number;
    mentosWon?: number;
    mentosLost?: number;
  }
) {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("user_gaming_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("user_gaming_stats").insert({
      user_id: userId,
      total_sessions: increments.sessions || 0,
      total_wins: increments.wins || 0,
      total_score: increments.score || 0,
      total_mentos_won: increments.mentosWon || 0,
      total_mentos_lost: increments.mentosLost || 0,
    });
  } else {
    await supabase
      .from("user_gaming_stats")
      .update({
        total_sessions: existing.total_sessions + (increments.sessions || 0),
        total_wins: existing.total_wins + (increments.wins || 0),
        total_score: existing.total_score + (increments.score || 0),
        total_mentos_won:
          existing.total_mentos_won + (increments.mentosWon || 0),
        total_mentos_lost:
          existing.total_mentos_lost + (increments.mentosLost || 0),
      })
      .eq("user_id", userId);
  }
}

export async function getUserGamingStats(userId: string) {
  const supabase = createClient();

  const { data } = await supabase
    .from("user_gaming_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return (
    data || {
      user_id: userId,
      total_sessions: 0,
      total_wins: 0,
      total_score: 0,
      total_mentos_won: 0,
      total_mentos_lost: 0,
      updated_at: new Date().toISOString(),
    }
  );
}

// ---------------------------------------------------------------------------
// Session history
// ---------------------------------------------------------------------------

export async function getUserSessionHistory(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("session_participants")
    .select(
      `session_id, role, score, joined_at, session:game_sessions(id, name, status, mentos_stake, winner_id, created_at, finished_at, game_type:game_types(slug, name, icon))`
    )
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching session history:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
