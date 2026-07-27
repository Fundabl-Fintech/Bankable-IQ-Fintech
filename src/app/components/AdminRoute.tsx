// ════════════════════════════════════════════════════════════════════════════════
// FUNDREADY™ — Admin Route Guard
// Restricts access to admin-only routes.
// Production: requires user.app_metadata.role === 'admin'
// Dev override: NODE_ENV=development AND localStorage 'fundready_dev_admin'='true'
// ════════════════════════════════════════════════════════════════════════════════

import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useAccess } from '../contexts/AccessContext';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const { loading: accessLoading, canAdministerTenant } = useAccess();
  const loading = authLoading || accessLoading;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        color: 'var(--foreground)',
      }}>
        <Loader2 style={{
          width: '32px',
          height: '32px',
          color: 'var(--primary)',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Dev-only override: only active when explicitly set in development
  const isDevAdmin =
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    localStorage.getItem('fundready_dev_admin') === 'true';

  if (isDevAdmin) {
    return <>{children}</>;
  }

  // Supabase not configured — block access (no auth = no admin in unconfigured state)
  if (!isConfigured || !user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (!canAdministerTenant) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}

export default AdminRoute;
