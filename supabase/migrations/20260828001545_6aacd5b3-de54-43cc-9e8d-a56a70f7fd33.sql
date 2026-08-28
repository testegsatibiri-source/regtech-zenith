UPDATE public.pack_signing_keys SET active = false WHERE publisher IN ('uboard-ph','platform-cto-ph');

INSERT INTO public.pack_signing_keys (id, publisher, public_key, algo, capabilities, provider, active, key_id)
VALUES
  (gen_random_uuid(), 'uboard-ph', 'sS9upP2eWpFXpFMnVOzImkx57FSO1T6uYwjsB0oIJDI=', 'ed25519', ARRAY['sign']::text[], 'db', true, 'b12f6ea4fd9e5a9157a4532754ecc89a4c79ec548ed53eae6308ec074a082432'),
  (gen_random_uuid(), 'platform-cto-ph', '6arZ3pIrRlOaDqnnZ083shjbqM4bYcUnIVUzGw/ZTpM=', 'ed25519', ARRAY['sign']::text[], 'db', true, 'e9aad9de922b46539a0ea9e7674f37b218dba8ce1b61c5272155331b0fd94e93');