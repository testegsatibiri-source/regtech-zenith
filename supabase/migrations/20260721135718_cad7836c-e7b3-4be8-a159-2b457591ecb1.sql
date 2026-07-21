
-- H11.1a — Signature keyId + compat report cross-reference
ALTER TABLE public.pack_signing_keys ADD COLUMN IF NOT EXISTS key_id text;
CREATE UNIQUE INDEX IF NOT EXISTS pack_signing_keys_active_key_id_uidx
  ON public.pack_signing_keys (key_id) WHERE active AND revoked_at IS NULL AND key_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS pack_signing_keys_key_id_idx
  ON public.pack_signing_keys (key_id);

ALTER TABLE public.compatibility_reports ADD COLUMN IF NOT EXISTS published_report_ref uuid;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'compatibility_reports_published_report_ref_fkey'
  ) THEN
    ALTER TABLE public.compatibility_reports
      ADD CONSTRAINT compatibility_reports_published_report_ref_fkey
      FOREIGN KEY (published_report_ref) REFERENCES public.pack_registry(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.compatibility_reports ADD COLUMN IF NOT EXISTS rejections jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.compatibility_reports ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'boot';
-- source ∈ {'publication','boot','install'} (informal check; not enforced as enum for flexibility)

-- Allow admin role to insert boot / compat reports via server functions
GRANT INSERT ON public.compatibility_reports TO authenticated;
GRANT INSERT ON public.runtime_boot_reports TO authenticated;
