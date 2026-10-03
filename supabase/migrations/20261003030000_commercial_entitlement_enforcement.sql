-- Server-side commercial entitlement enforcement primitives.
CREATE OR REPLACE FUNCTION public.has_active_organization_membership(_organization_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id=_organization_id AND om.user_id=_user_id AND om.status='ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_active_entitlement(_organization_id uuid, _key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT oe.value FROM public.organization_entitlements oe
  WHERE oe.organization_id=_organization_id
    AND oe.entitlement_key=_key
    AND oe.status='ACTIVE'
    AND oe.valid_from <= now()
    AND (oe.valid_until IS NULL OR oe.valid_until > now())
  ORDER BY oe.updated_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_active_entitlement(_organization_id uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE((public.get_active_entitlement(_organization_id,_key)->>'enabled')::boolean,false);
$$;

CREATE OR REPLACE FUNCTION public.entitlement_limit(_organization_id uuid, _key text)
RETURNS bigint LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT CASE
    WHEN (public.get_active_entitlement(_organization_id,_key)->>'limit') ~ '^[0-9]+$'
    THEN (public.get_active_entitlement(_organization_id,_key)->>'limit')::bigint
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.can_add_company(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
     AND (
       public.entitlement_limit(_organization_id,'organization.max_companies') IS NULL
       OR (
         SELECT count(*) FROM public.organization_companies oc
         WHERE oc.organization_id=_organization_id AND oc.status='ACTIVE'
       ) < public.entitlement_limit(_organization_id,'organization.max_companies')
     );
$$;

CREATE OR REPLACE FUNCTION public.can_add_member(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
     AND (
       public.entitlement_limit(_organization_id,'organization.max_users') IS NULL
       OR (
         SELECT count(*) FROM public.organization_members om
         WHERE om.organization_id=_organization_id AND om.status IN ('ACTIVE','INVITED')
       ) < public.entitlement_limit(_organization_id,'organization.max_users')
     );
$$;

CREATE OR REPLACE FUNCTION public.can_add_employee(_organization_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND EXISTS (
      SELECT 1 FROM public.organization_companies oc
      WHERE oc.organization_id=_organization_id AND oc.company_id=_company_id AND oc.status='ACTIVE'
    )
    AND (
      public.entitlement_limit(_organization_id,'company.max_employees') IS NULL
      OR (SELECT count(*) FROM public.employees e WHERE e.company_id=_company_id)
         < public.entitlement_limit(_organization_id,'company.max_employees')
    );
$$;

CREATE OR REPLACE FUNCTION public.can_add_equipment(_organization_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND EXISTS (
      SELECT 1 FROM public.organization_companies oc
      WHERE oc.organization_id=_organization_id AND oc.company_id=_company_id AND oc.status='ACTIVE'
    )
    AND (
      public.entitlement_limit(_organization_id,'company.max_equipment') IS NULL
      OR (SELECT count(*) FROM public.equipment e WHERE e.company_id=_company_id AND e.status <> 'RETIRED')
         < public.entitlement_limit(_organization_id,'company.max_equipment')
    );
$$;

CREATE OR REPLACE FUNCTION public.can_enable_iot(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.has_active_entitlement(_organization_id,'equipment.iot');
$$;

CREATE OR REPLACE FUNCTION public.can_create_government_integration(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.has_active_entitlement(_organization_id,'integrations.government_api');
$$;

CREATE OR REPLACE FUNCTION public.can_create_partner_api(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.has_active_entitlement(_organization_id,'integrations.api');
$$;

REVOKE ALL ON FUNCTION public.has_active_organization_membership(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_active_entitlement(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.has_active_entitlement(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.entitlement_limit(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.can_add_company(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.can_add_member(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.can_add_employee(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.can_add_equipment(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.can_enable_iot(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.can_create_government_integration(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.can_create_partner_api(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_organization_membership(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_entitlement(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_entitlement(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.entitlement_limit(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_employee(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_equipment(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_enable_iot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_government_integration(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_partner_api(uuid) TO authenticated;
