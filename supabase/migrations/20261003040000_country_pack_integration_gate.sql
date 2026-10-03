-- Country Pack capability gate for government integrations.
-- Commercial entitlement alone is insufficient: the requested country pack must
-- be published and explicitly advertise the capability in manifest.capabilities.

CREATE OR REPLACE FUNCTION public.has_published_country_capability(
  _country_code text,
  _capability_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pack_registry pr
    WHERE upper(pr.country_code) = upper(_country_code)
      AND pr.state = 'published'
      AND COALESCE(pr.manifest->'capabilities'->>_capability_key, 'false') = 'true'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_enable_iot(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.has_active_entitlement(_organization_id, 'equipment.iot');
$$;

CREATE OR REPLACE FUNCTION public.can_create_government_integration(
  _organization_id uuid,
  _country_code text,
  _capability_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.has_active_entitlement(_organization_id, 'integrations.government_api')
    AND public.has_published_country_capability(_country_code, _capability_key);
$$;

CREATE OR REPLACE FUNCTION public.can_create_partner_api(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.has_active_entitlement(_organization_id, 'integrations.api');
$$;

REVOKE ALL ON FUNCTION public.has_published_country_capability(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_enable_iot(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_create_government_integration(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_create_partner_api(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_published_country_capability(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_enable_iot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_government_integration(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_partner_api(uuid) TO authenticated;

COMMENT ON FUNCTION public.has_published_country_capability(text,text) IS
'Country Pack gate: only published packs whose manifest.capabilities contains the requested key set to true can authorize a government integration.';

COMMENT ON FUNCTION public.can_create_government_integration(uuid,text,text) IS
'Government integration requires both commercial entitlement and a published Country Pack capability for the requested jurisdiction.';