
-- =========================================================
-- 1. Roles
-- =========================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'country_cto';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_operator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_auditor';
