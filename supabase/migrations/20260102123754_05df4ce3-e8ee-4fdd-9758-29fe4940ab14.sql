-- Add trial fields to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS trial_start_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_end_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '3 days');

-- Create invitations table for employee invites
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Management can view their organization's invitations
CREATE POLICY "Management can view org invitations"
ON public.invitations
FOR SELECT
USING (
  has_org_role(auth.uid(), 'management'::app_role) 
  AND organization_id = get_user_organization_id(auth.uid())
);

-- Management can insert invitations for their org
CREATE POLICY "Management can create org invitations"
ON public.invitations
FOR INSERT
WITH CHECK (
  has_org_role(auth.uid(), 'management'::app_role) 
  AND organization_id = get_user_organization_id(auth.uid())
);

-- Management can update invitations in their org (for cancellation)
CREATE POLICY "Management can update org invitations"
ON public.invitations
FOR UPDATE
USING (
  has_org_role(auth.uid(), 'management'::app_role) 
  AND organization_id = get_user_organization_id(auth.uid())
);

-- Create function to check if organization trial is active
CREATE OR REPLACE FUNCTION public.is_org_trial_active(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id
      AND trial_end_at > now()
  )
$$;

-- Create function to check if organization has access (trial OR active subscription)
CREATE OR REPLACE FUNCTION public.has_org_access(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = _org_id
      AND (
        o.trial_end_at > now()
        OR EXISTS (
          SELECT 1 FROM public.subscriptions s
          WHERE s.organization_id = _org_id
            AND s.status = 'active'
        )
      )
  )
$$;

-- Update existing organizations with trial dates (3 days from created_at)
UPDATE public.organizations
SET trial_start_at = created_at,
    trial_end_at = created_at + INTERVAL '3 days'
WHERE trial_start_at IS NULL;