import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Shield,
  FileSearch,
  DollarSign,
  FileText,
  Users,
  Building2,
  LogOut,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../api/supabaseClient';

interface Org {
  id: string;
  name: string;
}

const navSections = [
  {
    title: null,
    items: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    title: 'ניתוח מכרז',
    items: [
      { path: '/gates', icon: Shield, label: 'תנאי סף' },
      { path: '/sow', icon: FileSearch, label: 'SOW & עבודות נסתרות' },
      { path: '/boq', icon: DollarSign, label: 'BOQ & תמחור' },
      { path: '/contract', icon: FileText, label: 'ניתוח חוזה' },
      { path: '/competitors', icon: Users, label: 'מודיעין תחרותי' },
    ],
  },
  {
    title: 'הגדרות',
    items: [
      { path: '/company', icon: Building2, label: 'פרופיל חברה' },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    localStorage.getItem('tenderix_selected_org_id') || ''
  );

  useEffect(() => {
    loadOrgs();
  }, []);

  async function loadOrgs() {
    const { data } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');
    if (data) {
      setOrgs(data);
      if (!selectedOrgId && data.length > 0) {
        selectOrg(data[0].id, data[0].name);
      }
    }
  }

  function selectOrg(id: string, name: string) {
    setSelectedOrgId(id);
    localStorage.setItem('tenderix_selected_org_id', id);
    localStorage.setItem('tenderix_selected_org_name', name);
    window.dispatchEvent(new Event('storage'));
  }

  function handleLogout() {
    localStorage.removeItem('tenderix_auth');
    localStorage.removeItem('tenderix_selected_org_id');
    localStorage.removeItem('tenderix_selected_org_name');
    localStorage.removeItem('currentTenderId');
    localStorage.removeItem('currentTenderName');
    window.location.reload();
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Zap size={18} />
          </div>
          <div>
            <div className="sidebar-brand-text">Tenderix</div>
            <div className="sidebar-brand-sub">AI Tender Intelligence</div>
          </div>
        </div>
      </div>

      <nav>
        <ul className="sidebar-nav">
          {navSections.map((section, si) => (
            <li key={si}>
              {section.title && (
                <div className="sidebar-section-title">{section.title}</div>
              )}
              <ul style={{ listStyle: 'none' }}>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.path}>
                      <Link to={item.path} className={isActive ? 'active' : ''}>
                        <item.icon size={18} className="nav-icon" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--dark-500)',
            marginBottom: '0.3rem',
          }}>
            חברה פעילה
          </div>
          <div style={{ position: 'relative' }}>
            <select
              className="sidebar-org-select"
              value={selectedOrgId}
              onChange={(e) => {
                const org = orgs.find(o => o.id === e.target.value);
                if (org) selectOrg(org.id, org.name);
              }}
            >
              {orgs.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                left: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--dark-400)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            padding: '0.45rem',
            background: 'rgba(239,68,68,0.08)',
            color: '#fca5a5',
            border: '1px solid rgba(239,68,68,0.12)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontFamily: 'inherit',
            marginTop: '0.5rem',
            transition: 'all 150ms ease',
          }}
        >
          <LogOut size={14} />
          התנתק
        </button>
      </div>
    </aside>
  );
}
