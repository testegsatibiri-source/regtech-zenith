-- The authorization oracle must not be probeable by ordinary sessions:
-- it would let any signed-in user enumerate approved pilot e-mails.
REVOKE EXECUTE ON FUNCTION public.pilot_authorizes_country(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pilot_authorizes_country(text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_authorizes_country(text, text) TO service_role;