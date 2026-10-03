-- Equipment and integration foundation.
-- Secrets are intentionally NOT stored in this schema. Provider credentials belong
-- in a secret manager and are referenced by secret_ref.

CREATE TABLE IF NOT EXISTS public.equipment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  equipment_type_id uuid REFERENCES public.equipment_types(id) ON DELETE SET NULL,
  name text NOT NULL,
  manufacturer text,
  model text,
  serial_number text,
  asset_tag text,
  location text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','MAINTENANCE','RETIRED')),
  connectivity_status text NOT NULL DEFAULT 'UNCONNECTED' CHECK (connectivity_status IN ('UNCONNECTED','CONNECTED','DEGRADED','OFFLINE')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, serial_number)
);

CREATE INDEX IF NOT EXISTS equipment_company_idx ON public.equipment(company_id);
CREATE INDEX IF NOT EXISTS equipment_type_idx ON public.equipment(equipment_type_id);

CREATE TABLE IF NOT EXISTS public.equipment_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  connection_type text NOT NULL CHECK (connection_type IN ('IOT','API','GATEWAY','MANUAL')),
  provider_key text,
  external_device_id text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','REVOKED')),
  last_seen_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(equipment_id, connection_type, provider_key, external_device_id)
);

CREATE TABLE IF NOT EXISTS public.equipment_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.equipment_connections(id) ON DELETE CASCADE,
  secret_ref text NOT NULL,
  secret_provider text NOT NULL DEFAULT 'MANAGED_SECRET_STORE',
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ROTATING','REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_type text NOT NULL CHECK (integration_type IN ('GOVERNMENT','PARTNER_API','ERP','ACCOUNTING','BANK','OTHER')),
  provider_key text NOT NULL,
  country_code text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','REVOKED')),
  secret_ref text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_connections_org_idx ON public.integration_connections(organization_id);
CREATE INDEX IF NOT EXISTS integration_connections_company_idx ON public.integration_connections(company_id);

CREATE TABLE IF NOT EXISTS public.government_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL UNIQUE REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  country_pack_key text,
  agency_key text NOT NULL,
  capability_key text NOT NULL,
  mode text NOT NULL DEFAULT 'ASSISTED' CHECK (mode IN ('ASSISTED','AUTOMATED','PORTAL_ONLY','API')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VALIDATED','ACTIVE','SUSPENDED','REVOKED')),
  endpoint_ref text,
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_api_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_connection_id uuid NOT NULL UNIQUE REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  partner_key text NOT NULL,
  api_version text,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','REVOKED')),
  webhook_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_api_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipment_access_legacy_bridge ON public.equipment
  FOR ALL TO authenticated
  USING (public.owns_company(company_id))
  WITH CHECK (public.owns_company(company_id));

CREATE POLICY equipment_connections_access_legacy_bridge ON public.equipment_connections
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equipment e WHERE e.id=equipment_id AND public.owns_company(e.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.equipment e WHERE e.id=equipment_id AND public.owns_company(e.company_id)));

CREATE POLICY equipment_credentials_access_legacy_bridge ON public.equipment_credentials
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equipment e WHERE e.id=equipment_id AND public.owns_company(e.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.equipment e WHERE e.id=equipment_id AND public.owns_company(e.company_id)));

CREATE POLICY integration_connections_access_legacy_bridge ON public.integration_connections
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id=integration_connections.organization_id AND om.user_id=auth.uid() AND om.status='ACTIVE'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id=integration_connections.organization_id AND om.user_id=auth.uid() AND om.status='ACTIVE'));

CREATE POLICY government_integrations_access_org ON public.government_integrations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.integration_connections ic JOIN public.organization_members om ON om.organization_id=ic.organization_id WHERE ic.id=integration_connection_id AND om.user_id=auth.uid() AND om.status='ACTIVE'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.integration_connections ic JOIN public.organization_members om ON om.organization_id=ic.organization_id WHERE ic.id=integration_connection_id AND om.user_id=auth.uid() AND om.status='ACTIVE'));

CREATE POLICY partner_api_connections_access_org ON public.partner_api_connections
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.integration_connections ic JOIN public.organization_members om ON om.organization_id=ic.organization_id WHERE ic.id=integration_connection_id AND om.user_id=auth.uid() AND om.status='ACTIVE'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.integration_connections ic JOIN public.organization_members om ON om.organization_id=ic.organization_id WHERE ic.id=integration_connection_id AND om.user_id=auth.uid() AND om.status='ACTIVE'));

CREATE POLICY equipment_types_read_authenticated ON public.equipment_types
  FOR SELECT TO authenticated USING (status='ACTIVE');

REVOKE ALL ON public.equipment_credentials FROM anon, authenticated;
COMMENT ON TABLE public.equipment_credentials IS 'Credential references only. Secret material must remain outside PostgreSQL.';
