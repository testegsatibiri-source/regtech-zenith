UPDATE public.pack_signing_keys
SET active = false, revoked_at = now()
WHERE publisher IN ('uboard-ph', 'platform-cto-ph') AND active = true;

INSERT INTO public.pack_signing_keys (id, publisher, public_key, algo, capabilities, provider, active, key_id)
VALUES (gen_random_uuid(), 'uboard-ph', 'QVHppX5u5kpc4FEQcEGeY8zM5sGTuwMgMd4ZYhtrqnk=', 'ed25519', ARRAY['sign']::text[], 'db', true, '4151e9a57e6ee64a5ce0511070419e63cccce6c193bb032031de19621b6baa79');

INSERT INTO public.pack_signing_keys (id, publisher, public_key, algo, capabilities, provider, active, key_id)
VALUES (gen_random_uuid(), 'platform-cto-ph', 'GkQRiMhSqpWgqHhWMAcM7RiNALpRzL/AdpAgjs76TqA=', 'ed25519', ARRAY['sign']::text[], 'db', true, '1a441188c852aa95a0a8785630070ced188d00ba51ccbfc07690208ecefa4ea0');