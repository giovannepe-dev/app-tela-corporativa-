
-- Add plan fields to companies table
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS plan_days integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan_starts_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan_ends_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- Create access_requests table for pending signups
CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text,
  email text NOT NULL,
  company_name text,
  phone text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all access requests
CREATE POLICY "Super admins can manage access requests"
  ON public.access_requests FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Users can view own request
CREATE POLICY "Users can view own access request"
  ON public.access_requests FOR SELECT
  USING (user_id = auth.uid());

-- Anyone authenticated can insert own request
CREATE POLICY "Users can insert own access request"
  ON public.access_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Update trigger for updated_at
CREATE TRIGGER update_access_requests_updated_at
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update onboard function to set pending status
CREATE OR REPLACE FUNCTION public.onboard_new_company(
  _user_id uuid, 
  _company_name text, 
  _company_slug text, 
  _trial_ends_at timestamptz, 
  _full_name text DEFAULT NULL, 
  _email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _company_id uuid;
BEGIN
  -- Create company with pending approval
  INSERT INTO public.companies (name, slug, trial_ends_at, plan_type, is_approved)
  VALUES (_company_name, _company_slug, _trial_ends_at, 'pending', false)
  RETURNING id INTO _company_id;

  -- Link profile
  UPDATE public.profiles SET company_id = _company_id WHERE user_id = _user_id;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (_user_id, _company_id, 'admin_empresa');

  -- Register as access request instead of trial lead
  INSERT INTO public.access_requests (user_id, full_name, email, company_name)
  VALUES (_user_id, _full_name, _email, _company_name);

  -- Still register trial lead for tracking
  INSERT INTO public.trial_leads (user_id, full_name, email, company_name, company_id, trial_ends_at)
  VALUES (_user_id, _full_name, _email, _company_name, _company_id, _trial_ends_at);

  RETURN _company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.onboard_new_company TO anon, authenticated;

-- Function to approve access and set plan
CREATE OR REPLACE FUNCTION public.approve_access_request(
  _request_id uuid,
  _plan_type text,
  _plan_days integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _req record;
  _company_id uuid;
  _plan_ends timestamptz;
BEGIN
  SELECT * INTO _req FROM public.access_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  -- Get user company
  SELECT company_id INTO _company_id FROM public.profiles WHERE user_id = _req.user_id;

  -- Calculate plan end date
  IF _plan_type = 'lifetime' THEN
    _plan_ends := NULL;
  ELSIF _plan_type = 'test' THEN
    _plan_ends := now() + interval '5 minutes';
  ELSE
    _plan_ends := now() + (_plan_days || ' days')::interval;
  END IF;

  -- Update company
  UPDATE public.companies 
  SET is_approved = true, 
      plan_type = _plan_type, 
      plan_days = _plan_days,
      plan_starts_at = now(), 
      plan_ends_at = _plan_ends,
      trial_ends_at = _plan_ends,
      is_active = true
  WHERE id = _company_id;

  -- Update request
  UPDATE public.access_requests 
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = _request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_access_request TO authenticated;
