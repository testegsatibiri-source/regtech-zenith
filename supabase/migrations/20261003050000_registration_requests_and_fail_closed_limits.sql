-- Registration intake and fail-closed commercial capacity checks.
-- Requests do not create organizations, subscriptions, companies or entitlements.
-- Approval/provisioning is a separate privileged workflow.

CREATE TABLE IF NOT EXISTS public.registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_type public.organization_type NOT NULL,
  organization_name text NOT NULL CHECK (length(trim(organization_name)) BETWEEN 2 AND 200),
  organization_legal_name text,
  tax_id text,
  country_requested char(2) NOT NULL CHECK (country_requested ~ '^[A-Z]{2}$'),
  plan_requested text,
  expected_companies integer CHECK (expected_companies IS NULL OR expected_companies > 0),
  expected_users integer CHECK (expected_users IS NULL OR expected_users > 0),
  expected_employees_per_company integer CHECK (expected_employees_per_company IS NULL OR expected_employees_per_company > 0),
  expected_equipment_per_company integer CHECK (expected_equipment_per_company IS NULL OR expected_equipment_per_company >= 0),
  integration_needs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(integration_needs) = 'array'),
  notes text,
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','WITHDRAWN')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  decision_reason text,
  provisioned_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status NOT IN ('APPROVED','REJECTED')) OR reviewed_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS registration_requests_applicant_idx
  ON public.registration_requests(applicant_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS registration_requests_status_idx
  ON public.registration_requests(status, created_at);

ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.registration_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.registration_requests TO authenticated;

CREATE POLICY registration_requests_select_own
  ON public.registration_requests FOR SELECT TO authenticated
  USING (applicant_user_id = (SELECT auth.uid()));

CREATE POLICY registration_requests_insert_own
  ON public.registration_requests FOR INSERT TO authenticated
  WITH CHECK (
    applicant_user_id = (SELECT auth.uid())
    AND status = 'SUBMITTED'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND decision_reason IS NULL
    AND provisioned_organization_id IS NULL
  );

COMMENT ON TABLE public.registration_requests IS
'Commercial onboarding intake only. Does not provision an organization or activate a plan; privileged review is required.';

-- Fail closed: an unset/missing numeric limit is not unlimited.
CREATE OR REPLACE FUNCTION public.can_add_company(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.entitlement_limit(_organization_id,'organization.max_companies') IS NOT NULL
    AND (
      SELECT count(*) FROM public.organization_companies oc
      WHERE oc.organization_id=_organization_id AND oc.status='ACTIVE'
    ) < public.entitlement_limit(_organization_id,'organization.max_companies');
$$;

CREATE OR REPLACE FUNCTION public.can_add_member(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND public.entitlement_limit(_organization_id,'organization.max_users') IS NOT NULL
    AND (
      SELECT count(*) FROM public.organization_members om
      WHERE om.organization_id=_organization_id AND om.status IN ('ACTIVE','INVITED')
    ) < public.entitlement_limit(_organization_id,'organization.max_users');
$$;

CREATE OR REPLACE FUNCTION public.can_add_employee(_organization_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND EXISTS (
      SELECT 1 FROM public.organization_companies oc
      WHERE oc.organization_id=_organization_id AND oc.company_id=_company_id AND oc.status='ACTIVE'
    )
    AND public.entitlement_limit(_organization_id,'company.max_employees') IS NOT NULL
    AND (
      SELECT count(*) FROM public.employees e
      WHERE e.company_id=_company_id AND COALESCE(e.status,'ACTIVE') <> 'TERMINATED'
    ) < public.entitlement_limit(_organization_id,'company.max_employees');
$$;

CREATE OR REPLACE FUNCTION public.can_add_equipment(_organization_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_active_organization_membership(_organization_id)
    AND EXISTS (
      SELECT 1 FROM public.organization_companies oc
      WHERE oc.organization_id=_organization_id AND oc.company_id=_company_id AND oc.status='ACTIVE'
    )
    AND public.entitlement_limit(_organization_id,'company.max_equipment') IS NOT NULL
    AND (
      SELECT count(*) FROM public.equipment e
      WHERE e.company_id=_company_id AND e.status <> 'RETIRED'
    ) < public.entitlement_limit(_organization_id,'company.max_equipment');
$$;

REVOKE ALL ON FUNCTION public.can_add_company(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_add_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_add_employee(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_add_equipment(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_employee(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_equipment(uuid,uuid) TO authenticated;
