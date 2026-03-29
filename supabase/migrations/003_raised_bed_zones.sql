-- =============================================================================
-- ZENTRALE – Raised Bed Zones Migration
-- =============================================================================
-- Adds zone management inside raised beds with overlap/boundary constraints.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create raised_bed_zones table
-- ---------------------------------------------------------------------------
CREATE TABLE public.raised_bed_zones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raised_bed_id  UUID NOT NULL REFERENCES public.raised_beds(id) ON DELETE CASCADE,
  x_cm           INTEGER NOT NULL DEFAULT 0 CHECK (x_cm >= 0),
  y_cm           INTEGER NOT NULL DEFAULT 0 CHECK (y_cm >= 0),
  width_cm       INTEGER NOT NULL CHECK (width_cm > 0),
  height_cm      INTEGER NOT NULL CHECK (height_cm > 0),
  plant_type     TEXT,
  plant_count    INTEGER,
  created_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active      BOOLEAN NOT NULL DEFAULT true,

  -- plant_count must be >= 1 when plant_type is set
  CONSTRAINT chk_plant_count_with_type
    CHECK (
      (plant_type IS NULL AND plant_count IS NULL)
      OR (plant_type IS NOT NULL AND plant_count IS NOT NULL AND plant_count >= 1)
    )
);

COMMENT ON TABLE public.raised_bed_zones IS 'Rectangular zones inside raised beds, optionally assigned a plant type and count.';

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_raised_bed_zones_bed_id ON public.raised_bed_zones (raised_bed_id);
CREATE INDEX idx_raised_bed_zones_created_by ON public.raised_bed_zones (created_by);
CREATE INDEX idx_raised_bed_zones_is_active ON public.raised_bed_zones (is_active) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 3. updated_at trigger (reuses existing handle_updated_at function)
-- ---------------------------------------------------------------------------
CREATE TRIGGER on_raised_bed_zones_updated
  BEFORE UPDATE ON public.raised_bed_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Constraint function: zone must stay inside raised bed boundaries
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_zone_within_bed()
RETURNS TRIGGER AS $$
DECLARE
  bed_width  INTEGER;
  bed_height INTEGER;
BEGIN
  SELECT width_cm, height_cm INTO bed_width, bed_height
  FROM public.raised_beds
  WHERE id = NEW.raised_bed_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Raised bed not found';
  END IF;

  IF NEW.x_cm + NEW.width_cm > bed_width
     OR NEW.y_cm + NEW.height_cm > bed_height THEN
    RAISE EXCEPTION 'Zone exceeds raised bed boundaries (bed: %x%, zone end: %x%)',
      bed_width, bed_height,
      NEW.x_cm + NEW.width_cm, NEW.y_cm + NEW.height_cm;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_zone_within_bed
  BEFORE INSERT OR UPDATE ON public.raised_bed_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.check_zone_within_bed();

-- ---------------------------------------------------------------------------
-- 5. Constraint function: active zones must not overlap within the same bed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_zone_no_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.raised_bed_zones z
    WHERE z.raised_bed_id = NEW.raised_bed_id
      AND z.is_active = true
      AND z.id IS DISTINCT FROM NEW.id
      -- Rectangle overlap: NOT (left >= right OR right <= left OR top >= bottom OR bottom <= top)
      AND NEW.x_cm < z.x_cm + z.width_cm
      AND NEW.x_cm + NEW.width_cm > z.x_cm
      AND NEW.y_cm < z.y_cm + z.height_cm
      AND NEW.y_cm + NEW.height_cm > z.y_cm
  ) THEN
    RAISE EXCEPTION 'Zone overlaps with an existing active zone in this raised bed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_zone_no_overlap
  BEFORE INSERT OR UPDATE ON public.raised_bed_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.check_zone_no_overlap();

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.raised_bed_zones ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read zones
CREATE POLICY "Authenticated users can read zones"
  ON public.raised_bed_zones
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admin, family, and friends can insert zones
CREATE POLICY "Admin family friends can insert zones"
  ON public.raised_bed_zones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'family', 'friends')
    )
  );

-- Admin, family, and friends can update zones
CREATE POLICY "Admin family friends can update zones"
  ON public.raised_bed_zones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'family', 'friends')
    )
  );

-- Only admins can delete zones
CREATE POLICY "Admins can delete zones"
  ON public.raised_bed_zones
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
