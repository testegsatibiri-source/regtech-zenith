-- Phase 2: commercial plans, subscriptions and effective entitlement records.
-- No prices or plan limits are seeded here; product/commercial values require explicit decisions.
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL UNIQUE CHECK (plan_key ~ '^[a-z][a-z0-9_-]{1,63}$'),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'RETIRED')),
  billing_currency char(3),
  billing_interval text CHECK (billing_interval IS NULL OR billing_interval IN ('MONTHLY', 'ANNUAL', 'CUSTOM')),
  price_minor bigint CHECK (price_minor IS NULL OR price_minor >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (billing_currency IS NULL OR billing_currency ~ '^[A-Z]{3}$')
);
CREATE INDEX plans_status_idx ON public.plans(status);

CREATE TABLE public.plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL CHECK (entitlement_key ~ '^[a-z][a-z0-9_.-]{1,127}$'),
  value jsonb NOT NULL CHECK (jsonb_typeof(value) <> 'null'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, entitlement_key)
);
CREATE INDEX plan_entitlements_key_idx ON public.plan_entitlements(entitlement_key);

CREATE TABLE public.organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED')),
  billing_interval text NOT NULL DEFAULT 'CUSTOM' CHECK (billing_interval IN ('MONTHLY', 'ANNUAL', 'CUSTOM')),
  billing_currency char(3) CHECK (billing_currency IS NULL OR billing_currency ~ '^[A-Z]{3}$'),
  price_minor bigint CHECK (price_minor IS NULL OR price_minor >= 0),
  external_provider text,
  external_customer_id text,
  external_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (current_period_end IS NULL OR current_period_start IS NULL OR current_period_end > current_period_start),
  CHECK (external_subscription_id IS NULL OR external_provider IS NOT NULL)
);
CREATE INDEX organization_subscriptions_org_idx ON public.organization_subscriptions(organization_id, created_at DESC);
CREATE INDEX organization_subscriptions_status_period_idx ON public.organization_subscriptions(status, current_period_end);
CREATE UNIQUE INDEX organization_subscriptions_external_id_idx
  ON public.organization_subscriptions(external_provider, external_subscription_id)
  WHERE external_provider IS NOT NULL AND external_subscription_id IS NOT NULL;
CREATE UNIQUE INDEX organization_subscriptions_one_current_idx
  ON public.organization_subscriptions(organization_id)
  WHERE status IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED');

CREATE TABLE public.organization_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL CHECK (entitlement_key ~ '^[a-z][a-z0-9_.-]{1,127}$'),
  value jsonb NOT NULL CHECK (jsonb_typeof(value) <> 'null'),
  source_type text NOT NULL CHECK (source_type IN ('PLAN', 'OVERRIDE', 'PILOT', 'SYSTEM')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED')),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until > valid_from),
  UNIQUE (organization_id, entitlement_key)
);
CREATE INDEX organization_entitlements_org_status_idx ON public.organization_entitlements(organization_id, status);
CREATE INDEX organization_entitlements_key_status_idx ON public.organization_entitlements(entitlement_key, status);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_entitlements ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.plans, public.plan_entitlements TO authenticated;
GRANT SELECT ON public.organization_subscriptions, public.organization_entitlements TO authenticated;
GRANT ALL ON public.plans, public.plan_entitlements, public.organization_subscriptions, public.organization_entitlements TO service_role;

CREATE POLICY plans_read_active ON public.plans
  FOR SELECT TO authenticated USING (status = 'ACTIVE');
CREATE POLICY plan_entitlements_read_active_plan ON public.plan_entitlements
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.plans p WHERE p.id = plan_id AND p.status = 'ACTIVE')
  );
CREATE POLICY organization_subscriptions_read_member ON public.organization_subscriptions
  FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
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

COMMENT ON TABLE public.plans IS 'Commercial plan catalogue. No plan is purchasable until explicitly activated.';
COMMENT ON TABLE public.plan_entitlements IS 'Entitlement defaults attached to a plan; values are structured JSON and interpreted server-side.';
COMMENT ON TABLE public.organization_subscriptions IS 'Organization-level subscription history. Writes are reserved for trusted server-side billing/registration workflows.';
COMMENT ON TABLE public.organization_entitlements IS 'Effective entitlement records for an organization. Server-side authorization must evaluate status and validity dates; never trust frontend counts.';
COMMENT ON COLUMN public.organization_subscriptions.price_minor IS 'Price in minor currency units, e.g. cents/centavos. NULL until a commercial price is configured.';
COMMENT ON COLUMN public.organization_entitlements.value IS 'Structured entitlement value; limits and capabilities are data-driven, not hard-coded in UI roles.';