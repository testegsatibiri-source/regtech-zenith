-- Atomic, idempotent provisioning for an already approved registration.
-- No plan price or entitlement is activated here. Organization stays PENDING and
-- subscription stays DRAFT until a separate commercial activation workflow.

CREATE OR REPLACE FUNCTION public.provision_approved_registration_request(_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_request public.registration_requests%ROWTYPE;
  v_plan public.plans%ROWTYPE;
  v_organization_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.has_role(v_actor, 'platform_admin'::public.app_role)
    OR public.has_role(v_actor, 'platform_operator'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Platform decision role required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_request
  FROM public.registration_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration request not found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotent retry: return the organization already created by this request.
  IF v_request.status = 'CONVERTED' AND v_request.organization_id IS NOT NULL THEN
    RETURN v_request.organization_id;
  END IF;

  IF v_request.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Registration request must be APPROVED before provisioning';
  END IF;

  IF v_request.country_approved IS NULL THEN
    RAISE EXCEPTION 'Approved country is required before provisioning';
  END IF;

  IF v_request.plan_requested IS NULL THEN
    RAISE EXCEPTION 'A plan must be selected before provisioning';
  END IF;

  SELECT * INTO v_plan
  FROM public.plans p
  WHERE p.plan_key = v_request.plan_requested
    AND p.status = 'DRAFT'
    AND (
      (v_request.organization_type = 'ACCOUNTING_FIRM' AND p.audience IN ('ACCOUNTING_FIRM','BOTH'))
      OR
      (v_request.organization_type = 'COMPANY' AND p.audience IN ('COMPANY','BOTH'))
    )
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Requested draft plan does not match organization type';
  END IF;

  INSERT INTO public.organizations (
    name, legal_name, organization_type, tax_id, status, created_by
  ) VALUES (
    v_request.organization_name,
    v_request.legal_name,
    v_request.organization_type,
    v_request.tax_id,
    'PENDING',
    v_request.applicant_user_id
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
    organization_id, plan_id, status, billing_interval, billing_currency,
    price_minor, created_by
  ) VALUES (
    v_organization_id, v_plan.id, 'DRAFT', 'CUSTOM', NULL, NULL, v_actor
  );

  UPDATE public.registration_requests
  SET status = 'CONVERTED',
      organization_id = v_organization_id,
      reviewed_by = COALESCE(reviewed_by, v_actor),
      reviewed_at = COALESCE(reviewed_at, now()),
      updated_at = now()
  WHERE id = _request_id;

  INSERT INTO public.platform_audit_log (
    actor, action, target, country_code, component, payload
  ) VALUES (
    v_actor,
    'registration_request.provision',
    _request_id::text,
    v_request.country_approved,
    'registration_requests',
    jsonb_build_object(
      'request_id', _request_id,
      'organization_id', v_organization_id,
      'plan_key', v_plan.plan_key,
      'organization_type', v_request.organization_type,
      'organization_status', 'PENDING',
      'subscription_status', 'DRAFT'
    )
  );

  RETURN v_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_approved_registration_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_approved_registration_request(uuid) TO authenticated;

COMMENT ON FUNCTION public.provision_approved_registration_request(uuid) IS
'Atomically provisions a PENDING organization, OWNER membership and DRAFT subscription from an APPROVED registration request. Requires platform_admin/platform_operator; no price or entitlement activation.';