-- =============================================================================
-- ZENTRALE – Close Friends Policies, Guest Access & Seed Invite Codes
-- =============================================================================
-- Requires 004 to be committed first (close_friends enum value).
-- 1. Updates RLS policies to include close_friends
-- 2. Enables public read-only access for guest mode on raised beds/zones
-- 3. Seeds 5 invite codes per role for testing
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Update RLS policies for raised_bed_zones to include close_friends
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin family friends can insert zones" ON public.raised_bed_zones;
CREATE POLICY "Account roles can insert zones"
  ON public.raised_bed_zones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'family', 'close_friends', 'friends')
    )
  );

DROP POLICY IF EXISTS "Admin family friends can update zones" ON public.raised_bed_zones;
CREATE POLICY "Account roles can update zones"
  ON public.raised_bed_zones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'family', 'close_friends', 'friends')
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Allow public (unauthenticated) read access for guest mode
-- ---------------------------------------------------------------------------
-- Guests can view raised beds without logging in
CREATE POLICY "Public can read raised beds"
  ON public.raised_beds
  FOR SELECT
  USING (true);

-- Guests can view raised bed zones without logging in
CREATE POLICY "Public can read raised bed zones"
  ON public.raised_bed_zones
  FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- 3. Seed 5 unused invite codes per role for testing
-- ---------------------------------------------------------------------------
INSERT INTO public.invite_codes (code, role) VALUES
  ('ADM-7K2X-9P4Q', 'admin'),
  ('ADM-3M8N-6R1W', 'admin'),
  ('ADM-5J4L-8T2V', 'admin'),
  ('ADM-1H6F-4Y9S', 'admin'),
  ('ADM-9D3G-7U5E', 'admin'),
  ('FAM-2A8B-5C1D', 'family'),
  ('FAM-6E3F-9G7H', 'family'),
  ('FAM-4I1J-2K8L', 'family'),
  ('FAM-7M5N-3P6Q', 'family'),
  ('FAM-1R9S-4T2U', 'family'),
  ('CFR-8V3W-5X1Y', 'close_friends'),
  ('CFR-2Z7A-6B4C', 'close_friends'),
  ('CFR-9D5E-1F3G', 'close_friends'),
  ('CFR-4H8I-7J2K', 'close_friends'),
  ('CFR-6L1M-3N9P', 'close_friends'),
  ('FRD-5Q2R-8S4T', 'friends'),
  ('FRD-3U7V-1W6X', 'friends'),
  ('FRD-9Y4Z-2A5B', 'friends'),
  ('FRD-1C8D-6E3F', 'friends'),
  ('FRD-7G2H-4I9J', 'friends');
