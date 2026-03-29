"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  buzz,
  lockQueue,
  markCorrect,
  markWrong,
  skipPlayer,
  startNewRound,
  resolveRound,
  getBuzzerRound,
} from "@/app/actions/buzzer";
import {
  BUZZER_ROUND_STATE_LABELS,
  BUZZER_ROUND_STATE_COLORS,
  BUZZER_QUEUE_WINDOW_MS,
} from "@/lib/buzzer-types";
import type { BuzzerRound, BuzzerQueueEntry } from "@/lib/buzzer-types";

interface BuzzerPanelProps {
  sessionId: string;
  currentUserId: string;
  isHost: boolean;
  isRunning: boolean;
  participants: Array<{
    user_id: string;
    role: string;
    profile?: { username: string; role: string };
  }>;
}

export function BuzzerPanel({
  sessionId,
  currentUserId,
  isHost,
  isRunning,
  participants,
}: BuzzerPanelProps) {
  const router = useRouter();
  const [round, setRound] = useState<BuzzerRound | null>(null);
  const [queue, setQueue] = useState<BuzzerQueueEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueWindowActive, setQueueWindowActive] = useState(false);

  const fetchRound = useCallback(async () => {
    const result = await getBuzzerRound(sessionId);
    setRound(result.round);
    setQueue(result.queue);
  }, [sessionId]);

  // Poll for updates every 1s while session is running
  useEffect(() => {
    if (!isRunning) return;
    fetchRound();
    const interval = setInterval(fetchRound, 1000);
    return () => clearInterval(interval);
  }, [isRunning, fetchRound]);

  // Track queue window countdown
  useEffect(() => {
    if (!round?.first_buzz_at || round.state !== "open") {
      setQueueWindowActive(false);
      return;
    }
    const elapsed = Date.now() - new Date(round.first_buzz_at).getTime();
    if (elapsed < BUZZER_QUEUE_WINDOW_MS) {
      setQueueWindowActive(true);
      const timeout = setTimeout(() => {
        setQueueWindowActive(false);
      }, BUZZER_QUEUE_WINDOW_MS - elapsed);
      return () => clearTimeout(timeout);
    }
    setQueueWindowActive(false);
  }, [round?.first_buzz_at, round?.state]);

  const hasBuzzed = queue.some((q) => q.user_id === currentUserId);
  const isPlayer = !isHost;
  const canBuzz =
    isPlayer &&
    isRunning &&
    round?.state === "open" &&
    !hasBuzzed &&
    (!round.first_buzz_at || queueWindowActive);

  const activeResponder = round?.active_responder_id
    ? participants.find((p) => p.user_id === round.active_responder_id)
    : null;

  async function handleAction(action: () => Promise<{ error: string | null }>) {
    setLoading(true);
    setError(null);
    const result = await action();
    if (result.error) setError(result.error);
    await fetchRound();
    setLoading(false);
    router.refresh();
  }

  if (!isRunning) {
    return null;
  }

  return (
    <div className="buzzer-panel">
      <h3 className="spiele-section-title">🔔 Buzzer</h3>

      {/* Round state badge */}
      {round ? (
        <div className="buzzer-round-header">
          <span className="buzzer-round-number">
            Runde {round.round_number}
          </span>
          <span
            className="buzzer-round-state"
            style={{
              color: BUZZER_ROUND_STATE_COLORS[round.state],
              borderColor: BUZZER_ROUND_STATE_COLORS[round.state],
            }}
          >
            {BUZZER_ROUND_STATE_LABELS[round.state]}
          </span>
        </div>
      ) : (
        <p className="spiele-empty">
          {isHost
            ? "Starte die erste Runde."
            : "Warte auf den Game Master..."}
        </p>
      )}

      {error && <div className="form-error">{error}</div>}

      {/* PLAYER: Buzz button */}
      {isPlayer && round && round.state === "open" && (
        <div className="buzzer-action-area">
          <button
            className={`buzzer-btn ${hasBuzzed ? "buzzer-btn-buzzed" : ""}`}
            onClick={() => handleAction(() => buzz(sessionId))}
            disabled={!canBuzz || loading}
          >
            {hasBuzzed ? "✓ Gebuzzert" : "🔔 BUZZ!"}
          </button>
          {queueWindowActive && !hasBuzzed && (
            <span className="buzzer-window-hint">Schnell buzzern!</span>
          )}
        </div>
      )}

      {/* Queue display */}
      {round && queue.length > 0 && (
        <div className="buzzer-queue">
          <h4 className="buzzer-queue-title">
            Warteschlange ({queue.length})
          </h4>
          <div className="buzzer-queue-list">
            {queue.map((entry) => {
              const player = participants.find(
                (p) => p.user_id === entry.user_id
              );
              const isActive =
                round.active_responder_id === entry.user_id;
              return (
                <div
                  key={entry.id}
                  className={`buzzer-queue-item ${
                    isActive ? "buzzer-queue-active" : ""
                  } ${
                    entry.is_correct === true
                      ? "buzzer-queue-correct"
                      : entry.is_correct === false
                      ? "buzzer-queue-wrong"
                      : ""
                  }`}
                >
                  <span className="buzzer-queue-pos">#{entry.position}</span>
                  <span className="buzzer-queue-name">
                    {player?.profile?.username ||
                      entry.profile?.username ||
                      "Unbekannt"}
                  </span>
                  <span className="buzzer-queue-status">
                    {entry.is_correct === true
                      ? "✓"
                      : entry.is_correct === false
                      ? "✕"
                      : isActive
                      ? "◉"
                      : "…"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active responder highlight */}
      {round?.state === "answering" && activeResponder && (
        <div className="buzzer-responder">
          <span className="buzzer-responder-label">Antwortet:</span>
          <span className="buzzer-responder-name">
            {activeResponder.profile?.username || "Unbekannt"}
          </span>
        </div>
      )}

      {/* GAME MASTER controls */}
      {isHost && (
        <div className="buzzer-gm-controls">
          {/* Start new round */}
          {(!round || round.state === "resolved") && (
            <button
              className="btn btn-primary"
              onClick={() => handleAction(() => startNewRound(sessionId))}
              disabled={loading}
            >
              {loading ? "…" : round ? "▶ Nächste Runde" : "▶ Erste Runde starten"}
            </button>
          )}

          {/* Lock queue & start answering */}
          {round?.state === "open" && queue.length > 0 && (
            <button
              className="btn btn-secondary"
              onClick={() => handleAction(() => lockQueue(sessionId))}
              disabled={loading}
            >
              {loading ? "…" : "🔒 Queue sperren & Antwortphase"}
            </button>
          )}

          {/* Answering controls */}
          {round?.state === "answering" && round.active_responder_id && (
            <div className="buzzer-eval-controls">
              <button
                className="btn btn-success"
                onClick={() => handleAction(() => markCorrect(sessionId))}
                disabled={loading}
              >
                {loading ? "…" : "✓ Richtig"}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleAction(() => markWrong(sessionId))}
                disabled={loading}
              >
                {loading ? "…" : "✕ Falsch"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => handleAction(() => skipPlayer(sessionId))}
                disabled={loading}
              >
                {loading ? "…" : "⏭ Überspringen"}
              </button>
            </div>
          )}

          {/* Resolve round manually (e.g. no buzzes) */}
          {round && round.state !== "resolved" && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => handleAction(() => resolveRound(sessionId))}
              disabled={loading}
            >
              {loading ? "…" : "Runde beenden (ohne Wertung)"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
