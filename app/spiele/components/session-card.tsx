import Link from "next/link";
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from "@/lib/gaming-types";
import type { GameSessionStatus } from "@/lib/gaming-types";

export function SessionCard({
  session,
  currentUserId,
}: {
  session: any;
  currentUserId: string;
}) {
  const status: GameSessionStatus = session.status;
  const gameType = session.game_type;
  const participants = session.participants || [];
  const isParticipant = participants.some(
    (p: any) => p.user_id === currentUserId
  );
  const hostParticipant = participants.find((p: any) => p.role === "host");
  const hostName = hostParticipant?.profile?.username || "Unbekannt";
  const playerCount = participants.filter((p: any) => p.is_active).length;

  return (
    <Link href={`/spiele/${session.id}`} className="spiele-session-card">
      <div className="spiele-session-card-top">
        <span className="spiele-session-type-icon">
          {gameType?.icon || "🎮"}
        </span>
        <span
          className="spiele-session-status"
          style={{
            color: SESSION_STATUS_COLORS[status],
            borderColor: SESSION_STATUS_COLORS[status],
          }}
        >
          {SESSION_STATUS_LABELS[status]}
        </span>
      </div>
      <h4 className="spiele-session-name">
        {session.name || gameType?.name || "Spielsession"}
      </h4>
      <div className="spiele-session-meta">
        <span>Host: {hostName}</span>
        <span>
          {playerCount}
          {session.max_players ? `/${session.max_players}` : ""} Spieler
        </span>
      </div>
      {session.mentos_stake > 0 && (
        <div className="spiele-session-stake">
          🪙 {session.mentos_stake} Mentos
        </div>
      )}
      {session.target_score && (
        <div className="spiele-session-target">
          🎯 Ziel: {session.target_score} Punkte
        </div>
      )}
      {isParticipant && (
        <span className="spiele-session-badge-joined">Beigetreten</span>
      )}
    </Link>
  );
}
