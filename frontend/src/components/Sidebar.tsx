import { Link, useLocation } from 'react-router-dom';
import {
  CheckSquare,
  Users,
  BarChart3,
  Target,
  Home,
  LogOut,
  Upload,
  Building2,
  Sparkles
} from 'lucide-react';

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'דשבורד', pillar: null },
    { path: '/simple', icon: Sparkles, label: 'חילוץ מהיר', pillar: 'NEW' },
    { path: '/intake', icon: Upload, label: 'קליטת מכרז', pillar: 'P1' },
    { path: '/gates', icon: CheckSquare, label: 'תנאי סף', pillar: 'P2' },
    { path: '/analysis', icon: BarChart3, label: 'מפרט ו-BOQ', pillar: 'P3' },
    { path: '/competitors', icon: Users, label: 'מתחרים', pillar: 'P4' },
    { path: '/decision', icon: Target, label: 'החלטה', pillar: 'OUT' },
    { path: '/company', icon: Building2, label: 'פרופיל חברה', pillar: null },
  ];

  function handleLogout() {
    localStorage.removeItem('tenderix_auth');
    localStorage.removeItem('tenderix_current_tender');
    window.location.reload();
  }

  const pillarColors: Record<string, string> = {
    'NEW': '#ec4899',
    'P1': '#00d4ff',
    'P2': '#7c3aed',
    'P3': '#10b981',
    'P4': '#f59e0b',
    'OUT': '#22c55e',
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Target size={28} />
        <span>Tenderix</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.6, marginRight: '4px' }}>v3.0</span>
      </div>
      <nav>
        <ul className="sidebar-nav">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={location.pathname === item.path ? 'active' : ''}
                style={{
                  borderRight: item.pillar ? `3px solid ${pillarColors[item.pillar]}` : 'none',
                  paddingRight: item.pillar ? '12px' : '15px'
                }}
              >
                <item.icon size={20} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.pillar && (
                  <span style={{
                    fontSize: '0.65rem',
                    opacity: 0.6,
                    background: pillarColors[item.pillar] + '20',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: pillarColors[item.pillar]
                  }}>
                    {item.pillar}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div style={{
        position: 'absolute',
        bottom: '5rem',
        right: '1.5rem',
        left: '1.5rem',
        padding: '1rem',
        background: '#f1f5f9',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: 'var(--gray-500)'
      }}>
        <div style={{ marginBottom: '0.25rem' }}>מכרז נוכחי:</div>
        <div style={{ color: 'var(--gray-800)', fontWeight: 500 }}>
          {localStorage.getItem('currentTenderName') || 'לא נבחר מכרז'}
        </div>
      </div>

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
          padding: '0.75rem',
          background: '#fee2e2',
          color: '#dc2626',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        <LogOut size={18} />
        התנתק
      </button>
    </aside>
  );
}
