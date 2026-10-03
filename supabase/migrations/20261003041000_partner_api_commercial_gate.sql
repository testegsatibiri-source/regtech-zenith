-- Partner API / ERP integration commercial gate.
-- Secret material remains outside PostgreSQL; secret_ref is only a reference.

CREATE OR REPLACE FUNCTION public.can_create_partner_api(
  _organization_id uuid,
  _provider_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.has_active_entitlement(_organization_id, 'features.partner_api')
    AND NULLIF(trim(_provider_key), '') IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.can_create_integration(
  _organization_id uuid,
  _integration_type text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT CASE upper(_integration_type)
    WHEN 'PARTNER_API' THEN public.has_active_organization_membership(_organization_id)
      AND public.has_active_entitlement(_organization_id, 'features.partner_api')
    WHEN 'ERP' THEN public.has_active_organization_membership(_organization_id)
      AND public.has_active_entitlement(_organization_id, 'features.partner_api')
    WHEN 'GOVERNMENT' THEN public.has_active_organization_membership(_organization_id)
      AND public.has_active_entitlement(_organization_id, 'features.government_integrations')
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.can_create_partner_api(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_create_integration(uuid,text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.can_create_partner_api(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_integration(uuid,text) TO authenticated;

COMMENT ON FUNCTION public.can_create_partner_api(uuid,text) IS
'Commercial gate for partner/ERP API connections. Provider credentials are stored externally and referenced by secret_ref.';

COMMENT ON FUNCTION public.can_create_integration(uuid,text) IS
'Generic integration category gate. Government integrations additionally require country/capability validation through can_create_government_integration.';