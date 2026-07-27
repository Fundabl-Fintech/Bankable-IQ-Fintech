-- Close advisor findings on legacy staging and financial-support tables.

ALTER TABLE IF EXISTS public.tmp_b64 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tmp_b64 FROM anon;
REVOKE ALL ON TABLE public.tmp_b64 FROM authenticated;

REVOKE ALL ON TABLE public.achievements FROM anon;

COMMENT ON TABLE public.tmp_b64 IS
  'Legacy internal staging table. Not exposed through the client Data API.';
