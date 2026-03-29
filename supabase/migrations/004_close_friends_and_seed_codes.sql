-- =============================================================================
-- ZENTRALE – Add close_friends enum value
-- =============================================================================
-- This migration ONLY adds the new enum value. PostgreSQL requires that
-- ALTER TYPE ... ADD VALUE is committed before the value can be referenced
-- in DML or policy expressions. All usage happens in 005.
-- =============================================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'close_friends' AFTER 'family';
