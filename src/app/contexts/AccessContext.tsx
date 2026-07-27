import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { useAuth } from './AuthContext';

export type EnterpriseRole =
  | 'owner'
  | 'firm_admin'
  | 'advisor'
  | 'loan_packager'
  | 'accountant'
  | 'business_owner'
  | 'lender_reviewer'
  | 'bankable_admin';

interface Membership {
  tenant_id: string;
  role: EnterpriseRole;
  status: string;
}

interface ClientAccess {
  tenant_id: string;
  business_profile_id: string;
  can_read: boolean;
  can_write: boolean;
  can_approve: boolean;
}

interface AccessContextValue {
  loading: boolean;
  memberships: Membership[];
  clientAccess: ClientAccess[];
  activeMembership: Membership | null;
  isFirmUser: boolean;
  canAdministerTenant: boolean;
}

const AccessContext = createContext<AccessContextValue | undefined>(undefined);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [clientAccess, setClientAccess] = useState<ClientAccess[]>([]);

  useEffect(() => {
    if (!user) {
      setMemberships([]);
      setClientAccess([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void Promise.all([
      supabase
        .from('tenant_memberships')
        .select('tenant_id, role, status')
        .eq('status', 'active'),
      supabase
        .from('client_access')
        .select('tenant_id, business_profile_id, can_read, can_write, can_approve'),
    ]).then(([membershipResult, accessResult]) => {
      if (cancelled) return;
      if (membershipResult.error) {
        console.error('[Bankable] Unable to load tenant membership:', membershipResult.error.message);
      }
      if (accessResult.error) {
        console.error('[Bankable] Unable to load client access:', accessResult.error.message);
      }
      setMemberships((membershipResult.data ?? []) as Membership[]);
      setClientAccess((accessResult.data ?? []) as ClientAccess[]);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const value = useMemo<AccessContextValue>(() => {
    const activeMembership = memberships[0] ?? null;
    const role = activeMembership?.role;
    return {
      loading,
      memberships,
      clientAccess,
      activeMembership,
      isFirmUser: !!role && [
        'owner', 'firm_admin', 'advisor', 'loan_packager', 'accountant', 'bankable_admin',
      ].includes(role),
      canAdministerTenant: !!role && ['owner', 'firm_admin', 'bankable_admin'].includes(role),
    };
  }, [clientAccess, loading, memberships]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error('useAccess must be used within AccessProvider');
  return value;
}

