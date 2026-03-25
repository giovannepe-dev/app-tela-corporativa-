
-- Fix units policies: drop restrictive, recreate as permissive
DROP POLICY IF EXISTS "Users can view company units" ON public.units;
DROP POLICY IF EXISTS "Admins can manage units" ON public.units;

CREATE POLICY "Users can view company units" ON public.units
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage units" ON public.units
  FOR ALL TO authenticated
  USING (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix companies policies
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Super admins can manage all companies" ON public.companies;

CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT TO authenticated
  USING (id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update own company" ON public.companies
  FOR UPDATE TO authenticated
  USING (has_company_role(auth.uid(), id, 'admin_empresa'::app_role))
  WITH CHECK (has_company_role(auth.uid(), id, 'admin_empresa'::app_role));

CREATE POLICY "Super admins can manage all companies" ON public.companies
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Fix devices policies
DROP POLICY IF EXISTS "Users can view company devices" ON public.devices;
DROP POLICY IF EXISTS "Admins can manage devices" ON public.devices;
DROP POLICY IF EXISTS "Devices in pairing can be read by service role" ON public.devices;

CREATE POLICY "Users can view company devices" ON public.devices
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage devices" ON public.devices
  FOR ALL TO authenticated
  USING (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Devices in pairing can be read" ON public.devices
  FOR SELECT
  USING (status = 'pairing'::device_status);

-- Fix screens policies
DROP POLICY IF EXISTS "Users can view company screens" ON public.screens;
DROP POLICY IF EXISTS "Editors can manage screens" ON public.screens;

CREATE POLICY "Users can view company screens" ON public.screens
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR is_template = true);

CREATE POLICY "Editors can manage screens" ON public.screens
  FOR ALL TO authenticated
  USING (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_company_role(auth.uid(), company_id, 'editor_conteudo'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_company_role(auth.uid(), company_id, 'editor_conteudo'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix playlists policies
DROP POLICY IF EXISTS "Users can view company playlists" ON public.playlists;
DROP POLICY IF EXISTS "Editors can manage playlists" ON public.playlists;

CREATE POLICY "Users can view company playlists" ON public.playlists
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Editors can manage playlists" ON public.playlists
  FOR ALL TO authenticated
  USING (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_company_role(auth.uid(), company_id, 'editor_conteudo'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_company_role(auth.uid(), company_id, 'editor_conteudo'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix playlist_items policies
DROP POLICY IF EXISTS "Users can view company playlist items" ON public.playlist_items;
DROP POLICY IF EXISTS "Editors can manage playlist items" ON public.playlist_items;

CREATE POLICY "Users can view company playlist items" ON public.playlist_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM playlists p WHERE p.id = playlist_items.playlist_id AND p.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Editors can manage playlist items" ON public.playlist_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM playlists p WHERE p.id = playlist_items.playlist_id AND (has_company_role(auth.uid(), p.company_id, 'admin_empresa'::app_role) OR has_company_role(auth.uid(), p.company_id, 'editor_conteudo'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM playlists p WHERE p.id = playlist_items.playlist_id AND (has_company_role(auth.uid(), p.company_id, 'admin_empresa'::app_role) OR has_company_role(auth.uid(), p.company_id, 'editor_conteudo'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))));

-- Fix media_files policies
DROP POLICY IF EXISTS "Users can view company media" ON public.media_files;
DROP POLICY IF EXISTS "Editors can manage media" ON public.media_files;

CREATE POLICY "Users can view company media" ON public.media_files
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Editors can manage media" ON public.media_files
  FOR ALL TO authenticated
  USING (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_company_role(auth.uid(), company_id, 'editor_conteudo'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_company_role(auth.uid(), company_id, 'editor_conteudo'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix queues policies
DROP POLICY IF EXISTS "Users can view company queues" ON public.queues;
DROP POLICY IF EXISTS "Admins can manage queues" ON public.queues;

CREATE POLICY "Users can view company queues" ON public.queues
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage queues" ON public.queues
  FOR ALL TO authenticated
  USING (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix counters policies
DROP POLICY IF EXISTS "Users can view company counters" ON public.counters;
DROP POLICY IF EXISTS "Admins can manage counters" ON public.counters;

CREATE POLICY "Users can view company counters" ON public.counters
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage counters" ON public.counters
  FOR ALL TO authenticated
  USING (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix tickets policies
DROP POLICY IF EXISTS "Users can view company tickets" ON public.tickets;
DROP POLICY IF EXISTS "Operators can manage tickets" ON public.tickets;

CREATE POLICY "Users can view company tickets" ON public.tickets
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Operators can manage tickets" ON public.tickets
  FOR ALL TO authenticated
  USING (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_company_role(auth.uid(), company_id, 'operador_fila'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_company_role(auth.uid(), company_id, 'operador_fila'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view company profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Fix user_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Company admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Company admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix audit_logs policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix ticket_events policies
DROP POLICY IF EXISTS "Users can view company ticket events" ON public.ticket_events;
DROP POLICY IF EXISTS "Operators can insert ticket events" ON public.ticket_events;

CREATE POLICY "Users can view company ticket events" ON public.ticket_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_events.ticket_id AND t.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Operators can insert ticket events" ON public.ticket_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix screen_versions policies
DROP POLICY IF EXISTS "Users can view screen versions" ON public.screen_versions;
DROP POLICY IF EXISTS "Editors can insert screen versions" ON public.screen_versions;

CREATE POLICY "Users can view screen versions" ON public.screen_versions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM screens s WHERE s.id = screen_versions.screen_id AND s.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Editors can insert screen versions" ON public.screen_versions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix trial_leads policies
DROP POLICY IF EXISTS "Users can view own lead" ON public.trial_leads;
DROP POLICY IF EXISTS "Super admins can manage all trial leads" ON public.trial_leads;
DROP POLICY IF EXISTS "Company admins can view company leads" ON public.trial_leads;
DROP POLICY IF EXISTS "Authenticated users can insert own lead" ON public.trial_leads;

CREATE POLICY "Users can view own lead" ON public.trial_leads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all trial leads" ON public.trial_leads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Company admins can view company leads" ON public.trial_leads
  FOR SELECT TO authenticated
  USING (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role));

CREATE POLICY "Authenticated users can insert own lead" ON public.trial_leads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix device_groups policies
DROP POLICY IF EXISTS "Users can view company device groups" ON public.device_groups;
DROP POLICY IF EXISTS "Admins can manage device groups" ON public.device_groups;

CREATE POLICY "Users can view company device groups" ON public.device_groups
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage device groups" ON public.device_groups
  FOR ALL TO authenticated
  USING (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_company_role(auth.uid(), company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix device_group_members policies
DROP POLICY IF EXISTS "Users can view group members" ON public.device_group_members;
DROP POLICY IF EXISTS "Admins can manage group members" ON public.device_group_members;

CREATE POLICY "Users can view group members" ON public.device_group_members
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM device_groups dg WHERE dg.id = device_group_members.group_id AND dg.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "Admins can manage group members" ON public.device_group_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM device_groups dg WHERE dg.id = device_group_members.group_id AND (has_company_role(auth.uid(), dg.company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM device_groups dg WHERE dg.id = device_group_members.group_id AND (has_company_role(auth.uid(), dg.company_id, 'admin_empresa'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))));

-- Fix queue_daily_sequences policies
DROP POLICY IF EXISTS "Users can view sequences" ON public.queue_daily_sequences;
DROP POLICY IF EXISTS "System can manage sequences" ON public.queue_daily_sequences;

CREATE POLICY "Users can view sequences" ON public.queue_daily_sequences
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM queues q WHERE q.id = queue_daily_sequences.queue_id AND q.company_id = get_user_company_id(auth.uid())));

CREATE POLICY "System can manage sequences" ON public.queue_daily_sequences
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
