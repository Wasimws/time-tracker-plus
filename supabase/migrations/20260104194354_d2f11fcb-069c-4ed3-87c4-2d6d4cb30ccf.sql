-- Fix security: Deny anonymous access to profiles table
-- The issue is that RESTRICTIVE policies only restrict logged-in users
-- We need to ensure anonymous users cannot read profiles

-- First, drop any permissive policies that might allow anonymous access
-- Then add explicit deny for anonymous users

-- Create a function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- Add policy to block anonymous SELECT on profiles
-- This uses PERMISSIVE = false (restrictive) to deny when not authenticated
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Add policy to block anonymous SELECT on invitations  
CREATE POLICY "Block anonymous access to invitations"
ON public.invitations
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Add policy to block anonymous SELECT on user_roles
CREATE POLICY "Block anonymous access to user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Add policy to block anonymous SELECT on organizations
CREATE POLICY "Block anonymous access to organizations"
ON public.organizations
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Add policy to block anonymous SELECT on subscriptions
CREATE POLICY "Block anonymous access to subscriptions"
ON public.subscriptions
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Add policy to block anonymous SELECT on activity_log
CREATE POLICY "Block anonymous access to activity_log"
ON public.activity_log
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Add policy to block anonymous SELECT on time_entries
CREATE POLICY "Block anonymous access to time_entries"
ON public.time_entries
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Add policy to block anonymous SELECT on system_config
CREATE POLICY "Block anonymous access to system_config"
ON public.system_config
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);