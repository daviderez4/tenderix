import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  DollarSign,
  Award,
  Users,
  FolderOpen,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { supabase } from '../api/supabaseClient';
import { getCurrentOrgId } from '../api/config';

type TabType = 'general' | 'financials' | 'certifications' | 'personnel' | 'projects';

interface Organization {
  id: string;
  name: string;
  company_number: string;
  founding_year: number;
  address: string;
  phone: string;
  email: string;
  website: string;
}

interface Financial {
  id?: string;
  fiscal_year: number;
  annual_revenue: number;
  net_profit: number;
  employee_count: number;
  audited: boolean;
}

interface Certification {
  id?: string;
  cert_type: string;
  cert_name: string;
  cert_number: string;
  issuing_body: string;
  valid_from: string;
  valid_until: string;
}

interface PersonnelRecord {
  id?: string;
  full_name: string;
  role: string;
  department: string;
  education: string;
  years_experience: number;
  professional_certifications: string[];
  security_clearance: string;
}

interface Project {
  id?: string;
  project_name: string;
  client_name: string;
  client_type: string;
  start_date: string;
  end_date: string;
  total_value: number;
  category: string;
  project_type: string;
  role_type: string;
  location: string;
}

export function CompanyProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [org, setOrg] = useState<Organization | null>(null);
  const [financials, setFinancials] = useState<Financial[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const orgId = getCurrentOrgId();

  useEffect(() => {
    if (orgId) loadAll();
  }, [orgId]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadOrg(), loadFinancials(), loadCerts(), loadPersonnel(), loadProjects()]);
    setLoading(false);
  }

  async function loadOrg() {
    const { data } = await supabase.from('organizations').select('*').eq('id', orgId).single();
    if (data) setOrg(data);
  }

  async function loadFinancials() {
    const { data } = await supabase.from('company_financials').select('*').eq('org_id', orgId).order('fiscal_year', { ascending: false });
    if (data) setFinancials(data);
  }

  async function loadCerts() {
    const { data } = await supabase.from('company_certifications').select('*').eq('org_id', orgId).order('cert_type');
    if (data) setCertifications(data);
  }

  async function loadPersonnel() {
    const { data } = await supabase.from('company_personnel').select('*').eq('org_id', orgId).order('full_name');
    if (data) setPersonnel(data);
  }

  async function loadProjects() {
    const { data } = await supabase.from('company_projects').select('*').eq('org_id', orgId).order('start_date', { ascending: false });
    if (data) setProjects(data);
  }

  function formatCurrency(val: number) {
    if (!val) return '-';
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);
  }

  const tabs: { key: TabType; label: string; icon: typeof Building2; count?: number }[] = [
    { key: 'general', label: 'כללי', icon: Building2 },
    { key: 'financials', label: 'נתונים פיננסיים', icon: DollarSign, count: financials.length },
    { key: 'certifications', label: 'הסמכות', icon: Award, count: certifications.length },
    { key: 'personnel', label: 'כוח אדם', icon: Users, count: personnel.length },
    { key: 'projects', label: 'תיק פרויקטים', icon: FolderOpen, count: projects.length },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner spinner-lg" />
        <span>טוען פרופיל...</span>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-right">
            <h1 className="page-title"><Building2 size={24} style={{ color: 'var(--primary)' }} /> פרופיל חברה</h1>
          </div>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Building2 size={28} /></div>
            <div className="empty-state-title">לא נמצא פרופיל</div>
            <div className="empty-state-text">בחר חברה מהתפריט בצד</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-right">
          <h1 className="page-title">
            <Building2 size={24} style={{ color: 'var(--primary)' }} />
            פרופיל חברה
          </h1>
          <p className="page-subtitle">{org.name}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={loadAll}>
            <RefreshCw size={14} /> רענן
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/company/new')}>
            <Plus size={14} /> חברה חדשה
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-accent">
          <div className="stat-value">{org.founding_year || '-'}</div>
          <div className="stat-label">שנת ייסוד</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{financials[0]?.employee_count || '-'}</div>
          <div className="stat-label">עובדים</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">פרויקטים</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{certifications.length}</div>
          <div className="stat-label">הסמכות</div>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            <tab.icon size={14} />
            {tab.label}
            {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="card">
          <div className="card-header"><div className="card-title">פרטי חברה</div></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">שם חברה</label><div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{org.name}</div></div>
            <div className="form-group"><label className="form-label">ח.פ.</label><div>{org.company_number || '-'}</div></div>
            <div className="form-group"><label className="form-label">שנת ייסוד</label><div>{org.founding_year || '-'}</div></div>
          </div>
          <div className="form-row" style={{ marginTop: '0.75rem' }}>
            <div className="form-group"><label className="form-label">כתובת</label><div>{org.address || '-'}</div></div>
            <div className="form-group"><label className="form-label">טלפון</label><div>{org.phone || '-'}</div></div>
            <div className="form-group"><label className="form-label">אימייל</label><div>{org.email || '-'}</div></div>
          </div>
        </div>
      )}

      {activeTab === 'financials' && (
        <div className="card">
          <div className="card-header"><div className="card-title"><DollarSign size={16} /> נתונים פיננסיים</div></div>
          {financials.length === 0 ? (
            <div className="empty-state"><div className="empty-state-title">אין נתונים פיננסיים</div></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>שנה</th><th>מחזור שנתי</th><th>רווח נקי</th><th>עובדים</th><th>מבוקר</th></tr></thead>
                <tbody>
                  {financials.map(f => (
                    <tr key={f.id || f.fiscal_year}>
                      <td style={{ fontWeight: 600 }}>{f.fiscal_year}</td>
                      <td>{formatCurrency(f.annual_revenue)}</td>
                      <td>{formatCurrency(f.net_profit)}</td>
                      <td>{f.employee_count}</td>
                      <td>{f.audited ? <span className="badge badge-success">כן</span> : <span className="badge badge-gray">לא</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'certifications' && (
        <div className="card">
          <div className="card-header"><div className="card-title"><Award size={16} /> הסמכות ורישיונות</div></div>
          {certifications.length === 0 ? (
            <div className="empty-state"><div className="empty-state-title">אין הסמכות</div></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>סוג</th><th>שם</th><th>מספר</th><th>גוף מנפיק</th><th>תוקף עד</th><th>סטטוס</th></tr></thead>
                <tbody>
                  {certifications.map(c => {
                    const isValid = c.valid_until ? new Date(c.valid_until) > new Date() : true;
                    return (
                      <tr key={c.id || c.cert_name}>
                        <td><span className="badge badge-blue">{c.cert_type}</span></td>
                        <td style={{ fontWeight: 600 }}>{c.cert_name}</td>
                        <td>{c.cert_number || '-'}</td>
                        <td>{c.issuing_body || '-'}</td>
                        <td>{c.valid_until ? new Date(c.valid_until).toLocaleDateString('he-IL') : '-'}</td>
                        <td>{isValid ? <span className="badge badge-success">בתוקף</span> : <span className="badge badge-danger">פג תוקף</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'personnel' && (
        <div className="card">
          <div className="card-header"><div className="card-title"><Users size={16} /> אנשי מפתח</div></div>
          {personnel.length === 0 ? (
            <div className="empty-state"><div className="empty-state-title">אין אנשי מפתח</div></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>שם</th><th>תפקיד</th><th>מחלקה</th><th>השכלה</th><th>ניסיון</th><th>הסמכות</th></tr></thead>
                <tbody>
                  {personnel.map(p => (
                    <tr key={p.id || p.full_name}>
                      <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                      <td>{p.role}</td>
                      <td>{p.department || '-'}</td>
                      <td>{p.education || '-'}</td>
                      <td>{p.years_experience ? `${p.years_experience} שנים` : '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {(p.professional_certifications || []).map((cert, i) => (
                            <span key={i} className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{cert}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="card">
          <div className="card-header"><div className="card-title"><FolderOpen size={16} /> תיק פרויקטים</div></div>
          {projects.length === 0 ? (
            <div className="empty-state"><div className="empty-state-title">אין פרויקטים</div></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>שם פרויקט</th><th>לקוח</th><th>סוג</th><th>ערך</th><th>קטגוריה</th><th>תקופה</th></tr></thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id || p.project_name}>
                      <td style={{ fontWeight: 600 }}>{p.project_name}</td>
                      <td>{p.client_name}</td>
                      <td>
                        <span className={`badge ${p.client_type === 'GOVERNMENT' ? 'badge-blue' : p.client_type === 'MUNICIPAL' ? 'badge-success' : 'badge-gray'}`}>
                          {p.client_type === 'GOVERNMENT' ? 'ממשלתי' : p.client_type === 'MUNICIPAL' ? 'רשות מקומית' : p.client_type === 'DEFENSE' ? 'ביטחוני' : 'פרטי'}
                        </span>
                      </td>
                      <td>{formatCurrency(p.total_value)}</td>
                      <td>{p.category || '-'}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {p.start_date && p.end_date
                          ? `${new Date(p.start_date).toLocaleDateString('he-IL')} - ${new Date(p.end_date).toLocaleDateString('he-IL')}`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
