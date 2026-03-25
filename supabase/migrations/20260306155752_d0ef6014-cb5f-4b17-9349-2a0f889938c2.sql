-- Allow anon and authenticated to execute onboard_new_company
GRANT EXECUTE ON FUNCTION public.onboard_new_company TO anon, authenticated;
