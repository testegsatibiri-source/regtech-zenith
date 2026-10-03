-- Normalize feature entitlement keys across all commercial gates.
-- Draft plan catalogue uses features.* keys; all integration gates must match.

CREATE OR REPLACE FUNCTION public.can_create_government_integration(
  _organization_id uuid,
  _country_code text,
  _capability_key text
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.has_active_entitlement(_organization_id, 'features.government_integrations')
    AND public.has_published_country_capability(_country_code, _capability_key);
$$;

CREATE OR REPLACE FUNCTION public.can_create_partner_api(_organization_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.has_active_entitlement(_organization_id, 'features.partner_api');
$$;

CREATE OR REPLACE FUNCTION public.can_create_partner_api(
  _organization_id uuid,
  _provider_key text
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.has_active_entitlement(_organization_id, 'features.partner_api')
    AND NULLIF(trim(_provider_key), '') IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.can_create_government_integration(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_create_partner_api(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_create_partner_api(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_government_integration(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_partner_api(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_partner_api(uuid,text) TO authenticated;