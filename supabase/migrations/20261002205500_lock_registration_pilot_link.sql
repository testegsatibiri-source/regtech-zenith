-- The pilot link is qualification evidence and must only be attached by the trusted conversion workflow.
REVOKE INSERT (source_pilot_request_id) ON public.registration_requests FROM authenticated;