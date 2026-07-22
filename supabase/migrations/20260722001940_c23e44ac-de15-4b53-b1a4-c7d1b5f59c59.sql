
-- Restrict SELECT on platform config tables to platform staff only
DROP POLICY IF EXISTS "authenticated read signing keys" ON public.pack_signing_keys;
CREATE POLICY "platform staff read signing keys" ON public.pack_signing_keys
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor());

DROP POLICY IF EXISTS "authenticated can read role_capabilities" ON public.role_capabilities;
CREATE POLICY "platform staff read role_capabilities" ON public.role_capabilities
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor());

DROP POLICY IF EXISTS "authenticated read trust_policies" ON public.trust_policies;
CREATE POLICY "platform staff read trust_policies" ON public.trust_policies
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_platform_operator() OR public.is_platform_auditor());

-- Revoke anonymous EXECUTE on SECURITY DEFINER helpers; they are only used by
-- authenticated RLS paths and server-side code, never by anon callers.
REVOKE EXECUTE ON FUNCTION public.has_capability(uuid, text, text) FROM PUBLIC, anon;
