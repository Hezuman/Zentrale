-- =============================================================================
-- ZENTRALE – Hochbeete (Raised Beds) Migration
-- =============================================================================
-- Adds the raised beds table with RLS policies following existing conventions.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create raised_beds table
-- ---------------------------------------------------------------------------
CREATE TABLE public.raised_beds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  width_cm    INTEGER NOT NULL CHECK (width_cm > 0),
  height_cm   INTEGER NOT NULL CHECK (height_cm > 0),
  description TEXT,
  position_x  INTEGER NOT NULL DEFAULT 0,
  position_y  INTEGER NOT NULL DEFAULT 0,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active   BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE public.raised_beds IS 'Raised garden beds (Hochbeete) managed within ZENTRALE.';

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_raised_beds_created_by ON public.raised_beds (created_by);
CREATE INDEX idx_raised_beds_is_active ON public.raised_beds (is_active) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 3. updated_at trigger (reuses existing handle_updated_at function)
-- ---------------------------------------------------------------------------
CREATE TRIGGER on_raised_beds_updated
  BEFORE UPDATE ON public.raised_beds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.raised_beds ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read raised beds
CREATE POLICY "Authenticated users can read raised beds"
  ON public.raised_beds
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can insert raised beds
CREATE POLICY "Admins can insert raised beds"
  ON public.raised_beds
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Only admins can update raised beds
CREATE POLICY "Admins can update raised beds"
  ON public.raised_beds
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Only admins can delete raised beds
CREATE POLICY "Admins can delete raised beds"
  ON public.raised_beds
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
