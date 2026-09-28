-- Pilot lifecycle: formal status enum + authorization fields.
CREATE TYPE public.pilot_request_status AS ENUM (
  'new','qualified','approved','converted','rejected'
);

CREATE TYPE public.pilot_authorized_country AS ENUM ('ID','PH','BOTH');

-- Normalize legacy free-text values before switching the column type.
UPDATE public.pilot_requests
SET status = CASE lower(status)
  WHEN 'new' THEN 'new'
  WHEN 'contacted' THEN 'qualified'
  WHEN 'qualified' THEN 'qualified'
  WHEN 'approved' THEN 'approved'
  WHEN 'converted' THEN 'converted'
  WHEN 'rejected' THEN 'rejected'
  WHEN 'closed' THEN 'rejected'
  ELSE 'new'
END;

ALTER TABLE public.pilot_requests
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.pilot_requests
  ALTER COLUMN status TYPE public.pilot_request_status
  USING status::public.pilot_request_status;

ALTER TABLE public.pilot_requests
  ALTER COLUMN status SET DEFAULT 'new'::public.pilot_request_status;

ALTER TABLE public.pilot_requests
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS authorized_country public.pilot_authorized_country,
  ADD COLUMN IF NOT EXISTS pilot_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_reason text,
  ADD COLUMN IF NOT EXISTS converted_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

COMMENT ON COLUMN public.pilot_requests.approved_by IS 'Authenticated platform operator that approved the request; always derived from the session, never from client input.';
COMMENT ON COLUMN public.pilot_requests.authorized_country IS 'Explicit jurisdiction contract: ID, PH or BOTH. Enforced server-side at company creation.';

CREATE INDEX IF NOT EXISTS pilot_requests_email_status_idx
  ON public.pilot_requests (email, status);

-- Authorization oracle used by the server-side gate in createCompany.
-- SECURITY DEFINER because pilot_requests is deny-all under RLS.
CREATE OR REPLACE FUNCTION public.pilot_authorizes_country(_email text, _country text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pilot_requests pr
    WHERE lower(pr.email) = lower(_email)
      AND pr.status IN ('approved'::public.pilot_request_status,
                        'converted'::public.pilot_request_status)
      AND pr.authorized_country IS NOT NULL
      AND (pr.pilot_expires_at IS NULL OR pr.pilot_expires_at > now())
      AND (
        pr.authorized_country = 'BOTH'::public.pilot_authorized_country
        OR pr.authorized_country::text = upper(_country)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.pilot_authorizes_country(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.pilot_authorizes_country(text, text) TO authenticated, service_role;