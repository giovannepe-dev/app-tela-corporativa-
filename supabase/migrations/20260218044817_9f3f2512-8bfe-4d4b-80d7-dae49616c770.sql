
-- Fix permissive INSERT policies
DROP POLICY "System can insert profiles" ON public.profiles;
CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
