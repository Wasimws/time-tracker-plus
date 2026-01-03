-- Temporarily disable the trigger that prevents last management user removal
DROP TRIGGER IF EXISTS prevent_last_management_removal_trigger ON public.user_roles;

-- Delete all data from tables (in correct order due to foreign keys)
DELETE FROM public.activity_log;
DELETE FROM public.time_entries;
DELETE FROM public.invitations;
DELETE FROM public.subscriptions;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM public.organizations;

-- Re-create the trigger
CREATE TRIGGER prevent_last_management_removal_trigger
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_management_removal();