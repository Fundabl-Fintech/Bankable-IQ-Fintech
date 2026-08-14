// ════════════════════════════════════════════════════════════════════════════════
// FUNDREADY™ — Sidebar
// Elon: flat hierarchy, every item one tap from where it matters
// Chase Hughes: score confirmation at top, primary action prominent
// Mobile: slides in as overlay drawer
// ════════════════════════════════════════════════════════════════════════════════

import { Link, useLocation, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getMembershipTier, getTierLabel, getTierColor, type MembershipTier } from '../lib/membership';
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  Wallet,
  ChevronDown,
  ClipboardCheck,
  Shield,
  BarChart2,
  BarChart3,
  FolderOpen,
  Map,
  AlertCircle,
  BookOpen,
  FileText,
  Settings,
  X,
  Zap,
  Brain,
  Compass,
  User,
  CreditCard,
  Boxes,
} from 'lucide-react';
import { getPreQualifiedPrograms } from '../utils/fundingEligibility';
import { computeScore } from '../pages/business-assessment/engine';

// ── Primary nav — flat, one tap deep ─────────────────────────────────────────
const PRIMARY_NAV = [
  { path: '/app/getting-started', label: 'Getting Started',       icon: Compass, isGuide: true },
  { path: '/business-assessment', label: 'Business Success Scan', icon: ClipboardCheck, isAssessment: true },
  { path: '/app/dashboard',       label: 'Dashboard',             icon: LayoutDashboard },
  { path: '/app/status-reports',  label: 'Status Reports',        icon: BarChart2 },
  { path: '/app/credit-path',     label: 'CreditPath',            icon: CreditCard },
  { path: '/app/access-funding',  label: 'Access Funding',        icon: DollarSign, showFunding: true },
  { path: '/app/my-progress',     label: 'My Progress',           icon: TrendingUp },
  { path: '/app/ai-coach',        label: 'Bankable AI Coach',      icon: Brain, isCoach: true },
  { path: '/app/ghl-snapshot',    label: 'AI Snapshot Builder',     icon: Boxes },
  { path: '/app/finances',        label: 'Finances',              icon: Wallet },
];

// ── Tools section — direct links, no accordion needed ────────────────────────
const TOOLS_NAV = [
  { path: '/app/lender-compliance',   label: 'Lender Compliance',    icon: Shield },
  { path: '/app/optimize-reporting',  label: 'Optimize Reporting',   icon: BarChart3 },
  { path: '/app/document-collection', label: 'Document Portal',      icon: FolderOpen },
  { path: '/app/capital-access-map',  label: 'Capital Access Map',   icon: Map },
  { path: '/app/denial-diagnosis',    label: 'Denial Diagnosis',     icon: AlertCircle },
  { path: '/app/integrate-reports',   label: 'Integrate Reports',    icon: Zap },
  { path: '/app/capital-glossary',    label: 'Capital Glossary',     icon: BookOpen },
  { path: '/app/templates-resources', label: 'Templates',            icon: FileText },
];

function NavItem({
  path, label, icon: Icon, isActive, badge, onClick,
}: {
  path: string; label: string; icon: any; isActive: boolean;
  badge?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <Link
      to={path}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 12px', borderRadius: '10px',
        textDecoration: 'none',
        background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
        border: isActive ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--card)';
      }}
      onMouseLeave={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <Icon
        size={16}
        style={{ color: isActive ? '#10b981' : 'var(--muted-foreground)', flexShrink: 0 }}
      />
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: isActive ? 600 : 400,
        color: isActive ? '#10b981' : 'var(--foreground)', flex: 1, lineHeight: 1.2,
      }}>
        {label}
      </span>
      {badge}
    </Link>
  );
}

// ── Mobile Bottom Navigation Bar ─────────────────────────────────────────────
const MOBILE_NAV = [
  { path: '/app/dashboard',      label: 'Dashboard', icon: LayoutDashboard },
  { path: '/app/access-funding', label: 'Funding',   icon: DollarSign },
  { path: '/app/ai-coach',       label: 'AI Coach',  icon: Brain },
  { path: '/app/lender-compliance', label: 'Comply', icon: Shield },
  { path: '/app/settings',       label: 'Profile',   icon: User },
];

function MobileBottomNav() {
  const location = useLocation();
  return (
    <nav className="mobile-bottom-nav">
      {MOBILE_NAV.map(item => {
        const isActive = location.pathname.startsWith(item.path);
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`mobile-bottom-nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [toolsExpanded, setToolsExpanded] = useState(() =>
    TOOLS_NAV.some(t => location.pathname.startsWith(t.path))
  );
  const [preQualifiedCount, setPreQualifiedCount] = useState(0);
  const [hasAssessment, setHasAssessment] = useState(false);
  const [fundScore, setFundScore] = useState(0);
  const [userName, setUserName] = useState('');
  const [membershipTier, setMembershipTier] = useState<MembershipTier>(() => getMembershipTier());

  useEffect(() => {
    const update = () => {
      const preQ = getPreQualifiedPrograms();
      setPreQualifiedCount(preQ.length);
      const raw = localStorage.getItem('unified_assessment');
      setHasAssessment(!!raw);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          const result = computeScore(data);
          setFundScore(result.score);
          setUserName(data.ownerName || data.firstName || data.businessName || '');
        } catch { /* non-fatal */ }
      }
      setMembershipTier(getMembershipTier());
    };
    update();
    window.addEventListener('storage', update);
    window.addEventListener('fundscoreUpdated', update);
    window.addEventListener('membershipUpdated', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('fundscoreUpdated', update);
      window.removeEventListener('membershipUpdated', update);
    };
  }, [location.pathname]);

  // Auto-expand tools if on a tools route
  useEffect(() => {
    if (TOOLS_NAV.some(t => location.pathname.startsWith(t.path))) {
      setToolsExpanded(true);
    }
  }, [location.pathname]);

  const close = () => onMobileClose?.();

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'JD';

  const scoreColor = fundScore >= 800 ? '#10b981' : fundScore >= 650 ? '#f59e0b' : '#ef4444';

  const sidebarContent = (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: 'var(--background)',
      borderRight: '1px solid var(--border)',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* Logo + mobile close */}
      <div style={{
        padding: '16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <Link to="/" onClick={close} style={{ textDecoration: 'none', lineHeight: 0 }}>
          <img
            src="/images/bankableiq-logo.png"
            alt="Bankable IQ"
            style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
          />
        </Link>
        <button
          onClick={close}
          className="sidebar-close-btn"
          style={{
            display: 'none', alignItems: 'center', justifyContent: 'center',
            width: '30px', height: '30px', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'var(--card)',
            cursor: 'pointer', color: 'var(--muted-foreground)',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* FundScore identity anchor — confirms who user is immediately */}
      {fundScore > 0 && (
        <div
          onClick={() => { navigate('/app/status-reports'); close(); }}
          style={{
            margin: '12px', padding: '12px 14px', borderRadius: '12px',
            background: `${scoreColor}0e`, border: `1px solid ${scoreColor}25`,
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Bankable Score™
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--muted-foreground)' }}>
              / 1,000
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: '28px', lineHeight: 1, color: scoreColor,
            }}>
              {fundScore}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ height: '4px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${fundScore / 10}%`,
                  background: scoreColor, borderRadius: '99px',
                  transition: 'width 1s ease',
                }} />
              </div>
              <div style={{ marginTop: '3px', fontFamily: 'var(--font-body)', fontSize: '10px', color: scoreColor, fontWeight: 600 }}>
                {fundScore >= 900 ? 'Elite — top 5%' : fundScore >= 800 ? 'Bankable' : fundScore >= 650 ? 'Approaching' : 'Building'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary nav */}
      <div style={{ padding: '8px 8px 0', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {PRIMARY_NAV.map(item => {
            const isActive = item.path === '/app/dashboard'
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path) && item.path !== '/business-assessment'
                ? true
                : location.pathname === item.path;

            let badge: React.ReactNode = null;
            if ((item as any).isGuide) {
              badge = (
                <span style={{
                  fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '5px',
                  background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                  border: '1px solid rgba(99,102,241,0.25)',
                  textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                }}>
                  Guide
                </span>
              );
            }
            if (item.isAssessment) {
              badge = (
                <span style={{
                  fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '5px',
                  background: hasAssessment ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                  color: hasAssessment ? '#3b82f6' : '#10b981',
                  border: `1px solid ${hasAssessment ? 'rgba(59,130,246,0.25)' : 'rgba(16,185,129,0.25)'}`,
                  textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                }}>
                  {hasAssessment ? 'Edit' : 'Start'}
                </span>
              );
            }
            if (item.showFunding && preQualifiedCount > 0) {
              badge = (
                <span style={{
                  fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '5px',
                  background: 'rgba(16,185,129,0.1)', color: '#10b981',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}>
                  {preQualifiedCount} ready
                </span>
              );
            }

            return (
              <NavItem
                key={item.path}
                path={item.path}
                label={item.label}
                icon={item.icon}
                isActive={isActive}
                badge={badge}
                onClick={close}
              />
            );
          })}
        </div>

        {/* Tools section */}
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={() => setToolsExpanded(e => !e)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted-foreground)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1, textAlign: 'left' }}>
              My Tools
            </span>
            <motion.div animate={{ rotate: toolsExpanded ? 180 : 0 }} transition={{ duration: 0.18 }}>
              <ChevronDown size={13} />
            </motion.div>
          </button>

          <AnimatePresence>
            {toolsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '2px' }}>
                  {TOOLS_NAV.map(item => (
                    <NavItem
                      key={item.path}
                      path={item.path}
                      label={item.label}
                      icon={item.icon}
                      isActive={location.pathname.startsWith(item.path)}
                      onClick={close}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom: Settings + User */}
      <div style={{
        padding: '8px', borderTop: '1px solid var(--border)', flexShrink: 0,
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        <NavItem
          path="/app/settings"
          label="Settings"
          icon={Settings}
          isActive={location.pathname.startsWith('/app/settings')}
          onClick={close}
        />

        {/* Membership tier badge */}
        {(() => {
          const tierColor = getTierColor(membershipTier);
          const tierLabel = getTierLabel(membershipTier);
          const isUpgradeable = membershipTier === 'free';
          return (
            <div
              onClick={() => isUpgradeable && navigate('/app/lender-compliance')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: `${tierColor}0e`, border: `1px solid ${tierColor}25`, cursor: isUpgradeable ? 'pointer' : 'default' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: tierColor }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, color: tierColor }}>{tierLabel}</span>
              </div>
              {isUpgradeable && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 700, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '1px 6px', borderRadius: '4px' }}>Upgrade →</span>
              )}
            </div>
          );
        })()}

        {/* User profile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '10px',
          background: 'var(--card)', border: '1px solid var(--border)',
          marginTop: '4px',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '12px', color: 'white',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName || 'My Account'}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--muted-foreground)' }}>
              {fundScore > 0 ? `Bankable Score ${fundScore}` : 'Start assessment'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className="sidebar-desktop"
        style={{ width: 'var(--sidebar-width)', flexShrink: 0, height: '100vh', position: 'sticky', top: 0 }}
      >
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.5)',
              }}
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: '280px', zIndex: 1001,
              }}
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-close-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
