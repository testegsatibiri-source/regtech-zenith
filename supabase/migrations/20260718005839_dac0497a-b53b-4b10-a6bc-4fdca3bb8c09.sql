
REVOKE EXECUTE ON FUNCTION public.is_auditor() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_api_quota(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_company(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role must stay callable by authenticated because policies elsewhere may use it directly.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
