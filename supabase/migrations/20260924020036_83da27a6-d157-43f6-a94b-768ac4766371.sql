ALTER TABLE public.pilot_requests
  ADD COLUMN IF NOT EXISTS workforce_all_ncr boolean,
  ADD COLUMN IF NOT EXISTS has_overtime boolean;

COMMENT ON COLUMN public.pilot_requests.workforce_all_ncr IS 'PH pilot eligibility screening: are all employees in the NCR region? NULL for non-PH landings.';
COMMENT ON COLUMN public.pilot_requests.has_overtime IS 'PH pilot eligibility screening: does the payroll include overtime? NULL for non-PH landings.';