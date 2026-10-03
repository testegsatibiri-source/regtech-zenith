-- Fail-closed commercial capacity gates.
-- Registration intake already has an established schema in this project; its
-- lifecycle is reconciled separately rather than replaced by this migration.

CREATE OR REPLACE FUNCTION public.can_add_company(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.entitlement_limit(_organization_id,'organization.max_companies') IS NOT NULL
    AND (SELECT count(*) FROM public.organization_companies oc
         WHERE oc.organization_id=_organization_id AND oc.status='ACTIVE')
        < public.entitlement_limit(_organization_id,'organization.max_companies');
$$;

CREATE OR REPLACE FUNCTION public.can_add_member(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.entitlement_limit(_organization_id,'organization.max_users') IS NOT NULL
    AND (SELECT count(*) FROM public.organization_members om
         WHERE om.organization_id=_organization_id AND om.status IN ('ACTIVE','INVITED'))
        < public.entitlement_limit(_organization_id,'organization.max_users');
$$;

CREATE OR REPLACE FUNCTION public.can_add_employee(_organization_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND EXISTS (SELECT 1 FROM public.organization_companies oc
      WHERE oc.organization_id=_organization_id AND oc.company_id=_company_id AND oc.status='ACTIVE')
    AND public.entitlement_limit(_organization_id,'company.max_employees') IS NOT NULL
    AND (SELECT count(*) FROM public.employees e WHERE e.company_id=_company_id
      AND COALESCE(e.status,'ACTIVE') <> 'TERMINATED')
        < public.entitlement_limit(_organization_id,'company.max_employees');
$$;

CREATE OR REPLACE FUNCTION public.can_add_equipment(_organization_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND EXISTS (SELECT 1 FROM public.organization_companies oc
      WHERE oc.organization_id=_organization_id AND oc.company_id=_company_id AND oc.status='ACTIVE')
    AND public.entitlement_limit(_organization_id,'company.max_equipment') IS NOT NULL
    AND (SELECT count(*) FROM public.equipment e WHERE e.company_id=_company_id AND e.status <> 'RETIRED')
        < public.entitlement_limit(_organization_id,'company.max_equipment');
$$;

REVOKE ALL ON FUNCTION public.can_add_company(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_add_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_add_employee(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_add_equipment(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_employee(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_equipment(uuid,uuid) TO authenticated;
