-- =============================================================================
-- ZENTRALE – Gaming Foundation: Sessions, Participants, Scores, Mentos Coins
-- =============================================================================
-- Requires 005 to be committed first.
-- 1. Game types reference table
-- 2. Game sessions (status-based lifecycle)
-- 3. Session participants
-- 4. Session scores / results
-- 5. User gaming stats (materialized foundation)
-- 6. Mentos Coin balances & transaction history
-- 7. RLS policies
-- 8. Seed data: first game type (Buzzer)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Game session status enum
-- ---------------------------------------------------------------------------
CREATE TYPE public.game_session_status AS ENUM ('lobby', 'running', 'finished', 'cancelled');

-- ---------------------------------------------------------------------------
-- 2. Game session participant role enum
-- ---------------------------------------------------------------------------
CREATE TYPE public.session_participant_role AS ENUM ('host', 'player');

-- ---------------------------------------------------------------------------
-- 3. Mentos Coin transaction type enum
-- ---------------------------------------------------------------------------
CREATE TYPE public.mentos_tx_type AS ENUM (
  'session_stake',
  'session_payout',
  'session_refund',
  'admin_correction',
  'manual'
);

-- ---------------------------------------------------------------------------
-- 4. Game types
-- ---------------------------------------------------------------------------
CREATE TABLE public.game_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text UNIQUE NOT NULL,
  name       text NOT NULL,
  description text,
  icon       text,          -- emoji or icon identifier
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_types ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. Game sessions
-- ---------------------------------------------------------------------------
CREATE TABLE public.game_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type_id    uuid NOT NULL REFERENCES public.game_types(id),
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  status          public.game_session_status NOT NULL DEFAULT 'lobby',
  name            text,
  max_players     int,
  target_score    int,
  mentos_stake    int NOT NULL DEFAULT 0,        -- 0 = no wager
  settings        jsonb NOT NULL DEFAULT '{}',   -- game-type-specific config
  winner_id       uuid REFERENCES auth.users(id),
  winner_summary  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  finished_at     timestamptz,

  CONSTRAINT positive_max_players CHECK (max_players IS NULL OR max_players >= 2),
  CONSTRAINT non_negative_target   CHECK (target_score IS NULL OR target_score > 0),
  CONSTRAINT non_negative_stake    CHECK (mentos_stake >= 0)
);

CREATE INDEX idx_game_sessions_status ON public.game_sessions(status);
CREATE INDEX idx_game_sessions_game_type ON public.game_sessions(game_type_id);
CREATE INDEX idx_game_sessions_created_by ON public.game_sessions(created_by);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6. Session participants
-- ---------------------------------------------------------------------------
CREATE TABLE public.session_participants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id),
  role             public.session_participant_role NOT NULL DEFAULT 'player',
  score            int NOT NULL DEFAULT 0,
  score_multiplier numeric(4,2) NOT NULL DEFAULT 1.00,
  is_active        boolean NOT NULL DEFAULT true,
  joined_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_session_user UNIQUE (session_id, user_id),
  CONSTRAINT positive_multiplier CHECK (score_multiplier > 0)
);

CREATE INDEX idx_session_participants_session ON public.session_participants(session_id);
CREATE INDEX idx_session_participants_user ON public.session_participants(user_id);

ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 7. Session score log (per-action score entries, optional detail)
-- ---------------------------------------------------------------------------
CREATE TABLE public.session_score_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id),
  points         int NOT NULL,
  reason         text,          -- e.g. 'correct_answer', 'bonus'
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_score_log_session ON public.session_score_log(session_id);
CREATE INDEX idx_score_log_user ON public.session_score_log(user_id);

ALTER TABLE public.session_score_log ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 8. User gaming stats (denormalised for fast reads)
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_gaming_stats (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id),
  total_sessions       int NOT NULL DEFAULT 0,
  total_wins           int NOT NULL DEFAULT 0,
  total_score          bigint NOT NULL DEFAULT 0,
  total_mentos_won     bigint NOT NULL DEFAULT 0,
  total_mentos_lost    bigint NOT NULL DEFAULT 0,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_gaming_stats ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 9. Mentos Coin balances
-- ---------------------------------------------------------------------------
CREATE TABLE public.mentos_balances (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id),
  balance    bigint NOT NULL DEFAULT 0,   -- negative allowed
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentos_balances ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 10. Mentos Coin transaction history
-- ---------------------------------------------------------------------------
CREATE TABLE public.mentos_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  session_id  uuid REFERENCES public.game_sessions(id),
  tx_type     public.mentos_tx_type NOT NULL,
  amount      bigint NOT NULL,               -- positive = credit, negative = debit
  balance_after bigint NOT NULL,             -- snapshot after this tx
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentos_tx_user ON public.mentos_transactions(user_id);
CREATE INDEX idx_mentos_tx_session ON public.mentos_transactions(session_id);

ALTER TABLE public.mentos_transactions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 11. RLS Policies
-- ---------------------------------------------------------------------------

-- Game types: anyone authenticated can read
CREATE POLICY "Authenticated users can read game types"
  ON public.game_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Game sessions: any authenticated user can read all sessions
CREATE POLICY "Authenticated users can read game sessions"
  ON public.game_sessions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Game sessions: account roles (friends+) can create sessions
CREATE POLICY "Account roles can create game sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'family', 'close_friends', 'friends')
    )
  );

-- Game sessions: creator or admin can update their sessions
CREATE POLICY "Session creator or admin can update game sessions"
  ON public.game_sessions FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Session participants: authenticated can read
CREATE POLICY "Authenticated users can read session participants"
  ON public.session_participants FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Session participants: account roles can join (insert themselves)
CREATE POLICY "Account roles can join sessions"
  ON public.session_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'family', 'close_friends', 'friends')
    )
  );

-- Session participants: own record or admin can update
CREATE POLICY "Own participant or admin can update"
  ON public.session_participants FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Score log: authenticated can read
CREATE POLICY "Authenticated users can read score log"
  ON public.session_score_log FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Score log: session host or admin can insert
CREATE POLICY "Session host or admin can insert score log"
  ON public.session_score_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = session_score_log.session_id
        AND sp.user_id = auth.uid()
        AND sp.role = 'host'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- User gaming stats: authenticated can read all, own row can update
CREATE POLICY "Authenticated users can read gaming stats"
  ON public.user_gaming_stats FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own gaming stats"
  ON public.user_gaming_stats FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own gaming stats"
  ON public.user_gaming_stats FOR UPDATE
  USING (user_id = auth.uid());

-- Mentos balances: authenticated can read all, own row writable
CREATE POLICY "Authenticated users can read mentos balances"
  ON public.mentos_balances FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own mentos balance"
  ON public.mentos_balances FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own mentos balance"
  ON public.mentos_balances FOR UPDATE
  USING (user_id = auth.uid());

-- Mentos transactions: users can read own, insert own
CREATE POLICY "Users can read own mentos transactions"
  ON public.mentos_transactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own mentos transactions"
  ON public.mentos_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 12. Auto-updated_at trigger for relevant tables
-- ---------------------------------------------------------------------------
-- Reuse the existing handle_updated_at() function from 001_init:

CREATE TRIGGER set_updated_at_mentos_balances
  BEFORE UPDATE ON public.mentos_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_user_gaming_stats
  BEFORE UPDATE ON public.user_gaming_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 13. Seed: First game type – Buzzer / Quiz
-- ---------------------------------------------------------------------------
INSERT INTO public.game_types (slug, name, description, icon) VALUES
  ('buzzer', 'Buzzer / Quiz', 'Schnelles Quiz-Spiel mit Buzzer-Mechanik. Punkte sammeln durch richtiges Antworten.', '🔔');
