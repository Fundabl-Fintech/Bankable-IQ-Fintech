-- Remove anonymous discovery of financial and identity tables. RLS remains the
-- row-level enforcement layer for signed-in users.

REVOKE ALL ON TABLE public.business_profiles FROM anon;
REVOKE ALL ON TABLE public.funding_applications FROM anon;
REVOKE ALL ON TABLE public.audit_items FROM anon;
REVOKE ALL ON TABLE public.audit_logs FROM anon;
REVOKE ALL ON TABLE public.fico_history FROM anon;
REVOKE ALL ON TABLE public.gamification_data FROM anon;
REVOKE ALL ON TABLE public.tenant_memberships FROM anon;
REVOKE ALL ON TABLE public.client_access FROM anon;
REVOKE ALL ON TABLE public.tenant_invitations FROM anon;
REVOKE ALL ON TABLE public.tenants FROM anon;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = '';

-- This table stores deployed scan assets, not user financial records. Access is
-- intentionally unchanged until the scan delivery path is migrated.

