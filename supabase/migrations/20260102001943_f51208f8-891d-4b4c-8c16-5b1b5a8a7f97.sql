-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add organization_id to profiles
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system'));

-- Add organization_id to time_entries
ALTER TABLE public.time_entries ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to subscriptions (subscription per organization, not per user)
ALTER TABLE public.subscriptions ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to user_roles
ALTER TABLE public.user_roles ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create activity log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

-- Function to check if user belongs to organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND organization_id = _org_id
  )
$$;

-- Function to check if user has role in their organization
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.id AND ur.organization_id = p.organization_id
    WHERE ur.user_id = _user_id AND ur.role = _role
  )
$$;

-- Organizations RLS policies
CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_organization_id(auth.uid()));

-- Drop old profiles policies and create new ones
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Management can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Management can view org profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_org_role(auth.uid(), 'management') AND 
    organization_id = public.get_user_organization_id(auth.uid())
  );

-- Drop old user_roles policies and create new ones
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Management can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Management can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Management can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Management can delete user roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Management can view org roles"
  ON public.user_roles FOR SELECT
  USING (
    public.has_org_role(auth.uid(), 'management') AND 
    organization_id = public.get_user_organization_id(auth.uid())
  );

CREATE POLICY "Management can update org user roles"
  ON public.user_roles FOR UPDATE
  USING (
    public.has_org_role(auth.uid(), 'management') AND 
    organization_id = public.get_user_organization_id(auth.uid()) AND
    user_id != auth.uid()
  )
  WITH CHECK (
    public.has_org_role(auth.uid(), 'management') AND 
    organization_id = public.get_user_organization_id(auth.uid()) AND
    user_id != auth.uid()
  );

-- Drop old time_entries policies and create new ones
DROP POLICY IF EXISTS "Users can view their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Management can view all time entries" ON public.time_entries;

CREATE POLICY "Users can view their own time entries"
  ON public.time_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid() AND organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update their own time entries"
  ON public.time_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own time entries"
  ON public.time_entries FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Management can view org time entries"
  ON public.time_entries FOR SELECT
  USING (
    public.has_org_role(auth.uid(), 'management') AND 
    organization_id = public.get_user_organization_id(auth.uid())
  );

-- Drop old subscriptions policies and create new ones
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

CREATE POLICY "Users can view org subscription"
  ON public.subscriptions FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Management can update org subscription"
  ON public.subscriptions FOR UPDATE
  USING (
    public.has_org_role(auth.uid(), 'management') AND 
    organization_id = public.get_user_organization_id(auth.uid())
  );

-- Activity log RLS policies
CREATE POLICY "Management can view org activity log"
  ON public.activity_log FOR SELECT
  USING (
    public.has_org_role(auth.uid(), 'management') AND 
    organization_id = public.get_user_organization_id(auth.uid())
  );

CREATE POLICY "Users can insert activity log for their org"
  ON public.activity_log FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- Function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  _action_type TEXT,
  _description TEXT,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
  _log_id UUID;
BEGIN
  SELECT organization_id INTO _org_id FROM public.profiles WHERE id = auth.uid();
  
  IF _org_id IS NOT NULL THEN
    INSERT INTO public.activity_log (organization_id, user_id, action_type, description, metadata)
    VALUES (_org_id, auth.uid(), _action_type, _description, _metadata)
    RETURNING id INTO _log_id;
  END IF;
  
  RETURN _log_id;
END;
$$;

-- Update count_management_users to be org-scoped
CREATE OR REPLACE FUNCTION public.count_management_users_in_org(_org_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_roles
  WHERE role = 'management' AND organization_id = _org_id
$$;

-- Update prevent_last_management_removal to be org-scoped
CREATE OR REPLACE FUNCTION public.prevent_last_management_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'management' AND (TG_OP = 'DELETE' OR NEW.role != 'management') THEN
    IF public.count_management_users_in_org(OLD.organization_id) <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last management user in organization. Organization must have at least one administrator.';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_time_entries_organization_id ON public.time_entries(organization_id);
CREATE INDEX idx_user_roles_organization_id ON public.user_roles(organization_id);
CREATE INDEX idx_activity_log_organization_id ON public.activity_log(organization_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);