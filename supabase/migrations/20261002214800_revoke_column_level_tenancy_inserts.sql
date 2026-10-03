-- REVOKE on table privileges does not remove separately granted column-level INSERT.
-- Remove those grants too, keeping all tenancy writes server-controlled until registration flows exist.
REVOKE INSERT (name, legal_name, organization_type, tax_id, created_by) ON public.organizations FROM authenticated;
REVOKE INSERT (organization_id, company_id, relationship_type) ON public.organization_companies FROM authenticated;