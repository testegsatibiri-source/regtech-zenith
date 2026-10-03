-- Organization member commercial enforcement.
-- This function is intentionally limited to ACTIVE/INVITED membership count.
-- Role authorization (who may invite/change roles) remains a separate concern.

CREATE OR REPLACE FUNCTION public.can_add_member(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND (
      public.entitlement_limit(_organization_id, 'organization.max_users') IS NULL
      OR (
        SELECT count(*)
        FROM public.organization_members om
        WHERE om.organization_id = _organization_id
          AND om.status IN ('ACTIVE','INVITED')
      ) < public.entitlement_limit(_organization_id, 'organization.max_users')
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_organization_members(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = _organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'ACTIVE'
      AND om.role IN ('OWNER','ADMIN')
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_organization_members(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_organization_members(uuid) TO authenticated;

COMMENT ON FUNCTION public.can_add_member(uuid) IS
'Checks active organization membership and the commercial organization.max_users entitlement. Does not authorize the caller to invite; use can_manage_organization_members separately.';

COMMENT ON FUNCTION public.can_manage_organization_members(uuid) IS
'Checks organization-level role authority for membership administration. Platform roles are intentionally not consulted.';