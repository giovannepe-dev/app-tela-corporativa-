
-- Playlists table
CREATE TABLE public.playlists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  schedule_start time,
  schedule_end time,
  schedule_days integer[] DEFAULT '{0,1,2,3,4,5,6}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Playlist items (each screen in the sequence)
CREATE TABLE public.playlist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  screen_id uuid NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
  duration_seconds integer NOT NULL DEFAULT 10,
  transition text NOT NULL DEFAULT 'fade',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_playlists_company ON public.playlists(company_id);
CREATE INDEX idx_playlist_items_playlist ON public.playlist_items(playlist_id);
CREATE INDEX idx_playlist_items_sort ON public.playlist_items(playlist_id, sort_order);

-- RLS
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can manage playlists"
ON public.playlists FOR ALL
USING (
  has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role)
  OR has_company_role(auth.uid(), company_id, 'editor_conteudo'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Users can view company playlists"
ON public.playlists FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Editors can manage playlist items"
ON public.playlist_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.playlists p
    WHERE p.id = playlist_items.playlist_id
    AND (
      has_company_role(auth.uid(), p.company_id, 'admin_empresa'::app_role)
      OR has_company_role(auth.uid(), p.company_id, 'editor_conteudo'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

CREATE POLICY "Users can view company playlist items"
ON public.playlist_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.playlists p
    WHERE p.id = playlist_items.playlist_id
    AND p.company_id = get_user_company_id(auth.uid())
  )
);

-- Updated_at trigger
CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for playlist items
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_items;
