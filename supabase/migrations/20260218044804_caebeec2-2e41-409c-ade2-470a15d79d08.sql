
-- ========================
-- ENUM TYPES
-- ========================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin_empresa', 'editor_conteudo', 'operador_fila', 'viewer');
CREATE TYPE public.device_status AS ENUM ('online', 'offline', 'pairing');
CREATE TYPE public.device_orientation AS ENUM ('landscape', 'portrait');

-- ========================
-- COMPANIES (TENANTS)
-- ========================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ========================
-- PROFILES (basic)
-- ========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========================
-- USER ROLES (separate table per security guidelines)
-- ========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ========================
-- UNITS (filiais)
-- ========================
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- ========================
-- DEVICES (TVs)
-- ========================
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  location TEXT,
  status device_status DEFAULT 'offline',
  orientation device_orientation DEFAULT 'landscape',
  resolution TEXT DEFAULT '1920x1080',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  tags TEXT[] DEFAULT '{}',
  pairing_code TEXT,
  pairing_expires_at TIMESTAMPTZ,
  device_token UUID DEFAULT gen_random_uuid(),
  last_seen TIMESTAMPTZ,
  player_version TEXT,
  cache_size_mb NUMERIC DEFAULT 0,
  active_playlist_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- ========================
-- DEVICE GROUPS
-- ========================
CREATE TABLE public.device_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.device_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.device_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.device_groups(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(group_id, device_id)
);
ALTER TABLE public.device_group_members ENABLE ROW LEVEL SECURITY;

-- ========================
-- AUDIT LOG
-- ========================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ========================
-- SECURITY DEFINER FUNCTIONS
-- ========================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_user_id UUID, _company_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND company_id = _company_id AND role = _role
  )
$$;

-- ========================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================
-- UPDATED_AT TRIGGER
-- ========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================
-- RLS POLICIES
-- ========================

-- COMPANIES: users can only see their own company
CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Super admins can manage all companies" ON public.companies
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- PROFILES: users see own profile + same company profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view company profiles" ON public.profiles
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- USER ROLES: viewable by same company admins
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Company admins can manage roles" ON public.user_roles
  FOR ALL USING (
    public.has_company_role(auth.uid(), company_id, 'admin_empresa')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- UNITS: scoped to company
CREATE POLICY "Users can view company units" ON public.units
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage units" ON public.units
  FOR ALL USING (
    public.has_company_role(auth.uid(), company_id, 'admin_empresa')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- DEVICES: scoped to company
CREATE POLICY "Users can view company devices" ON public.devices
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage devices" ON public.devices
  FOR ALL USING (
    public.has_company_role(auth.uid(), company_id, 'admin_empresa')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- DEVICE GROUPS: scoped to company
CREATE POLICY "Users can view company device groups" ON public.device_groups
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage device groups" ON public.device_groups
  FOR ALL USING (
    public.has_company_role(auth.uid(), company_id, 'admin_empresa')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- DEVICE GROUP MEMBERS
CREATE POLICY "Users can view group members" ON public.device_group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.device_groups dg
      WHERE dg.id = group_id AND dg.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Admins can manage group members" ON public.device_group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.device_groups dg
      WHERE dg.id = group_id AND (
        public.has_company_role(auth.uid(), dg.company_id, 'admin_empresa')
        OR public.has_role(auth.uid(), 'super_admin')
      )
    )
  );

-- AUDIT LOGS: viewable by company admins
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_company_role(auth.uid(), company_id, 'admin_empresa')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ========================
-- REALTIME
-- ========================
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
