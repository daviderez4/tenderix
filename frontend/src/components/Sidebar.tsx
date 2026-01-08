import { Link, useLocation } from 'react-router-dom';
import { CheckSquare, Users, BarChart3, Target, Home, PlusCircle, LogOut } from 'lucide-react';

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'ראשי' },
    { path: '/new', icon: PlusCircle, label: 'מכרז חדש' },
    { path: '/gates', icon: CheckSquare, label: 'תנאי סף' },
    { path: '/analysis', icon: BarChart3, label: 'ניתוח BOQ/SOW' },
    { path: '/competitors', icon: Users, label: 'מתחרים' },
    { path: '/decision', icon: Target, label: 'החלטה' },
  ];

  function handleLogout() {
    localStorage.removeItem('tenderix_auth');
    window.location.reload();
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Target size={28} />
        Tenderix
      </div>
      <nav>
        <ul className="sidebar-nav">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={location.pathname === item.path ? 'active' : ''}
              >
                <item.icon size={20} />
                {item.label}
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
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: 'var(--gray-400)'
      }}>
        <div style={{ marginBottom: '0.25rem' }}>מכרז נוכחי:</div>
        <div style={{ color: 'white', fontWeight: 500 }}>
          {localStorage.getItem('currentTenderName') || 'חולון מצלמות'}
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
          background: 'rgba(239, 68, 68, 0.2)',
          color: '#fca5a5',
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
