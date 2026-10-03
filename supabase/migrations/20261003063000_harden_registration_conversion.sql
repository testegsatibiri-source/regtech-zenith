-- Harden registration conversion in the existing RPC.
CREATE OR REPLACE FUNCTION public.convert_registration_request(
  _request_id uuid,
  _actor_user_id uuid
)
RETURNS TABLE(registration_request_id uuid, organization_id uuid, organization_subscription_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $fn$
DECLARE
  r public.registration_requests%ROWTYPE;
  p public.plans%ROWTYPE;
  oid uuid;
  sid uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _actor_user_id THEN
    RAISE EXCEPTION 'Actor mismatch' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.has_role(auth.uid(),'platform_admin'::public.app_role)
       OR public.has_role(auth.uid(),'platform_operator'::public.app_role)) THEN
    RAISE EXCEPTION 'Platform decision role required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO r FROM public.registration_requests WHERE id=_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found' USING ERRCODE='P0002'; END IF;

  IF r.status='CONVERTED' AND r.organization_id IS NOT NULL THEN
    SELECT id INTO sid FROM public.organization_subscriptions
      WHERE organization_id=r.organization_id ORDER BY created_at DESC LIMIT 1;
    IF sid IS NULL THEN RAISE EXCEPTION 'Converted request has no subscription'; END IF;
    RETURN QUERY SELECT r.id,r.organization_id,sid; RETURN;
  END IF;
  IF r.status <> 'APPROVED' OR r.organization_id IS NOT NULL THEN
    RAISE EXCEPTION 'Request must be approved and not converted';
  END IF;
  IF r.country_approved IS NULL OR r.plan_requested IS NULL THEN
    RAISE EXCEPTION 'Approved country and requested plan are required';
  END IF;

  SELECT * INTO p FROM public.plans
   WHERE plan_key=r.plan_requested AND status='DRAFT'
     AND ((r.organization_type='ACCOUNTING_FIRM' AND audience IN ('ACCOUNTING_FIRM','BOTH'))
       OR (r.organization_type='COMPANY' AND audience IN ('COMPANY','BOTH')))
   FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Draft plan does not match organization type'; END IF;

  INSERT INTO public.organizations(name,legal_name,organization_type,tax_id,status,created_by)
  VALUES(r.organization_name,r.legal_name,r.organization_type,r.tax_id,'PENDING',_actor_user_id)
  RETURNING id INTO oid;
  INSERT INTO public.organization_members(organization_id,user_id,role,status)
  VALUES(oid,r.applicant_user_id,'OWNER','ACTIVE');
  INSERT INTO public.organization_subscriptions(
    organization_id,plan_id,status,billing_interval,billing_currency,price_minor,created_by)
  VALUES(oid,p.id,'DRAFT',COALESCE(p.billing_interval,'CUSTOM'),NULL,NULL,_actor_user_id)
  RETURNING id INTO sid;
  INSERT INTO public.organization_entitlements(
    organization_id,entitlement_key,value,source_type,status,reason,created_by)
  SELECT oid,pe.entitlement_key,pe.value,'PLAN','SUSPENDED','Pending commercial activation',_actor_user_id
  FROM public.plan_entitlements pe WHERE pe.plan_id=p.id;

  UPDATE public.registration_requests SET status='CONVERTED',organization_id=oid,updated_at=now()
   WHERE id=r.id;
  INSERT INTO public.platform_audit_log(actor,action,target,country_code,component,payload)
  VALUES(_actor_user_id,'registration_request.convert',r.id::text,r.country_approved,
    'registration.functions',jsonb_build_object('organization_id',oid,'subscription_id',sid,
    'plan_key',p.plan_key,'organization_status','PENDING','subscription_status','DRAFT',
    'entitlements_status','SUSPENDED'));
  RETURN QUERY SELECT r.id,oid,sid;
END;
$fn$;
REVOKE ALL ON FUNCTION public.convert_registration_request(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_registration_request(uuid,uuid) TO authenticated;
COMMENT ON FUNCTION public.convert_registration_request(uuid,uuid) IS
'Atomic idempotent conversion; checks authenticated platform role; creates PENDING organization, DRAFT subscription and SUSPENDED entitlements.';
