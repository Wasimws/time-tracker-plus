-- Create system config table for storing owner email
CREATE TABLE public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Only management can view config
CREATE POLICY "Management can view system config"
  ON public.system_config FOR SELECT
  USING (public.has_role(auth.uid(), 'management'));

-- No one can modify config through client (only via migrations/admin)
-- Config is read-only from client perspective

-- Insert default owner email placeholder (will be updated via edge function)
INSERT INTO public.system_config (key, value) VALUES ('owner_email', '');

-- Function to check if email is owner email
CREATE OR REPLACE FUNCTION public.is_owner_email(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.system_config
    WHERE key = 'owner_email'
      AND value != ''
      AND LOWER(value) = LOWER(_email)
  )
$$;

-- Update handle_new_user to assign management role to owner
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  -- Create trial subscription
  INSERT INTO public.subscriptions (user_id, status)
  VALUES (NEW.id, 'trial');
  
  RETURN NEW;
END;
$$;

-- Function to count management users
CREATE OR REPLACE FUNCTION public.count_management_users()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_roles
  WHERE role = 'management'
$$;

-- Trigger to prevent removing last management user
CREATE OR REPLACE FUNCTION public.prevent_last_management_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If changing from management to something else
  IF OLD.role = 'management' AND (TG_OP = 'DELETE' OR NEW.role != 'management') THEN
    -- Check if this would leave no management users
    IF public.count_management_users() <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last management user. System must have at least one administrator.';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER prevent_last_management_removal_trigger
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_management_removal();

-- Add trigger for updated_at on system_config
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();