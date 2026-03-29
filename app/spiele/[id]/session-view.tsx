"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  joinGameSession,
  leaveGameSession,
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
  const isPlayerOnly = isParticipant && !isHost && !isAdmin;

  const sortedParticipants = [...participants].sort(
    (a: any, b: any) => b.score - a.score
  );

  const topScorer =
    sortedParticipants.length > 0 ? sortedParticipants[0] : null;

  const isFull =
    session.max_players != null && participants.length >= session.max_players;

  // Poll for session updates while in lobby (new participants, status changes)
  useEffect(() => {
    if (status !== "lobby") return;
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [status, router]);

  async function handleAction(action: () => Promise<{ error: string | null }>) {
    setLoading(true);
    setError(null);
    const result = await action();
    if (result.error) setError(result.error);
    setLoading(false);
    router.refresh();
  }

  async function handleAddScore(userId: string, points: number) {
    setError(null);
    const result = await addScore(session.id, userId, points, "manual");
    if (result.error) setError(result.error);
    router.refresh();
  }

  async function handleMultiplierChange(userId: string, multiplier: number) {
    setError(null);
    const result = await updateParticipantMultiplier(
      session.id,
      userId,
      multiplier
    );
    if (result.error) setError(result.error);
    router.refresh();
  }

  // =========================================================================
  // Shared: Session header (used in all states)
  // =========================================================================
  const sessionHeader = (
    <div className="session-header">
      <div className="session-header-left">
        <span className="session-type-icon">{gameType?.icon || "🎮"}</span>
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
  );

  // =========================================================================
  // Shared: Session info row
  // =========================================================================
  const sessionInfoRow = (
    <div className="session-info-row">
      {session.creator_profile && (
        <span className="session-info-item">
          👑 Host: {session.creator_profile.username}
        </span>
      )}
      {session.target_score && (
        <span className="session-info-item">
          🎯 Ziel: {session.target_score} Punkte
        </span>
      )}
      {session.max_players && (
        <span className="session-info-item">
          👥 {participants.length}/{session.max_players} Spieler
        </span>
      )}
      {!session.max_players && (
        <span className="session-info-item">
          👥 {participants.length} Spieler
        </span>
      )}
      {session.mentos_stake > 0 && (
        <span className="session-info-item">
          🪙 Einsatz: {session.mentos_stake} Mentos
        </span>
      )}
    </div>
  );

  // =========================================================================
  // LOBBY STATE
  // =========================================================================
  if (status === "lobby") {
    return (
      <div className="session-view">
        {sessionHeader}

        <div className="lobby-banner">
          <span className="lobby-banner-icon">⏳</span>
          <div className="lobby-banner-text">
            <strong>Warteraum</strong>
            <span>Warte auf Spieler… Der Host startet das Spiel.</span>
          </div>
        </div>

        {sessionInfoRow}

        {error && <div className="form-error">{error}</div>}

        {/* Lobby actions */}
        <div className="session-actions">
          {!isParticipant && !isFull && (
            <button
              className="btn btn-primary"
              onClick={() => handleAction(() => joinGameSession(session.id))}
              disabled={loading}
            >
              {loading ? "…" : "Beitreten"}
            </button>
          )}
          {!isParticipant && isFull && (
            <span className="session-full-badge">Session ist voll</span>
          )}
          {isPlayerOnly && (
            <button
              className="btn btn-ghost"
              onClick={() => handleAction(() => leaveGameSession(session.id))}
              disabled={loading}
            >
              {loading ? "…" : "Verlassen"}
            </button>
          )}
          {canManage && (
            <>
              <button
                className="btn btn-primary"
                onClick={() =>
                  handleAction(() => startGameSession(session.id))
                }
                disabled={loading || participants.length < 2}
              >
                {loading ? "…" : "▶ Spiel starten"}
              </button>
              <button
                className="btn btn-danger"
                onClick={() =>
                  handleAction(() => cancelGameSession(session.id))
                }
                disabled={loading}
              >
                {loading ? "…" : "✕ Abbrechen"}
              </button>
            </>
          )}
        </div>

        {/* Participant list (lobby style) */}
        <div className="session-participants">
          <h3 className="spiele-section-title">
            Spieler ({participants.length}
            {session.max_players ? ` / ${session.max_players}` : ""})
          </h3>
          <div className="session-player-list">
            {participants.map((p: any) => (
              <div key={p.id} className="session-player-row">
                <div className="session-player-rank">
                  {p.role === "host" ? "👑" : "🎮"}
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
                {/* Multiplier control for host in lobby */}
                {canManage && (
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

        {canManage && participants.length < 2 && (
          <p className="lobby-hint">
            Mindestens 2 Spieler werden benötigt, um das Spiel zu starten.
          </p>
        )}
      </div>
    );
  }

  // =========================================================================
  // RUNNING STATE
  // =========================================================================
  if (status === "running") {
    return (
      <div className="session-view">
        {sessionHeader}
        {sessionInfoRow}

        {error && <div className="form-error">{error}</div>}

        {/* Host controls */}
        <div className="session-actions">
          {canManage && (
            <>
              <button
                className="btn btn-primary"
                onClick={() =>
                  handleAction(() =>
                    finishGameSession(
                      session.id,
                      topScorer?.user_id || undefined,
                      topScorer?.user_id
                        ? `Gewinner: ${topScorer.profile?.username} mit ${topScorer.score} Punkten`
                        : undefined
                    )
                  )
                }
                disabled={loading}
              >
                {loading ? "…" : "✓ Spiel beenden"}
              </button>
              <button
                className="btn btn-danger"
                onClick={() =>
                  handleAction(() => cancelGameSession(session.id))
                }
                disabled={loading}
              >
                {loading ? "…" : "✕ Abbrechen"}
              </button>
            </>
          )}
        </div>

        {/* Game-type specific UI */}
        {gameType?.slug === "buzzer" && (
          <BuzzerPanel
            sessionId={session.id}
            currentUserId={currentUserId}
            isHost={canManage}
            isRunning={true}
            participants={participants}
          />
        )}

        {/* Scoreboard */}
        <div className="session-participants">
          <h3 className="spiele-section-title">Scoreboard</h3>
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
                {canManage && (
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
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // FINISHED STATE
  // =========================================================================
  if (status === "finished") {
    return (
      <div className="session-view">
        {sessionHeader}
        {sessionInfoRow}

        {session.winner_summary && (
          <div className="session-winner-banner">
            🏆 {session.winner_summary}
          </div>
        )}

        {/* Final scoreboard */}
        <div className="session-participants">
          <h3 className="spiele-section-title">Endergebnis</h3>
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
                </div>
                <div className="session-player-score">{p.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CANCELLED STATE
  // =========================================================================
  return (
    <div className="session-view">
      {sessionHeader}
      {sessionInfoRow}

      <div className="session-cancelled-banner">
        Diese Session wurde abgebrochen.
      </div>

      <div className="session-participants">
        <h3 className="spiele-section-title">Teilnehmer</h3>
        <div className="session-player-list">
          {participants.map((p: any) => (
            <div key={p.id} className="session-player-row">
              <div className="session-player-rank">
                {p.role === "host" ? "👑" : "🎮"}
              </div>
              <div className="session-player-info">
                <span className="session-player-name">
                  {p.profile?.username || "Unbekannt"}
                </span>
                {p.role === "host" && (
                  <span className="session-player-host-badge">Host</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
