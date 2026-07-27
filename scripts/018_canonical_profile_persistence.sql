-- Canonical client persistence, onboarding continuity, and profile versions.
-- Depends on 015_enterprise_identity_and_access.sql through
-- 017_security_hardening.sql.

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS assessment_data jsonb,
  ADD COLUMN IF NOT EXISTS bankable_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scoring_version text,
  ADD COLUMN IF NOT EXISTS score_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS badges_data jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_state text NOT NULL DEFAULT 'profile_started'
    CHECK (
      onboarding_state IN (
        'profile_started',
        'profile_complete',
        'assessment_started',
        'assessment_complete',
        'ready'
      )
    ),
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.business_profile_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_profile_id uuid NOT NULL
    REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_source text NOT NULL DEFAULT 'manual'
    CHECK (
      change_source IN (
        'manual',
        'onboarding',
        'assessment',
        'integration',
        'import',
        'system'
      )
    ),
  changed_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_profile_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_business_profile_versions_timeline
  ON public.business_profile_versions (
    business_profile_id,
    version_number DESC
  );

ALTER TABLE public.business_profile_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_profile_versions_assigned_read
  ON public.business_profile_versions;
CREATE POLICY business_profile_versions_assigned_read
  ON public.business_profile_versions FOR SELECT TO authenticated
  USING (private.has_client_permission(business_profile_id, 'read'));

REVOKE ALL ON TABLE public.business_profile_versions FROM anon;
REVOKE ALL ON TABLE public.business_profile_versions FROM authenticated;
GRANT SELECT ON TABLE public.business_profile_versions TO authenticated;

CREATE OR REPLACE FUNCTION private.capture_business_profile_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_version integer;
  fields text[];
  actor uuid := (SELECT auth.uid());
  source text;
BEGIN
  IF tg_op = 'INSERT' THEN
    SELECT coalesce(array_agg(key ORDER BY key), ARRAY[]::text[])
    INTO fields
    FROM jsonb_object_keys(to_jsonb(new) - 'profile_photo') AS key;
  ELSE
    SELECT coalesce(array_agg(entry.key ORDER BY entry.key), ARRAY[]::text[])
    INTO fields
    FROM jsonb_each(to_jsonb(new) - 'profile_photo') AS entry
    WHERE to_jsonb(old) -> entry.key IS DISTINCT FROM entry.value;
  END IF;

  SELECT coalesce(max(version_number), 0) + 1
  INTO next_version
  FROM public.business_profile_versions
  WHERE business_profile_id = new.id;

  source := coalesce(nullif(new.updated_by_source, ''), 'system');
  IF source NOT IN (
    'manual',
    'onboarding',
    'assessment',
    'integration',
    'import',
    'system'
  ) THEN
    source := 'system';
  END IF;

  INSERT INTO public.business_profile_versions (
    tenant_id,
    business_profile_id,
    version_number,
    changed_by,
    change_source,
    changed_fields,
    snapshot
  )
  VALUES (
    new.tenant_id,
    new.id,
    next_version,
    actor,
    source,
    fields,
    to_jsonb(new) - 'profile_photo'
  );

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION private.capture_business_profile_version() FROM PUBLIC;

DROP TRIGGER IF EXISTS capture_business_profile_version
  ON public.business_profiles;
CREATE TRIGGER capture_business_profile_version
  AFTER INSERT OR UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION private.capture_business_profile_version();

COMMENT ON TABLE public.business_profile_versions IS
  'Append-only canonical client snapshots used for source lineage, audit review, and recovery.';

COMMENT ON COLUMN public.business_profiles.updated_by_source IS
  'Origin of the latest canonical update: manual, onboarding, assessment, integration, import, or system.';
