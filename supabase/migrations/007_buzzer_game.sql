-- =============================================================================
-- ZENTRALE – Buzzer Game Mode Extension
-- =============================================================================
-- Requires 006_gaming.sql to be committed first.
-- Adds buzzer-specific round and queue tables on top of the existing
-- game session architecture.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Buzzer round state enum
-- ---------------------------------------------------------------------------
CREATE TYPE public.buzzer_round_state AS ENUM (
  'open',
  'queue_locked',
  'answering',
  'resolved'
);

-- ---------------------------------------------------------------------------
-- 2. Buzzer rounds table
-- ---------------------------------------------------------------------------
CREATE TABLE public.buzzer_rounds (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  round_number        int NOT NULL,
  state               public.buzzer_round_state NOT NULL DEFAULT 'open',
  active_responder_id uuid REFERENCES auth.users(id),
  first_buzz_at       timestamptz,
  queue_locked_at     timestamptz,
  started_at          timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz,

  CONSTRAINT unique_session_round UNIQUE (session_id, round_number),
  CONSTRAINT positive_round_number CHECK (round_number >= 1)
);

CREATE INDEX idx_buzzer_rounds_session ON public.buzzer_rounds(session_id);
CREATE INDEX idx_buzzer_rounds_state ON public.buzzer_rounds(state);

ALTER TABLE public.buzzer_rounds ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Buzzer queue (one entry per user per round)
-- ---------------------------------------------------------------------------
CREATE TABLE public.buzzer_queue (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    uuid NOT NULL REFERENCES public.buzzer_rounds(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  position    int NOT NULL,
  is_correct  boolean,          -- null = not yet evaluated
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_round_user UNIQUE (round_id, user_id),
  CONSTRAINT unique_round_position UNIQUE (round_id, position),
  CONSTRAINT positive_position CHECK (position >= 1)
);

CREATE INDEX idx_buzzer_queue_round ON public.buzzer_queue(round_id);
CREATE INDEX idx_buzzer_queue_user ON public.buzzer_queue(user_id);

ALTER TABLE public.buzzer_queue ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. RLS Policies
-- ---------------------------------------------------------------------------

-- Buzzer rounds: any authenticated user can read
CREATE POLICY "Authenticated users can read buzzer rounds"
  ON public.buzzer_rounds FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Buzzer rounds: session host or admin can insert
CREATE POLICY "Session host or admin can insert buzzer rounds"
  ON public.buzzer_rounds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = buzzer_rounds.session_id
        AND sp.user_id = auth.uid()
        AND sp.role = 'host'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Buzzer rounds: session host or admin can update
CREATE POLICY "Session host or admin can update buzzer rounds"
  ON public.buzzer_rounds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = buzzer_rounds.session_id
        AND sp.user_id = auth.uid()
        AND sp.role = 'host'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Buzzer queue: any authenticated user can read
CREATE POLICY "Authenticated users can read buzzer queue"
  ON public.buzzer_queue FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Buzzer queue: participants can insert own buzz
CREATE POLICY "Participants can insert own buzz"
  ON public.buzzer_queue FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.buzzer_rounds br
      JOIN public.session_participants sp ON sp.session_id = br.session_id
      WHERE br.id = buzzer_queue.round_id
        AND sp.user_id = auth.uid()
        AND sp.is_active = true
    )
  );

-- Buzzer queue: session host or admin can update (for marking correct/wrong)
CREATE POLICY "Session host or admin can update buzzer queue"
  ON public.buzzer_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.buzzer_rounds br
      JOIN public.session_participants sp ON sp.session_id = br.session_id
      WHERE br.id = buzzer_queue.round_id
        AND sp.user_id = auth.uid()
        AND sp.role = 'host'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
