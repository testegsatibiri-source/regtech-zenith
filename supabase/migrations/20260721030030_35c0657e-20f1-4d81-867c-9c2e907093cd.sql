
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_operator() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_auditor() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_country_cto(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_operator() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_auditor() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_country_cto(text) TO authenticated, service_role;
