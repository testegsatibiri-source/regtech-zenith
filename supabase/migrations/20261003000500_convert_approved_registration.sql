-- Phase 4: atomically convert an approved registration request into a pending organization.
-- This function is intentionally callable only by service_role. It does not activate
-- the organization or its entitlements; commercial activation is a separate gate.
CREATE OR REPLACE FUNCTION public.convert_registration_request(
  _request_id uuid,
  _actor_user_id uuid
)
RETURNS TABLE (
  registration_request_id uuid,
  organization_id uuid,
  organization_subscription_id uuid
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_request public.registration_requests%ROWTYPE;
  v_plan public.plans%ROWTYPE;
  v_organization_id uuid;
  v_subscription_id uuid;
BEGIN
  SELECT *
    INTO v_request
    FROM public.registration_requests
   WHERE id = _request_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration request not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_request.status <> 'APPROVED' OR v_request.organization_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only an approved, unconverted request can be converted'
      USING ERRCODE = '22023';
  END IF;

  IF v_request.country_approved IS NULL THEN
    RAISE EXCEPTION 'An approved country is required before conversion'
      USING ERRCODE = '22023';
  END IF;

  IF v_request.plan_requested IS NULL THEN
    RAISE EXCEPTION 'A requested plan is required before conversion'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_plan
    FROM public.plans
   WHERE plan_key = v_request.plan_requested
     AND status = 'ACTIVE'
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Requested plan is not active'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organizations (
    name, legal_name, organization_type, tax_id, status, created_by
  ) VALUES (
    v_request.organization_name,
    v_request.legal_name,
    v_request.organization_type,
    v_request.tax_id,
    'PENDING',
    _actor_user_id
  )
  RETURNING id INTO v_organization_id;

  INSERT INTO public.organization_members (
    organization_id, user_id, role, status
  ) VALUES (
    v_organization_id,
    v_request.applicant_user_id,
    'OWNER',
    'ACTIVE'
  );

  INSERT INTO public.organization_subscriptions (
    organization_id, plan_id, status, billing_interval,
    billing_currency, price_minor, created_by
  ) VALUES (
    v_organization_id,
    v_plan.id,
    'DRAFT',
    COALESCE(v_plan.billing_interval, 'CUSTOM'),
    v_plan.billing_currency,
    v_plan.price_minor,
    _actor_user_id
  )
  RETURNING id INTO v_subscription_id;

  -- Defaults are copied as SUSPENDED: approval/conversion does not activate
  -- commercial entitlements. Activation requires a separate trusted workflow.
  INSERT INTO public.organization_entitlements (
    organization_id, entitlement_key, value, source_type, status,
    reason, created_by
  )
  SELECT
    v_organization_id,
    pe.entitlement_key,
    pe.value,
    'PLAN',
    'SUSPENDED',
    'Pending commercial activation',
    _actor_user_id
  FROM public.plan_entitlements pe
  WHERE pe.plan_id = v_plan.id;

  UPDATE public.registration_requests
     SET status = 'CONVERTED',
         organization_id = v_organization_id,
         updated_at = now()
   WHERE id = v_request.id;

  RETURN QUERY SELECT v_request.id, v_organization_id, v_subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_registration_request(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_registration_request(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.convert_registration_request(uuid, uuid) IS
  'Atomically converts an approved registration into a pending organization, active owner membership, draft subscription and suspended plan entitlements. Service-role only; activation is separate.';
