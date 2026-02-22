import { Link, useLocation } from 'react-router-dom';
import {
  CheckSquare,
  Users,
  BarChart3,
  Target,
  Home,
  LogOut,
  Building2,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

const pillarColors: Record<string, string> = {
  P1: '#06b6d4',
  P2: '#7c3aed',
  P3: '#10b981',
  P4: '#f59e0b',
  OUT: '#22c55e',
};

const navItems = [
  { path: '/', icon: Home, label: 'בחירת חברה', pillar: null, step: 0 },
  { path: '/simple', icon: Sparkles, label: 'טעינת מכרז', pillar: 'P1', step: 1 },
  { path: '/gates', icon: CheckSquare, label: 'תנאי סף', pillar: 'P2', step: 2 },
  { path: '/analysis', icon: BarChart3, label: 'מפרט ו-BOQ', pillar: 'P3', step: 3 },
  { path: '/competitors', icon: Users, label: 'מתחרים', pillar: 'P4', step: 4 },
  { path: '/decision', icon: Target, label: 'החלטה', pillar: 'OUT', step: 5 },
  { path: '/company', icon: Building2, label: 'פרופיל חברה', pillar: null, step: -1 },
];

function getActiveStep(pathname: string): number {
  const item = navItems.find(n => n.path === pathname);
  return item?.step ?? 0;
}

export function Sidebar() {
  const location = useLocation();
  const activeStep = getActiveStep(location.pathname);

  const companyName = localStorage.getItem('tenderix_selected_org_name') || '';
  const currentTenderName = localStorage.getItem('currentTenderName') || '';

  function handleLogout() {
    localStorage.removeItem('tenderix_auth');
    localStorage.removeItem('tenderix_current_tender');
    localStorage.removeItem('tenderix_selected_org_id');
    localStorage.removeItem('tenderix_selected_org_name');
    localStorage.removeItem('currentTenderId');
    localStorage.removeItem('currentTenderName');
    window.location.reload();
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
        }}>
          <Target size={20} color="white" />
        </div>
        <span>Tenderix</span>
        <span style={{
          fontSize: '0.6rem',
          opacity: 0.4,
          marginRight: '4px',
          background: 'rgba(255,255,255,0.1)',
          padding: '2px 6px',
          borderRadius: 4,
        }}>v3.1</span>
      </div>

      {/* Navigation */}
      <nav>
        <ul className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const color = item.pillar ? pillarColors[item.pillar] : undefined;
            const isFlowStep = item.step > 0;
            const isPassed = isFlowStep && item.step < activeStep;

            return (
              <li key={item.path} style={{ position: 'relative' }}>
                {/* Vertical connector line between flow steps */}
                {isFlowStep && item.step > 1 && (
                  <div style={{
                    position: 'absolute',
                    top: -4,
                    right: 25,
                    width: 2,
                    height: 8,
                    background: item.step <= activeStep
                      ? `linear-gradient(180deg, ${pillarColors[navItems.find(n => n.step === item.step - 1)?.pillar || 'P1']}, ${color})`
                      : 'rgba(255,255,255,0.08)',
                    borderRadius: 1,
                  }} />
                )}
                <Link
                  to={item.path}
                  className={isActive ? 'active' : ''}
                  style={{
                    borderRight: color ? `3px solid ${isActive ? color : `${color}60`}` : 'none',
                    paddingRight: color ? '12px' : '15px',
                    ...(isActive && color ? {
                      background: `linear-gradient(90deg, transparent, ${color}15)`,
                    } : {}),
                  }}
                >
                  {/* Step number or icon */}
                  {isFlowStep ? (
                    <div style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      transition: 'all 0.2s',
                      ...(isPassed ? {
                        background: `${color}30`,
                        color: color,
                      } : isActive ? {
                        background: color,
                        color: 'white',
                        boxShadow: `0 0 12px ${color}50`,
                      } : {
                        background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.3)',
                        border: '1.5px solid rgba(255,255,255,0.1)',
                      }),
                    }}>
                      {isPassed ? <CheckCircle size={14} /> : item.step}
                    </div>
                  ) : (
                    <item.icon size={20} />
                  )}

                  <span style={{ flex: 1 }}>{item.label}</span>

                  {item.pillar && (
                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      opacity: isActive ? 1 : 0.5,
                      background: `${color}20`,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      color: color,
                      transition: 'opacity 0.2s',
                    }}>
                      {item.pillar}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Context info */}
      <div style={{
        position: 'absolute',
        bottom: '5rem',
        right: '1.5rem',
        left: '1.5rem',
        padding: '0.85rem',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 10,
        fontSize: '0.75rem',
        color: 'var(--gray-400)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {companyName && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ opacity: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              חברה
            </div>
            <div style={{ color: '#06b6d4', fontWeight: 500, fontSize: '0.8rem' }}>
              {companyName}
            </div>
          </div>
        )}
        <div>
          <div style={{ opacity: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
            מכרז
          </div>
          <div style={{
            color: currentTenderName ? 'white' : 'rgba(255,255,255,0.3)',
            fontWeight: 500,
            fontSize: '0.8rem',
          }}>
            {currentTenderName || 'לא נבחר'}
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          bottom: '1.5rem',
          right: '1.5rem',
          left: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.65rem',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#fca5a5',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontFamily: 'inherit',
          transition: 'all 0.2s',
        }}
      >
        <LogOut size={16} />
        התנתק
      </button>
    </aside>
  );
}
