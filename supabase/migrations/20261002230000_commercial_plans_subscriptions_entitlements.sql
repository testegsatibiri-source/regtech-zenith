-- Phase 2: commercial plans, subscriptions and effective entitlement records.
-- No commercial prices or plan limits are seeded; those require an explicit product decision.
-- Client roles are read-only. Trusted server functions/service_role own all commercial writes.

CREATE TYPE public.plan_status AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');
CREATE TYPE public.subscription_status AS ENUM ('PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED', 'EXPIRED');
CREATE TYPE public.entitlement_source AS ENUM ('PLAN', 'PILOT', 'OVERRIDE', 'COMPENSATION', 'MIGRATION');
CREATE TYPE public.entitlement_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED');

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z][a-z0-9_-]{1,63}$'),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  status public.plan_status NOT NULL DEFAULT 'DRAFT',
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly', 'custom')),
  currency char(3),
  price_minor bigint CHECK (price_minor IS NULL OR price_minor >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plans_status_idx ON public.plans(status);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
CREATE POLICY plans_read_active ON public.plans
  FOR SELECT TO authenticated USING (status = 'ACTIVE');

CREATE TABLE public.plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL CHECK (entitlement_key ~ '^[a-z][a-z0-9_.-]{1,127}$'),
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, entitlement_key)
);
CREATE INDEX plan_entitlements_key_idx ON public.plan_entitlements(entitlement_key);
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.plan_entitlements TO authenticated;
GRANT ALL ON public.plan_entitlements TO service_role;
CREATE POLICY plan_entitlements_read_active_plan ON public.plan_entitlements
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.status = 'ACTIVE')
  );

CREATE TABLE public.organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status public.subscription_status NOT NULL DEFAULT 'PENDING',
  starts_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  canceled_at timestamptz,
  ended_at timestamptz,
  billing_provider text,
  provider_customer_id text,
  provider_subscription_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (current_period_end IS NULL OR current_period_start IS NULL OR current_period_end > current_period_start),
  CHECK (trial_ends_at IS NULL OR starts_at IS NULL OR trial_ends_at >= starts_at)
);
CREATE INDEX organization_subscriptions_org_created_idx ON public.organization_subscriptions(organization_id, created_at DESC);
CREATE INDEX organization_subscriptions_plan_status_idx ON public.organization_subscriptions(plan_id, status);
CREATE UNIQUE INDEX organization_subscriptions_one_current_idx
  ON public.organization_subscriptions(organization_id)
  WHERE status IN ('PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED');
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.organization_subscriptions TO authenticated;
GRANT ALL ON public.organization_subscriptions TO service_role;
CREATE POLICY organization_subscriptions_read_member ON public.organization_subscriptions
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));

CREATE TABLE public.organization_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL CHECK (entitlement_key ~ '^[a-z][a-z0-9_.-]{1,127}$'),
  value jsonb NOT NULL,
  source public.entitlement_source NOT NULL,
  status public.entitlement_status NOT NULL DEFAULT 'PENDING',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  source_subscription_id uuid REFERENCES public.organization_subscriptions(id) ON DELETE SET NULL,
  reason text,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR expires_at > starts_at)
);
CREATE INDEX organization_entitlements_org_key_status_idx
  ON public.organization_entitlements(organization_id, entitlement_key, status);
CREATE INDEX organization_entitlements_expiry_idx
  ON public.organization_entitlements(expires_at) WHERE expires_at IS NOT NULL;
ALTER TABLE public.organization_entitlements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.organization_entitlements TO authenticated;
GRANT ALL ON public.organization_entitlements TO service_role;
CREATE POLICY organization_entitlements_read_member ON public.organization_entitlements
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));

CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER plan_entitlements_updated_at BEFORE UPDATE ON public.plan_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER organization_subscriptions_updated_at BEFORE UPDATE ON public.organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER organization_entitlements_updated_at BEFORE UPDATE ON public.organization_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.plans IS 'Versionable commercial plan catalog. Prices and limits remain unset until approved; clients cannot write.';
COMMENT ON TABLE public.plan_entitlements IS 'Plan capability and quota definitions, stored as typed-by-key JSON values rather than UI hard-codes.';
COMMENT ON TABLE public.organization_subscriptions IS 'Subscription lifecycle and billing-provider references for the contracting organization. Writes are server-controlled.';
COMMENT ON TABLE public.organization_entitlements IS 'Effective, time-bounded grants/overrides. Server-side authorization must evaluate status and effective dates; a row existing is not sufficient.';
COMMENT ON COLUMN public.organization_entitlements.value IS 'JSON scalar/object value for an entitlement key, e.g. a quota integer or capability boolean. Validation is key-specific in the entitlement service.';
