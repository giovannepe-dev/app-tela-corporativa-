
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
  -- Create company
  INSERT INTO public.companies (name, slug, trial_ends_at)
  VALUES (_company_name, _company_slug, _trial_ends_at)
  RETURNING id INTO _company_id;

  -- Link profile to company
  UPDATE public.profiles
  SET company_id = _company_id
  WHERE user_id = _user_id;

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (_user_id, _company_id, 'admin_empresa');

  -- Register trial lead
  INSERT INTO public.trial_leads (user_id, full_name, email, company_name, company_id, trial_ends_at)
  VALUES (_user_id, _full_name, _email, _company_name, _company_id, _trial_ends_at);

  RETURN _company_id;
END;
$$;
