"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  joinGameSession,
  startGameSession,
  finishGameSession,
  cancelGameSession,
  addScore,
  updateParticipantMultiplier,
} from "@/app/actions/gaming";
import {
  SESSION_STATUS_LABELS,
  SESSION_STATUS_COLORS,
} from "@/lib/gaming-types";
import type { GameSessionStatus } from "@/lib/gaming-types";
import { BuzzerPanel } from "./buzzer-panel";

export function SessionView({
  session,
  currentUserId,
  currentUserRole,
}: {
  session: any;
  currentUserId: string;
  currentUserRole: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status: GameSessionStatus = session.status;
  const gameType = session.game_type;
  const participants = session.participants || [];
  const isParticipant = participants.some(
    (p: any) => p.user_id === currentUserId
  );
  const isHost = participants.some(
    (p: any) => p.user_id === currentUserId && p.role === "host"
  );
  const isAdmin = currentUserRole === "admin";
  const canManage = isHost || isAdmin;

  const sortedParticipants = [...participants].sort(
    (a: any, b: any) => b.score - a.score
  );

  // Find the highest-scoring participant for auto-winner
  const topScorer =
    sortedParticipants.length > 0 ? sortedParticipants[0] : null;

  async function handleJoin() {
    setLoading(true);
    setError(null);
    const result = await joinGameSession(session.id);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleStart() {
    setLoading(true);
    setError(null);
    const result = await startGameSession(session.id);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleFinish() {
    setLoading(true);
    setError(null);
    const winnerId = topScorer?.user_id || undefined;
    const winnerName = topScorer?.profile?.username;
    const result = await finishGameSession(
      session.id,
      winnerId,
      winnerId ? `Gewinner: ${winnerName} mit ${topScorer.score} Punkten` : undefined
    );
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleCancel() {
    setLoading(true);
    setError(null);
    const result = await cancelGameSession(session.id);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleAddScore(userId: string, points: number) {
    setError(null);
    const result = await addScore(session.id, userId, points, "manual");
    if (result.error) {
      setError(result.error);
    }
    router.refresh();
  }

  async function handleMultiplierChange(userId: string, multiplier: number) {
    setError(null);
    const result = await updateParticipantMultiplier(
      session.id,
      userId,
      multiplier
    );
    if (result.error) {
      setError(result.error);
    }
    router.refresh();
  }

  return (
    <div className="session-view">
      {/* Header */}
      <div className="session-header">
        <div className="session-header-left">
          <span className="session-type-icon">
            {gameType?.icon || "🎮"}
          </span>
          <div>
            <h2 className="session-title">
              {session.name || gameType?.name || "Spielsession"}
            </h2>
            <span className="session-type-label">{gameType?.name}</span>
          </div>
        </div>
        <span
          className="spiele-session-status session-status-lg"
          style={{
            color: SESSION_STATUS_COLORS[status],
            borderColor: SESSION_STATUS_COLORS[status],
          }}
        >
          {SESSION_STATUS_LABELS[status]}
        </span>
      </div>

      {/* Session info */}
      <div className="session-info-row">
        {session.target_score && (
          <span className="session-info-item">🎯 Ziel: {session.target_score} Punkte</span>
        )}
        {session.max_players && (
          <span className="session-info-item">
            👥 Max: {session.max_players} Spieler
          </span>
        )}
        {session.mentos_stake > 0 && (
          <span className="session-info-item">
            🪙 Einsatz: {session.mentos_stake} Mentos
          </span>
        )}
      </div>

      {/* Winner banner */}
      {status === "finished" && session.winner_summary && (
        <div className="session-winner-banner">
          🏆 {session.winner_summary}
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {/* Actions */}
      <div className="session-actions">
        {status === "lobby" && !isParticipant && (
          <button
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={loading}
          >
            {loading ? "…" : "Beitreten"}
          </button>
        )}
        {status === "lobby" && canManage && (
          <button
            className="btn btn-secondary"
            onClick={handleStart}
            disabled={loading || participants.length < 1}
          >
            {loading ? "…" : "▶ Spiel starten"}
          </button>
        )}
        {status === "running" && canManage && (
          <button
            className="btn btn-primary"
            onClick={handleFinish}
            disabled={loading}
          >
            {loading ? "…" : "✓ Spiel beenden"}
          </button>
        )}
        {(status === "lobby" || status === "running") && canManage && (
          <button
            className="btn btn-danger"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? "…" : "✕ Abbrechen"}
          </button>
        )}
      </div>

      {/* Buzzer Panel (only for buzzer game type) */}
      {gameType?.slug === "buzzer" && (
        <BuzzerPanel
          sessionId={session.id}
          currentUserId={currentUserId}
          isHost={canManage}
          isRunning={status === "running"}
          participants={participants}
        />
      )}

      {/* Participants / Scoreboard */}
      <div className="session-participants">
        <h3 className="spiele-section-title">
          Spieler ({participants.length})
        </h3>
        <div className="session-player-list">
          {sortedParticipants.map((p: any, idx: number) => (
            <div key={p.id} className="session-player-row">
              <div className="session-player-rank">
                {idx === 0 && sortedParticipants.length > 1 && p.score > 0
                  ? "🥇"
                  : idx === 1 && p.score > 0
                  ? "🥈"
                  : idx === 2 && p.score > 0
                  ? "🥉"
                  : `#${idx + 1}`}
              </div>
              <div className="session-player-info">
                <span className="session-player-name">
                  {p.profile?.username || "Unbekannt"}
                </span>
                {p.role === "host" && (
                  <span className="session-player-host-badge">Host</span>
                )}
                {p.score_multiplier !== 1 && (
                  <span className="session-player-multiplier">
                    ×{p.score_multiplier}
                  </span>
                )}
              </div>
              <div className="session-player-score">{p.score}</div>
              {/* Score controls for host in running sessions */}
              {status === "running" && canManage && (
                <div className="session-player-controls">
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleAddScore(p.user_id, -1)}
                    title="-1 Punkt"
                  >
                    −
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleAddScore(p.user_id, 1)}
                    title="+1 Punkt"
                  >
                    +
                  </button>
                </div>
              )}
              {/* Multiplier control for host in lobby */}
              {status === "lobby" && canManage && (
                <div className="session-player-controls">
                  <select
                    className="form-select form-select-sm"
                    value={p.score_multiplier}
                    onChange={(e) =>
                      handleMultiplierChange(
                        p.user_id,
                        parseFloat(e.target.value)
                      )
                    }
                  >
                    <option value="0.5">×0.5</option>
                    <option value="0.75">×0.75</option>
                    <option value="1">×1.0</option>
                    <option value="1.25">×1.25</option>
                    <option value="1.5">×1.5</option>
                    <option value="2">×2.0</option>
                  </select>
                </div>
              )}
            </div>
          ))}
          {participants.length === 0 && (
            <p className="spiele-empty">Noch keine Spieler beigetreten.</p>
          )}
        </div>
      </div>
    </div>
  );
}
