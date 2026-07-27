-- Creates each new user's authoritative workspace and keeps the first
-- business profile mapped to that workspace automatically.

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_tenant_type_check;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_tenant_type_check CHECK (
    tenant_type IN (
      'platform',
      'business',
      'advisor_org',
      'edo_partner',
      'lender_partner',
      'demo'
    )
  );

CREATE OR REPLACE FUNCTION private.bootstrap_bankable_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_tenant_id uuid := gen_random_uuid();
  display_name text;
BEGIN
  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, 'Bankable User'), '@', 1)
  );

  INSERT INTO public.tenants (
    id, slug, display_name, tenant_type, status, created_at, updated_at
  )
  VALUES (
    new_tenant_id,
    'business-' || replace(new.id::text, '-', ''),
    display_name || '''s workspace',
    'business',
    'active',
    now(),
    now()
  );

  INSERT INTO public.tenant_memberships (
    tenant_id, user_id, role, status
  )
  VALUES (new_tenant_id, new.id, 'owner', 'active');

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION private.bootstrap_bankable_identity() FROM PUBLIC;

DROP TRIGGER IF EXISTS bankable_identity_bootstrap ON auth.users;
CREATE TRIGGER bankable_identity_bootstrap
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.bootstrap_bankable_identity();

CREATE OR REPLACE FUNCTION private.assign_business_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF new.user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'A business profile can only be created for the signed-in user.';
  END IF;

  SELECT membership.tenant_id
  INTO new.tenant_id
  FROM public.tenant_memberships membership
  WHERE membership.user_id = (SELECT auth.uid())
    AND membership.status = 'active'
    AND membership.role IN ('owner', 'business_owner')
  ORDER BY membership.created_at
  LIMIT 1;

  IF new.tenant_id IS NULL THEN
    RAISE EXCEPTION 'No active Bankable workspace exists for this user.';
  END IF;
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION private.assign_business_tenant() FROM PUBLIC;

DROP TRIGGER IF EXISTS assign_business_tenant_before_insert
  ON public.business_profiles;
CREATE TRIGGER assign_business_tenant_before_insert
  BEFORE INSERT ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION private.assign_business_tenant();

CREATE OR REPLACE FUNCTION private.grant_business_owner_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.client_access (
    tenant_id,
    business_profile_id,
    user_id,
    can_read,
    can_write,
    can_approve
  )
  VALUES (new.tenant_id, new.id, new.user_id, true, true, true)
  ON CONFLICT (business_profile_id, user_id) DO UPDATE SET
    can_read = true,
    can_write = true,
    can_approve = true;
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION private.grant_business_owner_access() FROM PUBLIC;

DROP TRIGGER IF EXISTS grant_business_owner_access_after_insert
  ON public.business_profiles;
CREATE TRIGGER grant_business_owner_access_after_insert
  AFTER INSERT ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION private.grant_business_owner_access();

CREATE POLICY tenants_member_read
  ON public.tenants FOR SELECT TO authenticated
  USING (
    private.has_tenant_role(
      id,
      ARRAY[
        'owner', 'firm_admin', 'advisor', 'loan_packager', 'accountant',
        'business_owner', 'lender_reviewer', 'bankable_admin'
      ]
    )
  );

GRANT SELECT ON public.tenants TO authenticated;
