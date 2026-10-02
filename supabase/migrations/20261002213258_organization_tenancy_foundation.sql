CREATE TYPE public.organization_type AS ENUM ('ACCOUNTING_FIRM', 'COMPANY');
CREATE TYPE public.organization_member_role AS ENUM ('OWNER', 'ADMIN', 'ACCOUNTANT', 'HR', 'PAYROLL_OPERATOR', 'VIEWER');
CREATE TYPE public.organization_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE public.organization_member_status AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');
CREATE TYPE public.organization_company_relationship AS ENUM ('OWNER', 'ACCOUNTING_FIRM', 'PAYROLL_PROVIDER', 'ADVISOR');

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE TABLE public.organizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK (length(trim(name)) > 0),
 legal_name text, organization_type public.organization_type NOT NULL,
 tax_id text, status public.organization_status NOT NULL DEFAULT 'PENDING',
 created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organizations_created_by_idx ON public.organizations(created_by);
CREATE INDEX organizations_status_idx ON public.organizations(status);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.organizations TO authenticated;
GRANT INSERT (name, legal_name, organization_type, tax_id, created_by) ON public.organizations TO authenticated;
GRANT UPDATE (name, legal_name, tax_id) ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

CREATE TABLE public.organization_members (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role public.organization_member_role NOT NULL,
 status public.organization_member_status NOT NULL DEFAULT 'INVITED',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (organization_id, user_id)
);
CREATE INDEX organization_members_user_status_idx ON public.organization_members(user_id, status);
CREATE INDEX organization_members_org_status_idx ON public.organization_members(organization_id, status);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;

CREATE TABLE public.organization_companies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 relationship_type public.organization_company_relationship NOT NULL,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED', 'ENDED')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (organization_id, company_id)
);
CREATE INDEX organization_companies_company_idx ON public.organization_companies(company_id, status);
CREATE INDEX organization_companies_org_idx ON public.organization_companies(organization_id, status);
ALTER TABLE public.organization_companies ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.organization_companies TO authenticated;
GRANT INSERT (organization_id, company_id, relationship_type) ON public.organization_companies TO authenticated;
GRANT ALL ON public.organization_companies TO service_role;

CREATE OR REPLACE FUNCTION private.is_org_member(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = _organization_id AND m.user_id = (SELECT auth.uid()) AND m.status = 'ACTIVE'); $$;
CREATE OR REPLACE FUNCTION private.can_manage_org(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = _organization_id AND m.user_id = (SELECT auth.uid()) AND m.status = 'ACTIVE' AND m.role IN ('OWNER', 'ADMIN')); $$;
CREATE OR REPLACE FUNCTION private.is_org_creator(_organization_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = _organization_id AND o.created_by = (SELECT auth.uid()) AND o.status = 'PENDING'); $$;
CREATE OR REPLACE FUNCTION private.can_link_owned_company(_organization_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT private.can_manage_org(_organization_id) AND EXISTS (SELECT 1 FROM public.companies c JOIN public.organizations o ON o.id = _organization_id WHERE c.id = _company_id AND c.owner_id = (SELECT auth.uid()) AND o.status = 'PENDING'); $$;
REVOKE ALL ON FUNCTION private.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_manage_org(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_org_creator(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_link_owned_company(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_manage_org(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_org_creator(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_link_owned_company(uuid, uuid) TO authenticated, service_role;

CREATE POLICY organizations_select_member ON public.organizations FOR SELECT TO authenticated USING (private.is_org_member(id));
CREATE POLICY organizations_insert_creator ON public.organizations FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()) AND status = 'PENDING');
CREATE POLICY organizations_update_manager ON public.organizations FOR UPDATE TO authenticated USING (private.can_manage_org(id)) WITH CHECK (private.can_manage_org(id));
CREATE POLICY organization_members_select_org ON public.organization_members FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR private.is_org_member(organization_id));
CREATE POLICY organization_members_insert_owner_or_manager ON public.organization_members FOR INSERT TO authenticated WITH CHECK (
 (user_id = (SELECT auth.uid()) AND role = 'OWNER' AND status = 'ACTIVE' AND private.is_org_creator(organization_id))
 OR (private.can_manage_org(organization_id) AND role <> 'OWNER' AND status IN ('INVITED', 'ACTIVE'))
);
CREATE POLICY organization_companies_select_member ON public.organization_companies FOR SELECT TO authenticated USING (private.is_org_member(organization_id));
CREATE POLICY organization_companies_insert_owned_company ON public.organization_companies FOR INSERT TO authenticated WITH CHECK (
 private.can_link_owned_company(organization_id, company_id)
 AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND ((o.organization_type = 'COMPANY' AND relationship_type = 'OWNER') OR (o.organization_type = 'ACCOUNTING_FIRM' AND relationship_type = 'ACCOUNTING_FIRM')))
);
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER organization_members_updated_at BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER organization_companies_updated_at BEFORE UPDATE ON public.organization_companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
COMMENT ON TABLE public.organizations IS 'Commercial/access boundary: accounting firm or directly contracting company. Separate from operational payroll companies.';
COMMENT ON TABLE public.organization_members IS 'Organization-scoped membership. Kept separate from platform-level app_role.';
COMMENT ON TABLE public.organization_companies IS 'N:N relationship between contracting organizations and operational companies. Client-company linking remains owner-gated in Phase 1.';
COMMENT ON COLUMN public.organizations.status IS 'Self-service creation is PENDING; activation is reserved for a later controlled registration/qualification workflow.';