-- Allow management to update user roles (but not their own)
CREATE POLICY "Management can update user roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'management') AND user_id != auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'management') AND user_id != auth.uid());

-- Allow management to insert new roles
CREATE POLICY "Management can insert user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'management') AND user_id != auth.uid());

-- Allow management to delete user roles
CREATE POLICY "Management can delete user roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'management') AND user_id != auth.uid());