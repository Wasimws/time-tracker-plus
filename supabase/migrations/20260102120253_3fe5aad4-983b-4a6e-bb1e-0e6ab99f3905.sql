-- Update handle_new_user trigger to NOT create subscription per user
-- Subscription is created at organization level by edge function

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  assigned_role app_role;
BEGIN
  -- Check if this is the owner email
  IF public.is_owner_email(NEW.email) THEN
    assigned_role := 'management';
  ELSE
    assigned_role := 'employee';
  END IF;

  -- Create profile (without organization - will be assigned via edge function)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  
  -- Assign role (without organization - will be updated via edge function)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  -- DO NOT create subscription here - it's created per organization in edge function
  
  RETURN NEW;
END;
$$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();