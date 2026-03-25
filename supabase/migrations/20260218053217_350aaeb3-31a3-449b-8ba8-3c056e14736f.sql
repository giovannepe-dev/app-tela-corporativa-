
-- Media library table
CREATE TABLE public.media_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  file_size BIGINT DEFAULT 0,
  folder TEXT DEFAULT '/',
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company media" ON public.media_files
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Editors can manage media" ON public.media_files
  FOR ALL USING (
    has_company_role(auth.uid(), company_id, 'admin_empresa') OR
    has_company_role(auth.uid(), company_id, 'editor_conteudo') OR
    has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER update_media_files_updated_at
  BEFORE UPDATE ON public.media_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for media
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);

CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can delete media" ON storage.objects
  FOR DELETE USING (bucket_id = 'media' AND auth.uid() IS NOT NULL);
