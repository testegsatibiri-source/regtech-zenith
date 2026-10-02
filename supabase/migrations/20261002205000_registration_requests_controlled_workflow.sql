-- Phase 3: controlled registration requests. Approval/conversion fields are server-only.
CREATE TABLE public.registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  organization_type public.organization_type NOT NULL,
  organization_name text NOT NULL CHECK (length(trim(organization_name)) BETWEEN 2 AND 200),
  legal_name text CHECK (legal_name IS NULL OR length(trim(legal_name)) <= 250),
  tax_id text CHECK (tax_id IS NULL OR length(trim(tax_id)) <= 100),
  country_requested char(2) NOT NULL CHECK (country_requested ~ '^[A-Z]{2}$'),
  country_approved char(2) CHECK (country_approved IS NULL OR country_approved ~ '^[A-Z]{2}$'),
  plan_requested text CHECK (plan_requested IS NULL OR plan_requested ~ '^[a-z][a-z0-9_-]{1,63}$'),
  expected_companies integer NOT NULL DEFAULT 1 CHECK (expected_companies BETWEEN 1 AND 100000),
  expected_users integer NOT NULL DEFAULT 1 CHECK (expected_users BETWEEN 1 AND 100000),
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'CONVERTED')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  decision_reason text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  source_pilot_request_id uuid REFERENCES public.pilot_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (country_approved IS NULL OR status IN ('APPROVED', 'CONVERTED')),
  CHECK (reviewed_at IS NULL OR reviewed_by IS NOT NULL),
  CHECK (status <> 'CONVERTED' OR organization_id IS NOT NULL),
  UNIQUE (source_pilot_request_id)
);
CREATE INDEX registration_requests_applicant_created_idx ON public.registration_requests(applicant_user_id, created_at DESC);
CREATE INDEX registration_requests_status_created_idx ON public.registration_requests(status, created_at DESC);
CREATE INDEX registration_requests_org_idx ON public.registration_requests(organization_id) WHERE organization_id IS NOT NULL;

ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.registration_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.registration_requests TO authenticated;
GRANT INSERT (applicant_user_id, organization_type, organization_name, legal_name, tax_id, country_requested, plan_requested, expected_companies, expected_users, source_pilot_request_id) ON TABLE public.registration_requests TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.registration_requests TO service_role;

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
    AND country_approved IS NULL
    AND organization_id IS NULL
  );

CREATE TRIGGER registration_requests_updated_at
  BEFORE UPDATE ON public.registration_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.registration_requests IS 'Authenticated user registration requests. Status, approval, approved country, and conversion are controlled by trusted server-side workflows.';
COMMENT ON COLUMN public.registration_requests.country_requested IS 'Applicant preference only; does not grant access to a Country Pack.';
COMMENT ON COLUMN public.registration_requests.country_approved IS 'Country approved by the authorized review workflow; not itself a runtime entitlement.';
COMMENT ON COLUMN public.registration_requests.source_pilot_request_id IS 'Optional qualification evidence link; pilot_requests remains a separate intake workflow.';