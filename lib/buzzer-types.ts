// =============================================================================
// ZENTRALE – Buzzer Game Type Definitions
// =============================================================================

export type BuzzerRoundState = "open" | "queue_locked" | "answering" | "resolved";

export interface BuzzerRound {
  id: string;
  session_id: string;
  round_number: number;
  state: BuzzerRoundState;
  active_responder_id: string | null;
  first_buzz_at: string | null;
  queue_locked_at: string | null;
  started_at: string;
  resolved_at: string | null;
}

export interface BuzzerQueueEntry {
  id: string;
  round_id: string;
  user_id: string;
  position: number;
  is_correct: boolean | null;
  created_at: string;
  // joined
  profile?: { username: string; role: string };
}

export const BUZZER_ROUND_STATE_LABELS: Record<BuzzerRoundState, string> = {
  open: "Offen",
  queue_locked: "Warteschlange gesperrt",
  answering: "Antwortphase",
  resolved: "Abgeschlossen",
};

export const BUZZER_ROUND_STATE_COLORS: Record<BuzzerRoundState, string> = {
  open: "#22c55e",
  queue_locked: "#eab308",
  answering: "#3b82f6",
  resolved: "#6b7280",
};

/** Queue window duration in milliseconds after first buzz */
export const BUZZER_QUEUE_WINDOW_MS = 2000;
