-- =============================================================================
-- ZENTRALE – Initial Database Migration
-- =============================================================================
-- This migration sets up the foundational schema for the ZENTRALE application:
--   1. profiles table (linked to auth.users)
--   2. invite_codes table (role-based invite system)
--   3. Row Level Security (RLS) policies
--   4. Indexes, constraints, triggers
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create custom types
-- ---------------------------------------------------------------------------
CREATE TYPE public.user_role AS ENUM ('admin', 'family', 'friends');

-- ---------------------------------------------------------------------------
-- 2. Create profiles table
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT NOT NULL UNIQUE,
  role       public.user_role NOT NULL DEFAULT 'friends',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase auth. Created during invite-code registration.';

-- ---------------------------------------------------------------------------
-- 3. Create invite_codes table
-- ---------------------------------------------------------------------------
CREATE TABLE public.invite_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT NOT NULL UNIQUE,
  role       public.user_role NOT NULL DEFAULT 'friends',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  used_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invite_codes IS 'Invite codes that grant registration access and assign roles.';

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_profiles_username ON public.profiles (username);
CREATE INDEX idx_profiles_role ON public.profiles (role);
CREATE INDEX idx_invite_codes_code ON public.invite_codes (code);
CREATE INDEX idx_invite_codes_is_active ON public.invite_codes (is_active) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 5. updated_at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Row Level Security – profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (but NOT role – enforced by column check below)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Service role / trigger can insert profiles during registration
CREATE POLICY "Service can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 7. Row Level Security – invite_codes
-- ---------------------------------------------------------------------------
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- No public read access to invite codes (validation happens via server-side function)
-- Only authenticated admins can view invite codes
CREATE POLICY "Admins can read invite codes"
  ON public.invite_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Only admins can insert invite codes
CREATE POLICY "Admins can insert invite codes"
  ON public.invite_codes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Only admins can update invite codes
CREATE POLICY "Admins can update invite codes"
  ON public.invite_codes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 8. Server-side function: validate invite code (callable by anon/authenticated)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_invite_code(invite_code TEXT)
RETURNS TABLE(code_id UUID, assigned_role public.user_role) AS $$
BEGIN
  RETURN QUERY
    SELECT ic.id, ic.role
    FROM public.invite_codes ic
    WHERE ic.code = invite_code
      AND ic.is_active = true
      AND ic.used_by IS NULL
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 9. Server-side function: consume invite code after registration
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_invite_code(code_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.invite_codes
  SET is_active = false,
      used_by = user_id,
      used_at = now()
  WHERE id = code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 10. Server-side function: create profile after registration
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_profile(
  user_id UUID,
  user_name TEXT,
  user_role public.user_role
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (user_id, user_name, user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 11. Seed initial invite codes (one per role for first setup)
-- ---------------------------------------------------------------------------
-- IMPORTANT: Change these codes before going to production!
INSERT INTO public.invite_codes (code, role) VALUES
  ('ZENTRALE-ADMIN-2026', 'admin'),
  ('ZENTRALE-FAMILY-2026', 'family'),
  ('ZENTRALE-FRIENDS-2026', 'friends');
