-- Close direct client-side tenancy writes until the controlled registration flow exists.
-- Organization creation, membership bootstrap and company linking must be performed
-- by trusted server functions after registration/entitlement checks.
REVOKE INSERT ON public.organizations FROM authenticated;
REVOKE INSERT ON public.organization_members FROM authenticated;
REVOKE INSERT ON public.organization_companies FROM authenticated;
DROP POLICY IF EXISTS organizations_insert_creator ON public.organizations;
DROP POLICY IF EXISTS organization_members_insert_owner_or_manager ON public.organization_members;
DROP POLICY IF EXISTS organization_companies_insert_owned_company ON public.organization_companies;
COMMENT ON TABLE public.organizations IS 'Commercial/access boundary. Direct client writes are disabled until controlled registration and entitlement checks are implemented.';
COMMENT ON TABLE public.organization_members IS 'Organization-scoped membership. Direct client writes are disabled until trusted membership/invitation functions are implemented.';
COMMENT ON TABLE public.organization_companies IS 'N:N relationship between contracting organizations and operational companies. Direct client writes are disabled until authorized company-linking flow is implemented.';