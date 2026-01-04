-- Block anonymous access to contact_messages table
CREATE POLICY "Block anonymous access to contact_messages"
ON public.contact_messages
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Also block anonymous INSERT to prevent spam
CREATE POLICY "Block anonymous insert to contact_messages"
ON public.contact_messages
AS RESTRICTIVE
FOR INSERT
TO anon
WITH CHECK (false);