
-- Tabela para rastrear leads de trial
CREATE TABLE public.trial_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text,
  email text NOT NULL,
  company_name text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  phone text,
  trial_starts_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '1 day'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted', 'contacted')),
  notes text,
  contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_leads ENABLE ROW LEVEL SECURITY;

-- Super admins can see all leads
CREATE POLICY "Super admins can manage all trial leads"
  ON public.trial_leads FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Company admins can view their company leads
CREATE POLICY "Company admins can view company leads"
  ON public.trial_leads FOR SELECT
  USING (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role));

-- Users can view own lead
CREATE POLICY "Users can view own lead"
  ON public.trial_leads FOR SELECT
  USING (user_id = auth.uid());

-- System can insert leads (on signup)
CREATE POLICY "Authenticated users can insert own lead"
  ON public.trial_leads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_trial_leads_updated_at
  BEFORE UPDATE ON public.trial_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for trial_leads so dashboard updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.trial_leads;
