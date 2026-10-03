-- Commercial plan entitlement catalogue.
-- All plans remain DRAFT. No prices or numeric limits are assigned here.
-- Null limits and disabled features intentionally fail closed until approved.

WITH catalogue(entitlement_key, default_value) AS (
  VALUES
    ('organization.max_companies', '{"limit": null}'::jsonb),
    ('organization.max_users', '{"limit": null}'::jsonb),
    ('company.max_employees', '{"limit": null}'::jsonb),
    ('company.max_equipment', '{"limit": null}'::jsonb),
    ('equipment.iot', '{"enabled": false}'::jsonb),
    ('features.partner_api', '{"enabled": false}'::jsonb),
    ('features.government_integrations', '{"enabled": false}'::jsonb)
)
INSERT INTO public.plan_entitlements (plan_id, entitlement_key, value)
SELECT p.id, c.entitlement_key, c.default_value
FROM public.plans p
CROSS JOIN catalogue c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.plan_entitlements pe
  WHERE pe.plan_id = p.id
    AND pe.entitlement_key = c.entitlement_key
);

COMMENT ON TABLE public.plan_entitlements IS
'Commercial entitlement matrix by plan. Draft plans use disabled features and null numeric limits until commercial policy is approved; null does not mean unlimited.';