# Database Migrations

Order matters. Run in numerical order.

| File | Adds |
|------|------|
| `000_*.sql` through `004_*.sql` | Legacy: fundready schema + assessments + sbss history (pre-v1.8) |
| `010_v1.8_tenants_and_baseline.sql` | Tenants table + tenant_id NOT NULL on all existing tables |
| `011_v1.8_readiness_schemas.sql` | The 25 readiness schemas (Blueprint v1.8 §34, rows 1-25) |
| `012_v1.8_credit_schemas.sql` | The 5 credit schemas (Blueprint v1.8 §34, rows 26-30) |
| `013_v1.8_bai_schemas.sql` | The 5 BAI schemas, NEW v1.8 (rows 31-35) |
| `014_v1.8_multi_tenant_rls.sql` | Multi-tenant RLS policies on every new table |
| `015_enterprise_identity_and_access.sql` | Enterprise roles, memberships, invitations, client assignments, and Supabase-native authorization |
| `016_identity_bootstrap_and_canonical_client.sql` | New-user workspace bootstrap and automatic canonical business ownership mapping |
| `017_security_hardening.sql` | Removes anonymous financial-table access and locks privileged trigger functions |
| `verify-supabase-schema.sql` | Read-only sanity check, runs anytime |

After v1.8 is fully applied, the schema count reaches 35 per the Blueprint §34 catalog.

## Session variables required for RLS

Every database connection (or transaction) must `SET` these variables for queries to scope correctly:

```sql
SET app.tenant_id = '<the_uuid_of_the_current_tenant>';
SET app.role      = '<client|advisor|advisor_admin|compliance_officer|lender_user|platform_admin>';
```

The application's data adapter does this in `src/app/lib/data-adapter.ts` (existing) and in any new service that opens a database connection.

## Notes for reviewers

- All new tables have `tenant_id UUID NOT NULL` referencing `public.tenants(id)`.
- All new tables have an index on `tenant_id`.
- All new tables enable RLS with the `tenant_isolation` policy.
- The legacy 000-004 migrations are NOT modified by this PR. They remain as-is.
- `restricted_compliance_data` is hash-chained for tamper evidence per Spec §3.2 (Compliance Engine).
