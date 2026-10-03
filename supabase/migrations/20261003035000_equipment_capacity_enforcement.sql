-- Equipment commercial enforcement primitive.
-- Keeps the legacy owns_company RLS bridge intact; this function is the new
-- organization/entitlement boundary used by server-side operations.

CREATE OR REPLACE FUNCTION public.can_add_equipment(_organization_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.organization_companies oc
      WHERE oc.organization_id = _organization_id
        AND oc.company_id = _company_id
        AND oc.status = 'ACTIVE'
    )
    AND (
      public.entitlement_limit(_organization_id, 'company.max_equipment') IS NULL
      OR (
        SELECT count(*)
        FROM public.equipment e
        WHERE e.company_id = _company_id
          AND e.status <> 'RETIRED'
      ) < public.entitlement_limit(_organization_id, 'company.max_equipment')
    );
$$;

REVOKE ALL ON FUNCTION public.can_add_equipment(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_equipment(uuid,uuid) TO authenticated;

COMMENT ON FUNCTION public.can_add_equipment(uuid,uuid) IS
'Checks organization membership, company relationship and company.max_equipment. Legacy equipment RLS remains unchanged during tenancy migration.';