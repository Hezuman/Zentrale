// =============================================================================
// ZENTRALE – Gaming Type Definitions
// =============================================================================

export type GameSessionStatus = "lobby" | "running" | "finished" | "cancelled";
export type SessionParticipantRole = "host" | "player";
export type MentosTxType =
  | "session_stake"
  | "session_payout"
  | "session_refund"
  | "admin_correction"
  | "manual";

export interface GameType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GameSession {
  id: string;
  game_type_id: string;
  created_by: string;
  status: GameSessionStatus;
  name: string | null;
  max_players: number | null;
  target_score: number | null;
  mentos_stake: number;
  settings: Record<string, unknown>;
  winner_id: string | null;
  winner_summary: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  // joined fields
  game_type?: GameType;
  creator_profile?: { username: string; role: string };
  participants?: SessionParticipant[];
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  role: SessionParticipantRole;
  score: number;
  score_multiplier: number;
  is_active: boolean;
  joined_at: string;
  // joined
  profile?: { username: string; role: string };
}

export interface SessionScoreLog {
  id: string;
  session_id: string;
  user_id: string;
  points: number;
  reason: string | null;
  created_at: string;
}

export interface UserGamingStats {
  user_id: string;
  total_sessions: number;
  total_wins: number;
  total_score: number;
  total_mentos_won: number;
  total_mentos_lost: number;
  updated_at: string;
}

export interface MentosBalance {
  user_id: string;
  balance: number;
  updated_at: string;
}

export interface MentosTransaction {
  id: string;
  user_id: string;
  session_id: string | null;
  tx_type: MentosTxType;
  amount: number;
  balance_after: number;
  note: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// UI / Form helpers
// ---------------------------------------------------------------------------

export const SESSION_STATUS_LABELS: Record<GameSessionStatus, string> = {
  lobby: "Lobby",
  running: "Läuft",
  finished: "Beendet",
  cancelled: "Abgebrochen",
};

export const SESSION_STATUS_COLORS: Record<GameSessionStatus, string> = {
  lobby: "#eab308",
  running: "#22c55e",
  finished: "#6b7280",
  cancelled: "#ef4444",
};

export interface CreateSessionParams {
  game_type_id: string;
  name?: string;
  max_players?: number;
  target_score?: number;
  mentos_stake?: number;
  settings?: Record<string, unknown>;
}
