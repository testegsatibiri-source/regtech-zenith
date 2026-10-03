-- Commercial plan catalog: structure only.
-- Prices and capacity values remain unset intentionally; entitlement values are
-- templates and become authoritative only after organization activation.
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'BOTH'
    CHECK (audience IN ('COMPANY','ACCOUNTING_FIRM','BOTH')),
  ADD COLUMN IF NOT EXISTS plan_family text NOT NULL DEFAULT 'STANDARD'
    CHECK (plan_family IN ('STANDARD','ENTERPRISE')),
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 100
    CHECK (display_order >= 0);

CREATE INDEX IF NOT EXISTS plans_active_audience_order_idx
  ON public.plans (status, audience, display_order);

COMMENT ON COLUMN public.plans.audience IS 'Commercial audience. Registration and entitlements remain authoritative.';
COMMENT ON COLUMN public.plans.plan_family IS 'Commercial packaging family, independent from price.';
COMMENT ON COLUMN public.plans.display_order IS 'Presentation/order hint only; never authorization.';

INSERT INTO public.plans
  (plan_key, name, description, status, billing_currency, billing_interval, price_minor, audience, plan_family, display_order)
VALUES
  ('essential', 'Essential', 'Core payroll, people and compliance foundation for a company.', 'DRAFT', NULL, NULL, NULL, 'COMPANY', 'STANDARD', 10),
  ('professional', 'Professional', 'Expanded people, compliance, equipment and government integration capabilities.', 'DRAFT', NULL, NULL, NULL, 'COMPANY', 'STANDARD', 20),
  ('accounting_firm', 'Accounting Firm', 'Multi-company workspace for accounting firms managing client companies.', 'DRAFT', NULL, NULL, NULL, 'ACCOUNTING_FIRM', 'STANDARD', 30),
  ('accounting_firm_plus', 'Accounting Firm Plus', 'Expanded multi-company, team, equipment and government integration capacity.', 'DRAFT', NULL, NULL, NULL, 'ACCOUNTING_FIRM', 'STANDARD', 40),
  ('enterprise', 'Enterprise', 'Configurable enterprise package with negotiated limits and integrations.', 'DRAFT', NULL, NULL, NULL, 'BOTH', 'ENTERPRISE', 50)
ON CONFLICT (plan_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = 'DRAFT',
  billing_currency = NULL,
  billing_interval = NULL,
  price_minor = NULL,
  audience = EXCLUDED.audience,
  plan_family = EXCLUDED.plan_family,
  display_order = EXCLUDED.display_order,
  updated_at = now();

WITH plan_values(plan_key, entitlement_key, value) AS (
  VALUES
  ('essential','organization.max_companies','{"limit":null,"unit":"companies","configurable":true}'::jsonb),
  ('essential','organization.max_users','{"limit":null,"unit":"users","configurable":true}'::jsonb),
  ('essential','company.max_employees','{"limit":null,"unit":"employees_per_company","configurable":true}'::jsonb),
  ('essential','company.max_equipment','{"limit":null,"unit":"equipment_per_company","configurable":true}'::jsonb),
  ('essential','equipment.iot','{"enabled":null,"configurable":true}'::jsonb),
  ('essential','integrations.government_api','{"enabled":null,"mode":"COUNTRY_PACK_DEFINED","scope":"COUNTRY_PACK_DEFINED","configurable":true}'::jsonb),
  ('professional','organization.max_companies','{"limit":null,"unit":"companies","configurable":true}'::jsonb),
  ('professional','organization.max_users','{"limit":null,"unit":"users","configurable":true}'::jsonb),
  ('professional','company.max_employees','{"limit":null,"unit":"employees_per_company","configurable":true}'::jsonb),
  ('professional','company.max_equipment','{"limit":null,"unit":"equipment_per_company","configurable":true}'::jsonb),
  ('professional','equipment.iot','{"enabled":null,"configurable":true}'::jsonb),
  ('professional','integrations.government_api','{"enabled":null,"mode":"COUNTRY_PACK_DEFINED","scope":"COUNTRY_PACK_DEFINED","configurable":true}'::jsonb),
  ('accounting_firm','organization.max_companies','{"limit":null,"unit":"companies","configurable":true}'::jsonb),
  ('accounting_firm','organization.max_users','{"limit":null,"unit":"users","configurable":true}'::jsonb),
  ('accounting_firm','company.max_employees','{"limit":null,"unit":"employees_per_company","configurable":true}'::jsonb),
  ('accounting_firm','company.max_equipment','{"limit":null,"unit":"equipment_per_company","configurable":true}'::jsonb),
  ('accounting_firm','equipment.iot','{"enabled":null,"configurable":true}'::jsonb),
  ('accounting_firm','integrations.government_api','{"enabled":null,"mode":"COUNTRY_PACK_DEFINED","scope":"COUNTRY_PACK_DEFINED","configurable":true}'::jsonb),
  ('accounting_firm_plus','organization.max_companies','{"limit":null,"unit":"companies","configurable":true}'::jsonb),
  ('accounting_firm_plus','organization.max_users','{"limit":null,"unit":"users","configurable":true}'::jsonb),
  ('accounting_firm_plus','company.max_employees','{"limit":null,"unit":"employees_per_company","configurable":true}'::jsonb),
  ('accounting_firm_plus','company.max_equipment','{"limit":null,"unit":"equipment_per_company","configurable":true}'::jsonb),
  ('accounting_firm_plus','equipment.iot','{"enabled":null,"configurable":true}'::jsonb),
  ('accounting_firm_plus','integrations.government_api','{"enabled":null,"mode":"COUNTRY_PACK_DEFINED","scope":"COUNTRY_PACK_DEFINED","configurable":true}'::jsonb),
  ('enterprise','organization.max_companies','{"limit":null,"unit":"companies","configurable":true,"model":"NEGOTIATED"}'::jsonb),
  ('enterprise','organization.max_users','{"limit":null,"unit":"users","configurable":true,"model":"NEGOTIATED"}'::jsonb),
  ('enterprise','company.max_employees','{"limit":null,"unit":"employees_per_company","configurable":true,"model":"NEGOTIATED"}'::jsonb),
  ('enterprise','company.max_equipment','{"limit":null,"unit":"equipment_per_company","configurable":true,"model":"NEGOTIATED"}'::jsonb),
  ('enterprise','equipment.iot','{"enabled":null,"configurable":true,"model":"NEGOTIATED"}'::jsonb),
  ('enterprise','integrations.government_api','{"enabled":null,"mode":"COUNTRY_PACK_DEFINED","scope":"COUNTRY_PACK_DEFINED","configurable":true,"model":"NEGOTIATED"}'::jsonb),
  ('enterprise','integrations.api','{"enabled":null,"mode":"PARTNER_API","configurable":true,"model":"NEGOTIATED"}'::jsonb)
)
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT p.id, v.entitlement_key, v.value
FROM plan_values v
JOIN public.plans p ON p.plan_key = v.plan_key
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

COMMENT ON TABLE public.plan_entitlements IS 'Declarative commercial plan template. No prices or capacity values are fixed at this stage.';
