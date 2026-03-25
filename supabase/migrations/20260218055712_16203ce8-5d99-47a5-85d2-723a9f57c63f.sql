-- Insert placeholder company for unpaired devices (ignore if exists)
INSERT INTO public.companies (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000000', 'UNPAIRED', 'unpaired')
ON CONFLICT (id) DO NOTHING;

-- Allow devices with pairing status to be read by anyone (for realtime pairing)
CREATE POLICY "Devices in pairing can be read by service role"
ON public.devices
FOR SELECT
USING (status = 'pairing'::device_status);
