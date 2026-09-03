-- Fase 4 (Onda A) — Hardening do modelo de convite de plataforma.

-- 1. Estado do convite
DO $$ BEGIN
  CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','expired','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Colunas novas
ALTER TABLE public.platform_invitations
  ADD COLUMN IF NOT EXISTS token_hash TEXT,
  ADD COLUMN IF NOT EXISTS token_preview TEXT,
  ADD COLUMN IF NOT EXISTS status public.invitation_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resend_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 3. Remove o token em claro (tabela está vazia; nada a migrar)
ALTER TABLE public.platform_invitations DROP COLUMN IF EXISTS token;
ALTER TABLE public.platform_invitations ALTER COLUMN token_hash SET NOT NULL;

-- 4. invited_by passa a ser auditável mesmo após remoção do convidador
ALTER TABLE public.platform_invitations ALTER COLUMN invited_by DROP NOT NULL;
ALTER TABLE public.platform_invitations DROP CONSTRAINT IF EXISTS platform_invitations_invited_by_fkey;
ALTER TABLE public.platform_invitations
  ADD CONSTRAINT platform_invitations_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Índices / unicidade
CREATE UNIQUE INDEX IF NOT EXISTS platform_invitations_token_hash_key
  ON public.platform_invitations (token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS platform_invitations_pending_uniq
  ON public.platform_invitations (lower(email), role, coalesce(country_code, ''))
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS platform_invitations_idempotency_key_uniq
  ON public.platform_invitations (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS platform_invitations_status_idx
  ON public.platform_invitations (status, expires_at);

-- 6. Coerência de estado
ALTER TABLE public.platform_invitations
  DROP CONSTRAINT IF EXISTS platform_invitations_status_coherence;
ALTER TABLE public.platform_invitations
  ADD CONSTRAINT platform_invitations_status_coherence CHECK (
    (status = 'accepted' AND accepted_at IS NOT NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
    OR (status IN ('pending','expired') AND accepted_at IS NULL AND revoked_at IS NULL)
  );

-- 7. Grants e RLS (a tabela já tem RLS habilitada)
REVOKE ALL ON public.platform_invitations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_invitations TO authenticated;
GRANT ALL ON public.platform_invitations TO service_role;
ALTER TABLE public.platform_invitations ENABLE ROW LEVEL SECURITY;