
-- ========================
-- SCREENS (telas com layout_json)
-- ========================
CREATE TABLE public.screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  orientation TEXT DEFAULT 'landscape',
  layout_json JSONB NOT NULL DEFAULT '{"widgets":[]}',
  background_color TEXT DEFAULT '#0a0e1a',
  is_template BOOLEAN DEFAULT false,
  template_category TEXT,
  status TEXT DEFAULT 'draft',
  thumbnail_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_screens_updated_at BEFORE UPDATE ON public.screens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================
-- SCREEN VERSIONS (histórico)
-- ========================
CREATE TABLE public.screen_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID REFERENCES public.screens(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  layout_json JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.screen_versions ENABLE ROW LEVEL SECURITY;

-- ========================
-- RLS POLICIES
-- ========================
CREATE POLICY "Users can view company screens" ON public.screens
  FOR SELECT USING (
    company_id = public.get_user_company_id(auth.uid())
    OR is_template = true
  );

CREATE POLICY "Editors can manage screens" ON public.screens
  FOR ALL USING (
    public.has_company_role(auth.uid(), company_id, 'admin_empresa')
    OR public.has_company_role(auth.uid(), company_id, 'editor_conteudo')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Users can view screen versions" ON public.screen_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.screens s
      WHERE s.id = screen_id AND s.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Editors can insert screen versions" ON public.screen_versions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
