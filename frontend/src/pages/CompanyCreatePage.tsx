import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Save,
  ArrowRight,
  Plus,
  Trash2,
  DollarSign,
  Award,
  Users,
  FolderOpen,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../api/supabaseClient';

interface FinancialInput {
  fiscal_year: string;
  annual_revenue: string;
  net_profit: string;
  employee_count: string;
  audited: boolean;
}

interface CertInput {
  cert_type: string;
  cert_name: string;
  cert_number: string;
  issuing_body: string;
  valid_from: string;
  valid_until: string;
}

interface PersonnelInput {
  full_name: string;
  role: string;
  department: string;
  education: string;
  years_experience: string;
  professional_certifications: string;
}

interface ProjectInput {
  project_name: string;
  client_name: string;
  client_type: string;
  start_date: string;
  end_date: string;
  total_value: string;
  category: string;
  role_type: string;
  project_type: string;
}

type TabType = 'general' | 'financials' | 'certifications' | 'personnel' | 'projects';

export function CompanyCreatePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const [general, setGeneral] = useState({
    name: '',
    company_number: '',
    founding_year: '',
    address: '',
    phone: '',
    email: '',
  });

  const [financials, setFinancials] = useState<FinancialInput[]>([
    { fiscal_year: '2024', annual_revenue: '', net_profit: '', employee_count: '', audited: true },
    { fiscal_year: '2023', annual_revenue: '', net_profit: '', employee_count: '', audited: true },
    { fiscal_year: '2022', annual_revenue: '', net_profit: '', employee_count: '', audited: true },
  ]);

  const [certs, setCerts] = useState<CertInput[]>([
    { cert_type: 'ISO', cert_name: '', cert_number: '', issuing_body: '', valid_from: '', valid_until: '' },
  ]);

  const [personnel, setPersonnel] = useState<PersonnelInput[]>([
    { full_name: '', role: '', department: '', education: '', years_experience: '', professional_certifications: '' },
  ]);

  const [projects, setProjects] = useState<ProjectInput[]>([
    { project_name: '', client_name: '', client_type: 'GOVERNMENT', start_date: '', end_date: '', total_value: '', category: '', role_type: 'PRIMARY', project_type: 'ESTABLISHMENT' },
  ]);

  function addFinancial() {
    const year = financials.length > 0 ? String(Number(financials[financials.length - 1].fiscal_year) - 1) : '2024';
    setFinancials(prev => [...prev, { fiscal_year: year, annual_revenue: '', net_profit: '', employee_count: '', audited: true }]);
  }

  function addCert() {
    setCerts(prev => [...prev, { cert_type: 'ISO', cert_name: '', cert_number: '', issuing_body: '', valid_from: '', valid_until: '' }]);
  }

  function addPerson() {
    setPersonnel(prev => [...prev, { full_name: '', role: '', department: '', education: '', years_experience: '', professional_certifications: '' }]);
  }

  function addProject() {
    setProjects(prev => [...prev, { project_name: '', client_name: '', client_type: 'GOVERNMENT', start_date: '', end_date: '', total_value: '', category: '', role_type: 'PRIMARY', project_type: 'ESTABLISHMENT' }]);
  }

  async function handleSave() {
    if (!general.name.trim()) {
      setError('נא להזין שם חברה');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Create organization
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          name: general.name,
          company_number: general.company_number || null,
          founding_year: general.founding_year ? Number(general.founding_year) : null,
          address: general.address || null,
          phone: general.phone || null,
          email: general.email || null,
        })
        .select('id')
        .single();

      if (orgErr) throw orgErr;

      // Insert financials
      const finToInsert = financials
        .filter(f => f.annual_revenue)
        .map(f => ({
          org_id: org.id,
          fiscal_year: Number(f.fiscal_year),
          annual_revenue: Number(f.annual_revenue),
          net_profit: f.net_profit ? Number(f.net_profit) : null,
          employee_count: f.employee_count ? Number(f.employee_count) : null,
          audited: f.audited,
        }));
      if (finToInsert.length > 0) {
        const { error: finErr } = await supabase.from('company_financials').insert(finToInsert);
        if (finErr) throw finErr;
      }

      // Insert certifications
      const certsToInsert = certs
        .filter(c => c.cert_name)
        .map(c => ({
          org_id: org.id,
          cert_type: c.cert_type,
          cert_name: c.cert_name,
          cert_number: c.cert_number || null,
          issuing_body: c.issuing_body || null,
          valid_from: c.valid_from || null,
          valid_until: c.valid_until || null,
        }));
      if (certsToInsert.length > 0) {
        const { error: certErr } = await supabase.from('company_certifications').insert(certsToInsert);
        if (certErr) throw certErr;
      }

      // Insert personnel
      const persToInsert = personnel
        .filter(p => p.full_name)
        .map(p => ({
          org_id: org.id,
          full_name: p.full_name,
          role: p.role || null,
          department: p.department || null,
          education: p.education || null,
          years_experience: p.years_experience ? Number(p.years_experience) : null,
          professional_certifications: p.professional_certifications
            ? p.professional_certifications.split(',').map(s => s.trim()).filter(Boolean)
            : [],
        }));
      if (persToInsert.length > 0) {
        const { error: persErr } = await supabase.from('company_personnel').insert(persToInsert);
        if (persErr) throw persErr;
      }

      // Insert projects
      const projToInsert = projects
        .filter(p => p.project_name)
        .map(p => ({
          org_id: org.id,
          project_name: p.project_name,
          client_name: p.client_name || null,
          client_type: p.client_type,
          start_date: p.start_date || null,
          end_date: p.end_date || null,
          total_value: p.total_value ? Number(p.total_value) : null,
          category: p.category || null,
          role_type: p.role_type,
          project_type: p.project_type,
        }));
      if (projToInsert.length > 0) {
        const { error: projErr } = await supabase.from('company_projects').insert(projToInsert);
        if (projErr) throw projErr;
      }

      // Update sidebar org selector
      localStorage.setItem('tenderix_selected_org_id', org.id);
      localStorage.setItem('tenderix_selected_org_name', general.name);
      window.dispatchEvent(new Event('storage'));

      navigate('/company');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאה בשמירה';
      setError(msg);
    }

    setSaving(false);
  }

  const tabs: { key: TabType; label: string; icon: typeof Building2; count?: number }[] = [
    { key: 'general', label: 'כללי', icon: Building2 },
    { key: 'financials', label: 'פיננסי', icon: DollarSign, count: financials.filter(f => f.annual_revenue).length },
    { key: 'certifications', label: 'הסמכות', icon: Award, count: certs.filter(c => c.cert_name).length },
    { key: 'personnel', label: 'כוח אדם', icon: Users, count: personnel.filter(p => p.full_name).length },
    { key: 'projects', label: 'פרויקטים', icon: FolderOpen, count: projects.filter(p => p.project_name).length },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-right">
          <h1 className="page-title">
            <Building2 size={24} style={{ color: 'var(--primary)' }} />
            יצירת חברה חדשה
          </h1>
          <p className="page-subtitle">הזן פרטי חברה, נתונים פיננסיים, הסמכות, אנשי מפתח ופרויקטים</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/company')}>
            <ArrowRight size={14} /> חזרה
          </button>
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> שומר...</>
            ) : (
              <><Save size={16} /> שמור חברה</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', marginBottom: '1rem' }}>
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}><AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {error}</span>
        </div>
      )}

      <div className="tabs">
        {tabs.map(tab => (
          <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            <tab.icon size={14} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && <span className="tab-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="card">
          <div className="card-header"><div className="card-title">פרטי חברה</div></div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">שם חברה *</label>
              <input type="text" value={general.name} onChange={e => setGeneral(p => ({ ...p, name: e.target.value }))}
                placeholder='לדוגמה: דקל מערכות אבטחה בע"מ' />
            </div>
            <div className="form-group">
              <label className="form-label">ח.פ.</label>
              <input type="text" value={general.company_number} onChange={e => setGeneral(p => ({ ...p, company_number: e.target.value }))}
                placeholder="51-123456-7" />
            </div>
            <div className="form-group">
              <label className="form-label">שנת ייסוד</label>
              <input type="number" value={general.founding_year} onChange={e => setGeneral(p => ({ ...p, founding_year: e.target.value }))}
                placeholder="2005" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">כתובת</label>
              <input type="text" value={general.address} onChange={e => setGeneral(p => ({ ...p, address: e.target.value }))}
                placeholder="הרצל 1, תל אביב" />
            </div>
            <div className="form-group">
              <label className="form-label">טלפון</label>
              <input type="text" value={general.phone} onChange={e => setGeneral(p => ({ ...p, phone: e.target.value }))}
                placeholder="03-1234567" />
            </div>
            <div className="form-group">
              <label className="form-label">אימייל</label>
              <input type="email" value={general.email} onChange={e => setGeneral(p => ({ ...p, email: e.target.value }))}
                placeholder="info@company.co.il" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'financials' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><DollarSign size={16} /> נתונים פיננסיים</div>
            <button className="btn btn-primary btn-sm" onClick={addFinancial}><Plus size={14} /> הוסף שנה</button>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>שנה</th>
                  <th>מחזור שנתי (ש"ח)</th>
                  <th>רווח נקי (ש"ח)</th>
                  <th>עובדים</th>
                  <th>מבוקר</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {financials.map((f, i) => (
                  <tr key={i}>
                    <td><input type="number" value={f.fiscal_year} onChange={e => setFinancials(prev => prev.map((x, j) => j === i ? { ...x, fiscal_year: e.target.value } : x))} style={{ width: '80px' }} /></td>
                    <td><input type="number" value={f.annual_revenue} onChange={e => setFinancials(prev => prev.map((x, j) => j === i ? { ...x, annual_revenue: e.target.value } : x))} placeholder="50000000" /></td>
                    <td><input type="number" value={f.net_profit} onChange={e => setFinancials(prev => prev.map((x, j) => j === i ? { ...x, net_profit: e.target.value } : x))} placeholder="5000000" /></td>
                    <td><input type="number" value={f.employee_count} onChange={e => setFinancials(prev => prev.map((x, j) => j === i ? { ...x, employee_count: e.target.value } : x))} placeholder="150" style={{ width: '80px' }} /></td>
                    <td><input type="checkbox" checked={f.audited} onChange={e => setFinancials(prev => prev.map((x, j) => j === i ? { ...x, audited: e.target.checked } : x))} /></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => setFinancials(prev => prev.filter((_, j) => j !== i))} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'certifications' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Award size={16} /> הסמכות ורישיונות</div>
            <button className="btn btn-primary btn-sm" onClick={addCert}><Plus size={14} /> הוסף הסמכה</button>
          </div>
          {certs.map((c, i) => (
            <div key={i} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">סוג</label>
                  <select value={c.cert_type} onChange={e => setCerts(prev => prev.map((x, j) => j === i ? { ...x, cert_type: e.target.value } : x))}>
                    <option value="ISO">ISO</option>
                    <option value="LICENSE">רישיון</option>
                    <option value="SECURITY_CLEARANCE">סיווג ביטחוני</option>
                    <option value="INSURANCE">ביטוח</option>
                    <option value="TAX">מס / ניהול ספרים</option>
                    <option value="REGISTRATION">רישום בפנקס</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">שם ההסמכה</label>
                  <input type="text" value={c.cert_name} onChange={e => setCerts(prev => prev.map((x, j) => j === i ? { ...x, cert_name: e.target.value } : x))}
                    placeholder="ISO 9001" />
                </div>
                <div className="form-group">
                  <label className="form-label">מספר</label>
                  <input type="text" value={c.cert_number} onChange={e => setCerts(prev => prev.map((x, j) => j === i ? { ...x, cert_number: e.target.value } : x))}
                    placeholder="IL-12345" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">גוף מנפיק</label>
                  <input type="text" value={c.issuing_body} onChange={e => setCerts(prev => prev.map((x, j) => j === i ? { ...x, issuing_body: e.target.value } : x))}
                    placeholder="מכון התקנים" />
                </div>
                <div className="form-group">
                  <label className="form-label">תוקף מ-</label>
                  <input type="date" value={c.valid_from} onChange={e => setCerts(prev => prev.map((x, j) => j === i ? { ...x, valid_from: e.target.value } : x))} />
                </div>
                <div className="form-group">
                  <label className="form-label">תוקף עד</label>
                  <input type="date" value={c.valid_until} onChange={e => setCerts(prev => prev.map((x, j) => j === i ? { ...x, valid_until: e.target.value } : x))} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCerts(prev => prev.filter((_, j) => j !== i))} style={{ color: 'var(--danger)' }}><Trash2 size={14} /> מחק</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'personnel' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Users size={16} /> אנשי מפתח</div>
            <button className="btn btn-primary btn-sm" onClick={addPerson}><Plus size={14} /> הוסף איש מפתח</button>
          </div>
          {personnel.map((p, i) => (
            <div key={i} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">שם מלא</label>
                  <input type="text" value={p.full_name} onChange={e => setPersonnel(prev => prev.map((x, j) => j === i ? { ...x, full_name: e.target.value } : x))}
                    placeholder="ישראל ישראלי" />
                </div>
                <div className="form-group">
                  <label className="form-label">תפקיד</label>
                  <input type="text" value={p.role} onChange={e => setPersonnel(prev => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                    placeholder="מנהל פרויקטים" />
                </div>
                <div className="form-group">
                  <label className="form-label">מחלקה</label>
                  <input type="text" value={p.department} onChange={e => setPersonnel(prev => prev.map((x, j) => j === i ? { ...x, department: e.target.value } : x))}
                    placeholder="ביצוע" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">השכלה</label>
                  <input type="text" value={p.education} onChange={e => setPersonnel(prev => prev.map((x, j) => j === i ? { ...x, education: e.target.value } : x))}
                    placeholder="B.Sc הנדסת חשמל" />
                </div>
                <div className="form-group">
                  <label className="form-label">שנות ניסיון</label>
                  <input type="number" value={p.years_experience} onChange={e => setPersonnel(prev => prev.map((x, j) => j === i ? { ...x, years_experience: e.target.value } : x))}
                    placeholder="15" />
                </div>
                <div className="form-group">
                  <label className="form-label">הסמכות מקצועיות (מופרדות בפסיקים)</label>
                  <input type="text" value={p.professional_certifications} onChange={e => setPersonnel(prev => prev.map((x, j) => j === i ? { ...x, professional_certifications: e.target.value } : x))}
                    placeholder="PMP, Milestone Certified" />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPersonnel(prev => prev.filter((_, j) => j !== i))} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><FolderOpen size={16} /> תיק פרויקטים</div>
            <button className="btn btn-primary btn-sm" onClick={addProject}><Plus size={14} /> הוסף פרויקט</button>
          </div>
          {projects.map((p, i) => (
            <div key={i} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">שם פרויקט</label>
                  <input type="text" value={p.project_name} onChange={e => setProjects(prev => prev.map((x, j) => j === i ? { ...x, project_name: e.target.value } : x))}
                    placeholder="הקמת מערכת מצלמות - עירייה" />
                </div>
                <div className="form-group">
                  <label className="form-label">לקוח</label>
                  <input type="text" value={p.client_name} onChange={e => setProjects(prev => prev.map((x, j) => j === i ? { ...x, client_name: e.target.value } : x))}
                    placeholder="עיריית תל אביב" />
                </div>
                <div className="form-group">
                  <label className="form-label">סוג לקוח</label>
                  <select value={p.client_type} onChange={e => setProjects(prev => prev.map((x, j) => j === i ? { ...x, client_type: e.target.value } : x))}>
                    <option value="GOVERNMENT">ממשלתי</option>
                    <option value="MUNICIPAL">רשות מקומית</option>
                    <option value="DEFENSE">ביטחוני</option>
                    <option value="PRIVATE">פרטי</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ערך (ש"ח)</label>
                  <input type="number" value={p.total_value} onChange={e => setProjects(prev => prev.map((x, j) => j === i ? { ...x, total_value: e.target.value } : x))}
                    placeholder="20000000" />
                </div>
                <div className="form-group">
                  <label className="form-label">תאריך התחלה</label>
                  <input type="date" value={p.start_date} onChange={e => setProjects(prev => prev.map((x, j) => j === i ? { ...x, start_date: e.target.value } : x))} />
                </div>
                <div className="form-group">
                  <label className="form-label">תאריך סיום</label>
                  <input type="date" value={p.end_date} onChange={e => setProjects(prev => prev.map((x, j) => j === i ? { ...x, end_date: e.target.value } : x))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">קטגוריה</label>
                  <input type="text" value={p.category} onChange={e => setProjects(prev => prev.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}
                    placeholder="מצלמות אבטחה / תקשורת" />
                </div>
                <div className="form-group">
                  <label className="form-label">תפקיד בפרויקט</label>
                  <select value={p.role_type} onChange={e => setProjects(prev => prev.map((x, j) => j === i ? { ...x, role_type: e.target.value } : x))}>
                    <option value="PRIMARY">קבלן ראשי</option>
                    <option value="SUBCONTRACTOR">קבלן משנה</option>
                    <option value="PARTNERSHIP">שותפות</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">סוג פרויקט</label>
                  <select value={p.project_type} onChange={e => setProjects(prev => prev.map((x, j) => j === i ? { ...x, project_type: e.target.value } : x))}>
                    <option value="ESTABLISHMENT">הקמה</option>
                    <option value="MAINTENANCE">תחזוקה</option>
                    <option value="COMBINED">משולב</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setProjects(prev => prev.filter((_, j) => j !== i))} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
