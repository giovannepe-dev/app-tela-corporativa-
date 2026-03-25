
-- ========================
-- ENUM TYPES FOR QUEUE
-- ========================
CREATE TYPE public.ticket_type AS ENUM ('normal', 'preferencial', 'prioridade_especial', 'emergencia');
CREATE TYPE public.ticket_status AS ENUM ('waiting', 'called', 'serving', 'completed', 'skipped', 'redirected');

-- ========================
-- QUEUES (filas por unidade)
-- ========================
CREATE TABLE public.queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL DEFAULT 'A',
  is_active BOOLEAN DEFAULT true,
  priority_mode TEXT DEFAULT 'preferencial_first',
  alternation_ratio INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_queues_updated_at BEFORE UPDATE ON public.queues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================
-- COUNTERS (guichês)
-- ========================
CREATE TABLE public.counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  number INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  current_operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_counters_updated_at BEFORE UPDATE ON public.counters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================
-- TICKETS (senhas)
-- ========================
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  queue_id UUID REFERENCES public.queues(id) ON DELETE CASCADE NOT NULL,
  counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL,
  ticket_number TEXT NOT NULL,
  ticket_type ticket_type NOT NULL DEFAULT 'normal',
  status ticket_status NOT NULL DEFAULT 'waiting',
  called_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  called_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_tickets_unit_status ON public.tickets (unit_id, status, created_at);
CREATE INDEX idx_tickets_queue_status ON public.tickets (queue_id, status, created_at);

-- ========================
-- TICKET EVENTS (histórico de ações)
-- ========================
CREATE TABLE public.ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;

-- ========================
-- SEQUENCE COUNTER (auto-increment per queue per day)
-- ========================
CREATE TABLE public.queue_daily_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES public.queues(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_number INTEGER NOT NULL DEFAULT 0,
  UNIQUE(queue_id, date)
);
ALTER TABLE public.queue_daily_sequences ENABLE ROW LEVEL SECURITY;

-- Function to get next ticket number
CREATE OR REPLACE FUNCTION public.get_next_ticket_number(_queue_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prefix TEXT;
  _next_num INTEGER;
BEGIN
  SELECT prefix INTO _prefix FROM public.queues WHERE id = _queue_id;
  
  INSERT INTO public.queue_daily_sequences (queue_id, date, last_number)
  VALUES (_queue_id, CURRENT_DATE, 1)
  ON CONFLICT (queue_id, date) 
  DO UPDATE SET last_number = queue_daily_sequences.last_number + 1
  RETURNING last_number INTO _next_num;
  
  RETURN _prefix || '-' || LPAD(_next_num::TEXT, 3, '0');
END;
$$;

-- ========================
-- RLS POLICIES
-- ========================

-- QUEUES
CREATE POLICY "Users can view company queues" ON public.queues
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage queues" ON public.queues
  FOR ALL USING (
    public.has_company_role(auth.uid(), company_id, 'admin_empresa')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- COUNTERS
CREATE POLICY "Users can view company counters" ON public.counters
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage counters" ON public.counters
  FOR ALL USING (
    public.has_company_role(auth.uid(), company_id, 'admin_empresa')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- TICKETS
CREATE POLICY "Users can view company tickets" ON public.tickets
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Operators can manage tickets" ON public.tickets
  FOR ALL USING (
    public.has_company_role(auth.uid(), company_id, 'admin_empresa')
    OR public.has_company_role(auth.uid(), company_id, 'operador_fila')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- TICKET EVENTS
CREATE POLICY "Users can view company ticket events" ON public.ticket_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id AND t.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Operators can insert ticket events" ON public.ticket_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- QUEUE DAILY SEQUENCES
CREATE POLICY "Users can view sequences" ON public.queue_daily_sequences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.queues q
      WHERE q.id = queue_id AND q.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "System can manage sequences" ON public.queue_daily_sequences
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ========================
-- REALTIME
-- ========================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
