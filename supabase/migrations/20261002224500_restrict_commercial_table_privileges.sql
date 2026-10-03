-- Tighten default ACLs on commercial tables; RLS is not a substitute for SQL privileges.
REVOKE ALL PRIVILEGES ON TABLE
  public.plans,
  public.plan_entitlements,
  public.organization_subscriptions,
  public.organization_entitlements
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.plans,
  public.plan_entitlements,
  public.organization_subscriptions,
  public.organization_entitlements
TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  public.plans,
  public.plan_entitlements,
  public.organization_subscriptions,
  public.organization_entitlements
TO service_role;