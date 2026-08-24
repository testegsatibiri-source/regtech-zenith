BEGIN;

-- Rotate out the old Philippines signing keys (v1.3.0 / PH-2024.3)
UPDATE public.pack_signing_keys
SET revoked_at = now()
WHERE key_id IN (
  'd3f0de34370b62d77212960fec901534',
  '6d1ebeee27ec6a3ebed1a6cd7f5b6e96'
);

-- Insert new active keys for the re-signed v1.4.0 manifest
INSERT INTO public.pack_signing_keys (id, publisher, public_key, algo, capabilities, provider, active, key_id)
VALUES (
  gen_random_uuid(),
  'uboard-ph',
  '6tRdj30gaMvbHBcIrendIxUjpCbDnF/MhHGKRETwur0=',
  'ed25519',
  ARRAY['sign']::text[],
  'db',
  true,
  'ead45d8f7d2068cbdb1c1708ade9dd231523a426c39c5fcc84718a4444f0babd'
);

INSERT INTO public.pack_signing_keys (id, publisher, public_key, algo, capabilities, provider, active, key_id)
VALUES (
  gen_random_uuid(),
  'platform-cto-ph',
  'QJUasGIs/hQln8XDi8+MJ+phjqheQnPHptucsuCehrc=',
  'ed25519',
  ARRAY['sign']::text[],
  'db',
  true,
  '40951ab0622cfe14259fc5c38bcf8c27ea618ea85e4273c7a6db9cb2e09e86b7'
);

COMMIT;