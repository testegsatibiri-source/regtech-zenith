CREATE TABLE public.pilot_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  company_name text NOT NULL,
  employee_range text NOT NULL,
  role text NOT NULL,
  consent boolean NOT NULL,
  consent_version text NOT NULL,
  source text NOT NULL DEFAULT '/id',
  ip_hash text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.pilot_requests TO service_role;

ALTER TABLE public.pilot_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_pilot_requests_updated_at
BEFORE UPDATE ON public.pilot_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.data_retention_policies (
  company_id,
  category,
  retention_months,
  legal_reference,
  purge_action,
  active,
  notes
) VALUES (
  '07acec90-8723-4a05-9d50-3872b13973de',
  'pilot_requests',
  24,
  'UU 27/2022 Pasal 16(1)f — retensi terbatas pada tujuan; kebijakan retensi lead internal',
  'delete',
  true,
  'Pedidos de piloto não convertidos em clientes são excluídos após 24 meses.'
);