CREATE POLICY "No direct access to pilot requests" ON public.pilot_requests
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);