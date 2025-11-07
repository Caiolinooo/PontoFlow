-- Fix for 500 error on /admin/users page
-- RLS Policy fix for tenant_user_roles table to prevent circular dependency

-- Drop the existing problematic policy
DROP POLICY IF EXISTS tenant_user_roles_admin_access ON public.tenant_user_roles;

-- Create a new, more permissive policy that allows users to see roles within their own tenant
CREATE POLICY tenant_user_roles_admin_access ON public.tenant_user_roles
  FOR ALL USING (
    -- Allow access if the current user is an admin in the same tenant
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = tenant_user_roles.tenant_id 
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL', 'ADMIN')
        AND tur.user_id = auth.uid()
    )
    OR
    -- Allow service role access (bypasses RLS)
    current_setting('request.jwt.claim.role') = 'service_role'
  );

-- Also update the own_select policy to be more permissive
DROP POLICY IF EXISTS tenant_user_roles_own_select ON public.tenant_user_roles;
CREATE POLICY tenant_user_roles_own_select ON public.tenant_user_roles
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    -- Allow admins to see all roles in their tenant
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = tenant_user_roles.tenant_id 
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL', 'ADMIN')
        AND tur.user_id = auth.uid()
    )
  );