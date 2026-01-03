-- Add is_org_creator column to user_roles to track organization creators
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_org_creator boolean DEFAULT false;

-- Create function to check if user is organization creator
CREATE OR REPLACE FUNCTION public.is_org_creator(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND is_org_creator = true
  )
$$;

-- Create function to get the creator user_id for an organization
CREATE OR REPLACE FUNCTION public.get_org_creator_id(_org_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.user_roles
  WHERE organization_id = _org_id
    AND is_org_creator = true
  LIMIT 1
$$;

-- Drop and recreate the trigger function to include creator protection
CREATE OR REPLACE FUNCTION public.prevent_last_management_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if trying to modify/delete organization creator
  IF OLD.is_org_creator = true THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Nie można usunąć twórcy organizacji. Twórca firmy jest chroniony.';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.role != 'management' OR NEW.is_org_creator = false) THEN
      RAISE EXCEPTION 'Nie można zdegradować ani usunąć ochrony twórcy organizacji. Twórca firmy musi pozostać administratorem.';
    END IF;
  END IF;

  -- Check if removing last management user
  IF OLD.role = 'management' AND (TG_OP = 'DELETE' OR NEW.role != 'management') THEN
    IF public.count_management_users_in_org(OLD.organization_id) <= 1 THEN
      RAISE EXCEPTION 'Nie można usunąć ostatniego administratora. Organizacja musi mieć co najmniej jednego użytkownika z rolą Zarząd.';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS prevent_last_management_removal_trigger ON public.user_roles;
CREATE TRIGGER prevent_last_management_removal_trigger
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_management_removal();