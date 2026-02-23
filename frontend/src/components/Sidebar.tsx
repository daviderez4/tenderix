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
  P2: '#8b5cf6',
  P3: '#22c55e',
  P4: '#f59e0b',
  OUT: '#10b981',
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
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
        }}>
          <Target size={18} color="white" />
        </div>
        <span style={{ letterSpacing: '-0.02em' }}>Tenderix</span>
        <span style={{
          fontSize: '0.55rem',
          opacity: 0.35,
          marginRight: '4px',
          background: 'rgba(255,255,255,0.08)',
          padding: '2px 5px',
          borderRadius: 4,
          fontWeight: 600,
        }}>v4</span>
      </div>

      {/* Flow progress indicator */}
      {activeStep > 0 && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.5rem 0.65rem',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            display: 'flex',
            gap: '2px',
            marginBottom: '4px',
          }}>
            {[1,2,3,4,5].map(step => (
              <div key={step} style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: step <= activeStep
                  ? pillarColors[navItems.find(n => n.step === step)?.pillar || 'P1']
                  : 'rgba(255,255,255,0.08)',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            שלב {activeStep} מתוך 5
          </div>
        </div>
      )}

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
                    top: -3,
                    right: 23,
                    width: 2,
                    height: 6,
                    background: item.step <= activeStep
                      ? `linear-gradient(180deg, ${pillarColors[navItems.find(n => n.step === item.step - 1)?.pillar || 'P1']}, ${color})`
                      : 'rgba(255,255,255,0.06)',
                    borderRadius: 1,
                  }} />
                )}
                <Link
                  to={item.path}
                  className={isActive ? 'active' : ''}
                  style={{
                    borderRight: color ? `3px solid ${isActive ? color : `${color}40`}` : 'none',
                    paddingRight: color ? '10px' : '13px',
                    ...(isActive && color ? {
                      background: `linear-gradient(90deg, transparent, ${color}12)`,
                    } : {}),
                  }}
                >
                  {/* Step number or icon */}
                  {isFlowStep ? (
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      transition: 'all 0.2s',
                      ...(isPassed ? {
                        background: `${color}25`,
                        color: color,
                      } : isActive ? {
                        background: color,
                        color: 'white',
                        boxShadow: `0 0 14px ${color}40`,
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(255,255,255,0.25)',
                        border: '1.5px solid rgba(255,255,255,0.08)',
                      }),
                    }}>
                      {isPassed ? <CheckCircle size={13} /> : item.step}
                    </div>
                  ) : (
                    <item.icon size={18} />
                  )}

                  <span style={{ flex: 1 }}>{item.label}</span>

                  {item.pillar && (
                    <span style={{
                      fontSize: '0.55rem',
                      fontWeight: 700,
                      opacity: isActive ? 1 : 0.4,
                      background: `${color}18`,
                      padding: '2px 5px',
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
        bottom: '4.5rem',
        right: '1.25rem',
        left: '1.25rem',
        padding: '0.75rem',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        fontSize: '0.72rem',
        color: 'rgba(255,255,255,0.5)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        {companyName && (
          <div style={{ marginBottom: '0.4rem' }}>
            <div style={{ opacity: 0.45, fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              חברה
            </div>
            <div style={{ color: '#06b6d4', fontWeight: 600, fontSize: '0.78rem' }}>
              {companyName}
            </div>
          </div>
        )}
        <div>
          <div style={{ opacity: 0.45, fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            מכרז
          </div>
          <div style={{
            color: currentTenderName ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
            fontWeight: 500,
            fontSize: '0.75rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
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
          bottom: '1.25rem',
          right: '1.25rem',
          left: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          padding: '0.55rem',
          background: 'rgba(239, 68, 68, 0.08)',
          color: '#fca5a5',
          border: '1px solid rgba(239, 68, 68, 0.12)',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontFamily: 'inherit',
          transition: 'all 0.2s',
        }}
      >
        <LogOut size={14} />
        התנתק
      </button>
    </aside>
  );
}
