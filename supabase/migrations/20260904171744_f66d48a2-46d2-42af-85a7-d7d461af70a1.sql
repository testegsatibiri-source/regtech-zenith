CREATE TABLE public.data_protection_officers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  jurisdiction text NOT NULL DEFAULT 'ID',
  appointed_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, jurisdiction)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_protection_officers TO authenticated;
GRANT ALL ON public.data_protection_officers TO service_role;
ALTER TABLE public.data_protection_officers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage data protection officers" ON public.data_protection_officers
  FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));
CREATE TRIGGER update_data_protection_officers_updated_at BEFORE UPDATE ON public.data_protection_officers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.privacy_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  detected_at timestamptz NOT NULL DEFAULT now(),
  notification_deadline timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  affected_count integer NOT NULL DEFAULT 0,
  authority_notified_at timestamptz,
  subjects_notified_at timestamptz,
  containment text,
  root_cause text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.privacy_incidents TO authenticated;
GRANT ALL ON public.privacy_incidents TO service_role;
ALTER TABLE public.privacy_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage privacy incidents" ON public.privacy_incidents
  FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));
CREATE INDEX idx_privacy_incidents_company ON public.privacy_incidents(company_id, detected_at DESC);
CREATE TRIGGER update_privacy_incidents_updated_at BEFORE UPDATE ON public.privacy_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_privacy_incident_deadline()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.notification_deadline := NEW.detected_at + interval '72 hours';
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_privacy_incident_deadline_trg BEFORE INSERT OR UPDATE OF detected_at ON public.privacy_incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_privacy_incident_deadline();

CREATE TABLE public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  request_type text NOT NULL,
  requester_name text,
  requester_email text,
  status text NOT NULL DEFAULT 'received',
  received_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL DEFAULT (now() + interval '3 days'),
  resolved_at timestamptz,
  resolution text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_subject_requests TO authenticated;
GRANT ALL ON public.data_subject_requests TO service_role;
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage data subject requests" ON public.data_subject_requests
  FOR ALL TO authenticated
  USING (public.owns_company(company_id)) WITH CHECK (public.owns_company(company_id));
CREATE INDEX idx_data_subject_requests_company ON public.data_subject_requests(company_id, received_at DESC);
CREATE TRIGGER update_data_subject_requests_updated_at BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();