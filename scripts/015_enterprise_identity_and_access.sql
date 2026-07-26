-- Bankable OS production identity and access foundation.
-- Depends on 001_create_fundready_schema.sql and 010_v1.8_tenants_and_baseline.sql.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (
    role IN (
      'owner',
      'firm_admin',
      'advisor',
      'loan_packager',
      'accountant',
      'business_owner',
      'lender_reviewer',
      'bankable_admin'
    )
  ),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.client_access (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_profile_id uuid NOT NULL
    REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_read boolean NOT NULL DEFAULT true,
  can_write boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_profile_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_profile_id uuid REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (
    role IN (
      'firm_admin',
      'advisor',
      'loan_packager',
      'accountant',
      'business_owner',
      'lender_reviewer'
    )
  ),
  token_digest text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user
  ON public.tenant_memberships (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_access_user
  ON public.client_access (user_id, tenant_id, business_profile_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_pending
  ON public.tenant_invitations (tenant_id, status, expires_at);

CREATE OR REPLACE FUNCTION private.has_tenant_role(
  requested_tenant_id uuid,
  allowed_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.tenant_memberships membership
      WHERE membership.tenant_id = requested_tenant_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.status = 'active'
        AND membership.role = ANY(allowed_roles)
    )
$$;

CREATE OR REPLACE FUNCTION private.has_client_permission(
  requested_business_profile_id uuid,
  requested_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.client_access access
      WHERE access.business_profile_id = requested_business_profile_id
        AND access.user_id = (SELECT auth.uid())
        AND CASE requested_permission
          WHEN 'read' THEN access.can_read
          WHEN 'write' THEN access.can_write
          WHEN 'approve' THEN access.can_approve
          ELSE false
        END
    )
$$;

REVOKE ALL ON FUNCTION private.has_tenant_role(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_client_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_tenant_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_client_permission(uuid, text) TO authenticated;

ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_memberships_self_read
  ON public.tenant_memberships FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY tenant_memberships_admin_manage
  ON public.tenant_memberships FOR ALL TO authenticated
  USING (
    private.has_tenant_role(
      tenant_id,
      ARRAY['owner', 'firm_admin', 'bankable_admin']
    )
  )
  WITH CHECK (
    private.has_tenant_role(
      tenant_id,
      ARRAY['owner', 'firm_admin', 'bankable_admin']
    )
  );

CREATE POLICY client_access_self_read
  ON public.client_access FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY client_access_admin_manage
  ON public.client_access FOR ALL TO authenticated
  USING (
    private.has_tenant_role(
      tenant_id,
      ARRAY['owner', 'firm_admin', 'bankable_admin']
    )
  )
  WITH CHECK (
    private.has_tenant_role(
      tenant_id,
      ARRAY['owner', 'firm_admin', 'bankable_admin']
    )
  );

CREATE POLICY tenant_invitations_admin_manage
  ON public.tenant_invitations FOR ALL TO authenticated
  USING (
    private.has_tenant_role(
      tenant_id,
      ARRAY['owner', 'firm_admin', 'bankable_admin']
    )
  )
  WITH CHECK (
    private.has_tenant_role(
      tenant_id,
      ARRAY['owner', 'firm_admin', 'bankable_admin']
    )
  );

CREATE POLICY business_profiles_assigned_read
  ON public.business_profiles FOR SELECT TO authenticated
  USING (private.has_client_permission(id, 'read'));

CREATE POLICY business_profiles_assigned_update
  ON public.business_profiles FOR UPDATE TO authenticated
  USING (private.has_client_permission(id, 'write'))
  WITH CHECK (private.has_client_permission(id, 'write'));

GRANT SELECT ON public.tenant_memberships, public.client_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_invitations TO authenticated;

COMMENT ON TABLE public.tenant_memberships IS
  'Authoritative enterprise roles. Never derive authorization from editable user metadata.';
COMMENT ON TABLE public.client_access IS
  'Explicit client-level read, write, and approval assignments.';

