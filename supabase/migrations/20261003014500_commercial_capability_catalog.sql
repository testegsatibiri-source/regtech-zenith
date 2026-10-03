-- Commercial capability catalog: descriptive keys only.
-- Numeric limits, prices and activation remain unset until commercial design is approved.

WITH plan_values(plan_key, entitlement_key, value) AS (
  VALUES
  ('essential','features.payroll','{"enabled":true}'::jsonb),
  ('essential','features.people','{"enabled":true}'::jsonb),
  ('essential','features.compliance','{"enabled":true}'::jsonb),
  ('essential','features.employee_self_service','{"enabled":true}'::jsonb),
  ('essential','professional_support','{"enabled":true}'::jsonb),
  ('professional','features.payroll','{"enabled":true}'::jsonb),
  ('professional','features.people','{"enabled":true}'::jsonb),
  ('professional','features.compliance','{"enabled":true}'::jsonb),
  ('professional','features.employee_self_service','{"enabled":true}'::jsonb),
  ('professional','features.equipment','{"enabled":true}'::jsonb),
  ('professional','features.iot','{"enabled":true}'::jsonb),
  ('professional','features.government_integrations','{"enabled":true,"mode":"COUNTRY_PACK_DEFINED"}'::jsonb),
  ('accounting_firm','features.payroll','{"enabled":true}'::jsonb),
  ('accounting_firm','features.people','{"enabled":true}'::jsonb),
  ('accounting_firm','features.compliance','{"enabled":true}'::jsonb),
  ('accounting_firm','features.multi_company','{"enabled":true}'::jsonb),
  ('accounting_firm','features.client_management','{"enabled":true}'::jsonb),
  ('accounting_firm','features.equipment','{"enabled":true}'::jsonb),
  ('accounting_firm','features.government_integrations','{"enabled":true,"mode":"COUNTRY_PACK_DEFINED"}'::jsonb),
  ('accounting_firm_plus','features.payroll','{"enabled":true}'::jsonb),
  ('accounting_firm_plus','features.people','{"enabled":true}'::jsonb),
  ('accounting_firm_plus','features.compliance','{"enabled":true}'::jsonb),
  ('accounting_firm_plus','features.multi_company','{"enabled":true}'::jsonb),
  ('accounting_firm_plus','features.client_management','{"enabled":true}'::jsonb),
  ('accounting_firm_plus','features.equipment','{"enabled":true}'::jsonb),
  ('accounting_firm_plus','features.iot','{"enabled":true}'::jsonb),
  ('accounting_firm_plus','features.government_integrations','{"enabled":true,"mode":"COUNTRY_PACK_DEFINED"}'::jsonb),
  ('accounting_firm_plus','features.partner_api','{"enabled":true}'::jsonb),
  ('enterprise','features.payroll','{"enabled":true}'::jsonb),
  ('enterprise','features.people','{"enabled":true}'::jsonb),
  ('enterprise','features.compliance','{"enabled":true}'::jsonb),
  ('enterprise','features.multi_company','{"enabled":true}'::jsonb),
  ('enterprise','features.client_management','{"enabled":true}'::jsonb),
  ('enterprise','features.equipment','{"enabled":true}'::jsonb),
  ('enterprise','features.iot','{"enabled":true}'::jsonb),
  ('enterprise','features.government_integrations','{"enabled":true,"mode":"COUNTRY_PACK_DEFINED","configurable":true}'::jsonb),
  ('enterprise','features.partner_api','{"enabled":true,"configurable":true}'::jsonb)
)
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT p.id, v.entitlement_key, v.value
FROM plan_values v
JOIN public.plans p ON p.plan_key=v.plan_key
ON CONFLICT (plan_id, entitlement_key) DO UPDATE SET
  value=EXCLUDED.value,
  updated_at=now();

COMMENT ON TABLE public.plan_entitlements IS
'Commercial capability templates. Plan prices and numeric capacity limits are intentionally unset; active organization_entitlements are authoritative.';
