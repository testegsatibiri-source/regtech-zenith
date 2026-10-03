-- Employee capacity enforcement.
-- Employees are operational company records, not organization login users.

CREATE OR REPLACE FUNCTION public.can_add_employee(_organization_id uuid, _company_id uuid)
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
      public.entitlement_limit(_organization_id, 'company.max_employees') IS NULL
      OR (
        SELECT count(*)
        FROM public.employees e
        WHERE e.company_id = _company_id
          AND COALESCE(e.status, 'ACTIVE') <> 'TERMINATED'
      ) < public.entitlement_limit(_organization_id, 'company.max_employees')
    );
$$;

REVOKE ALL ON FUNCTION public.can_add_employee(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_employee(uuid,uuid) TO authenticated;

COMMENT ON FUNCTION public.can_add_employee(uuid,uuid) IS
'Checks organization membership, company relationship and company.max_employees. Employee records are distinct from organization members.';