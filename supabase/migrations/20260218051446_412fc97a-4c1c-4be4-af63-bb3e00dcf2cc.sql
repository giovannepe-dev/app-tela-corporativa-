
-- Add active_screen_id to devices
ALTER TABLE public.devices ADD COLUMN active_screen_id uuid REFERENCES public.screens(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_devices_active_screen ON public.devices(active_screen_id);
CREATE INDEX idx_devices_device_token ON public.devices(device_token);
