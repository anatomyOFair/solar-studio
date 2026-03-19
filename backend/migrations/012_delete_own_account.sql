-- Self-service account deletion (GDPR compliance)
-- Callable via supabase.rpc('delete_own_account') from the client
-- FK cascades on user_reports and observation_log handle data cleanup.
-- interaction_logs uses ON DELETE SET NULL to preserve anonymised analytics.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM auth.users WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
