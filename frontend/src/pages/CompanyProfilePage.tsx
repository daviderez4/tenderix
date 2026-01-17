import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Award,
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Globe,
  Wrench,
  Clock,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { api } from '../api/tenderix';
import type { CompanyProject, CompanyCertification, CompanyFinancial, Organization, Personnel } from '../api/tenderix';
import { getCurrentOrgId } from '../api/config';
import { Loading } from '../components/Loading';

export function CompanyProfilePage() {
  const [activeTab, setActiveTab] = useState<'basic' | 'projects' | 'certificates' | 'people' | 'financials'>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data states
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<CompanyProject[]>([]);
  const [certificates, setCertificates] = useState<CompanyCertification[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [financials, setFinancials] = useState<CompanyFinancial[]>([]);

  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const orgId = getCurrentOrgId();

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [orgData, projectsData, certsData, personnelData, financialsData] = await Promise.all([
        api.organizations.get(orgId),
        api.company.getProjects(orgId),
        api.company.getCertifications(orgId),
        api.company.getPersonnel(orgId),
        api.company.getFinancials(orgId),
      ]);

      setOrganization(orgData);
      setProjects(projectsData || []);
      setCertificates(certsData || []);
      setPersonnel(personnelData || []);
      setFinancials(financialsData || []);
    } catch (error) {
      console.error('Error loading company data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Project CRUD
  async function saveProject(data: Partial<CompanyProject>) {
    setSaving(true);
    try {
      if (editingItem?.id) {
        await api.company.updateProject(editingItem.id, data);
      } else {
        await api.company.createProject({ ...data, org_id: orgId });
      }
      await loadAllData();
      setShowProjectModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving project:', error);
      alert('שגיאה בשמירת הפרויקט');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(id: string) {
    if (!confirm('האם למחוק את הפרויקט?')) return;
    try {
      await api.company.deleteProject(id);
      await loadAllData();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  }

  // Certificate CRUD
  async function saveCertificate(data: Partial<CompanyCertification>) {
    setSaving(true);
    try {
      if (editingItem?.id) {
        await api.company.updateCertification(editingItem.id, data);
      } else {
        await api.company.createCertification({ ...data, org_id: orgId });
      }
      await loadAllData();
      setShowCertModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving certificate:', error);
      alert('שגיאה בשמירת ההסמכה');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCertificate(id: string) {
    if (!confirm('האם למחוק את ההסמכה?')) return;
    try {
      await api.company.deleteCertification(id);
      await loadAllData();
    } catch (error) {
      console.error('Error deleting certificate:', error);
    }
  }

  // Personnel CRUD
  async function savePersonnel(data: Partial<Personnel>) {
    setSaving(true);
    try {
      if (editingItem?.id) {
        await api.company.updatePersonnel(editingItem.id, data);
      } else {
        await api.company.createPersonnel({ ...data, org_id: orgId });
      }
      await loadAllData();
      setShowPersonModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving personnel:', error);
      alert('שגיאה בשמירת איש מפתח');
    } finally {
      setSaving(false);
    }
  }

  async function deletePersonnel(id: string) {
    if (!confirm('האם למחוק את איש המפתח?')) return;
    try {
      await api.company.deletePersonnel(id);
      await loadAllData();
    } catch (error) {
      console.error('Error deleting personnel:', error);
    }
  }

  // Financial CRUD
  async function saveFinancial(data: Partial<CompanyFinancial>) {
    setSaving(true);
    try {
      if (editingItem?.id) {
        await api.company.updateFinancial(editingItem.id, data);
      } else {
        await api.company.createFinancial({ ...data, org_id: orgId });
      }
      await loadAllData();
      setShowFinancialModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving financial:', error);
      alert('שגיאה בשמירת נתונים פיננסיים');
    } finally {
      setSaving(false);
    }
  }

  async function deleteFinancial(id: string) {
    if (!confirm('האם למחוק את השנה?')) return;
    try {
      await api.company.deleteFinancial(id);
      await loadAllData();
    } catch (error) {
      console.error('Error deleting financial:', error);
    }
  }

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);
  };

  const getCertStatus = (validUntil?: string): 'valid' | 'expiring' | 'expired' => {
    if (!validUntil) return 'valid';
    const expiry = new Date(validUntil);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry < 90) return 'expiring';
    return 'valid';
  };

  const tabs = [
    { id: 'basic', label: 'פרטים בסיסיים', icon: Building2 },
    { id: 'projects', label: `תיק פרויקטים (${projects.length})`, icon: Briefcase },
    { id: 'certificates', label: `הסמכות (${certificates.length})`, icon: Award },
    { id: 'people', label: `אנשי מפתח (${personnel.length})`, icon: Users },
    { id: 'financials', label: `נתונים פיננסיים (${financials.length})`, icon: DollarSign },
  ];

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>פרופיל חברה</h1>
          <p className="page-subtitle">{organization?.name || 'Company Profile Manager'}</p>
        </div>
      </div>

      {/* Info Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(16, 185, 129, 0.15))',
        borderRadius: '12px',
        padding: '1rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        border: '1px solid rgba(124, 58, 237, 0.3)',
      }}>
        <AlertCircle size={24} style={{ color: '#7c3aed' }} />
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>מאגר מידע דינמי</div>
          <div style={{ fontSize: '0.875rem', color: '#aaa' }}>
            הנתונים כאן משמשים לבדיקה אוטומטית של עמידה בתנאי סף במכרזים
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid #333',
        paddingBottom: '0.5rem',
        overflowX: 'auto',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: activeTab === tab.id ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              color: activeTab === tab.id ? '#a78bfa' : '#888',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeTab === tab.id ? 600 : 400,
              borderBottom: activeTab === tab.id ? '2px solid #7c3aed' : '2px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Basic Info Tab */}
      {activeTab === 'basic' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} style={{ color: '#7c3aed' }} />
              פרטי חברה
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <InfoRow label="שם החברה" value={organization?.name || '-'} />
              <InfoRow label="ח.פ." value={organization?.company_number || '-'} />
              <InfoRow label="שנת הקמה" value={organization?.founding_year?.toString() || '-'} />
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} style={{ color: '#00d4ff' }} />
              פרטי התקשרות
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {organization?.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ccc' }}>
                  <MapPin size={16} style={{ color: '#888' }} />
                  {organization.address}
                </div>
              )}
              {organization?.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ccc' }}>
                  <Phone size={16} style={{ color: '#888' }} />
                  {organization.phone}
                </div>
              )}
              {organization?.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ccc' }}>
                  <Mail size={16} style={{ color: '#888' }} />
                  {organization.email}
                </div>
              )}
              {organization?.website && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ccc' }}>
                  <Globe size={16} style={{ color: '#888' }} />
                  {organization.website}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={20} style={{ color: '#10b981' }} />
              סיכום פיננסי
            </h3>
            {financials.length > 0 ? (
              financials.slice(0, 3).map((fin) => (
                <div key={fin.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                }}>
                  <span style={{ color: '#888' }}>{fin.fiscal_year}</span>
                  <span style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(fin.annual_revenue)}</span>
                </div>
              ))
            ) : (
              <p style={{ color: '#666', textAlign: 'center' }}>לא הוזנו נתונים פיננסיים</p>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={20} style={{ color: '#f59e0b' }} />
              סיכום תיק עבודות
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#7c3aed' }}>{projects.length}</div>
                <div style={{ color: '#888', fontSize: '0.875rem' }}>פרויקטים</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
                  {formatCurrency(projects.reduce((sum, p) => sum + (p.total_value || 0), 0))}
                </div>
                <div style={{ color: '#888', fontSize: '0.875rem' }}>היקף כולל</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.875rem', color: '#888' }}>סה"כ {projects.length} פרויקטים</span>
            </div>
            <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowProjectModal(true); }}>
              <Plus size={18} />
              הוסף פרויקט
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Briefcase size={48} style={{ color: '#444', marginBottom: '1rem' }} />
              <p style={{ color: '#888' }}>אין פרויקטים עדיין</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowProjectModal(true)}>
                הוסף פרויקט ראשון
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {projects.map((project) => (
                <div key={project.id} className="card" style={{
                  borderRight: `4px solid ${
                    project.project_type === 'ESTABLISHMENT' ? '#00d4ff' :
                    project.project_type === 'MAINTENANCE' ? '#10b981' : '#7c3aed'
                  }`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ marginBottom: '0.25rem' }}>{project.project_name}</h4>
                      <div style={{ fontSize: '0.875rem', color: '#888' }}>{project.client_name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        background: project.project_type === 'ESTABLISHMENT' ? 'rgba(0, 212, 255, 0.15)' :
                                    project.project_type === 'MAINTENANCE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(124, 58, 237, 0.15)',
                        color: project.project_type === 'ESTABLISHMENT' ? '#00d4ff' :
                               project.project_type === 'MAINTENANCE' ? '#10b981' : '#7c3aed',
                      }}>
                        {project.project_type === 'ESTABLISHMENT' ? 'הקמה' :
                         project.project_type === 'MAINTENANCE' ? 'אחזקה' : 'משולב'}
                      </span>
                      <button onClick={() => { setEditingItem(project); setShowProjectModal(true); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteProject(project.id)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>היקף כולל</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(project.total_value)}</div>
                    </div>
                    {project.establishment_value && project.establishment_value > 0 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>היקף הקמה</div>
                        <div style={{ fontWeight: 600, color: '#00d4ff' }}>{formatCurrency(project.establishment_value)}</div>
                      </div>
                    )}
                    {project.maintenance_value && project.maintenance_value > 0 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>היקף אחזקה</div>
                        <div style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(project.maintenance_value)}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>תפקיד</div>
                      <div style={{ fontWeight: 600 }}>
                        {project.role_type === 'PRIMARY' ? 'קבלן ראשי' :
                         project.role_type === 'SUBCONTRACTOR' ? 'קבלן משנה' : 'שותפות'}
                        {project.role_percentage && ` (${project.role_percentage}%)`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#888', marginTop: '1rem' }}>
                    <span>
                      <Calendar size={14} style={{ verticalAlign: 'middle', marginLeft: '0.25rem' }} />
                      {project.start_date} - {project.end_date || 'פעיל'}
                    </span>
                    <span>{project.client_type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Certificates Tab */}
      {activeTab === 'certificates' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowCertModal(true); }}>
              <Plus size={18} />
              הוסף הסמכה
            </button>
          </div>

          {certificates.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Award size={48} style={{ color: '#444', marginBottom: '1rem' }} />
              <p style={{ color: '#888' }}>אין הסמכות עדיין</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {certificates.map((cert) => {
                const status = getCertStatus(cert.valid_until);
                return (
                  <div key={cert.id} className="card" style={{
                    borderRight: `4px solid ${
                      status === 'valid' ? '#22c55e' :
                      status === 'expiring' ? '#f59e0b' : '#ef4444'
                    }`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{cert.cert_name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#888' }}>{cert.issuing_body}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          background: status === 'valid' ? 'rgba(34, 197, 94, 0.15)' :
                                      status === 'expiring' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: status === 'valid' ? '#22c55e' :
                                 status === 'expiring' ? '#f59e0b' : '#ef4444',
                        }}>
                          {status === 'valid' ? 'בתוקף' :
                           status === 'expiring' ? 'עומד לפוג' : 'פג תוקף'}
                        </span>
                        <button onClick={() => { setEditingItem(cert); setShowCertModal(true); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteCertificate(cert.id)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '0.875rem' }}>
                      <Clock size={14} />
                      תוקף עד: {cert.valid_until || 'לא צוין'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Key People Tab */}
      {activeTab === 'people' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowPersonModal(true); }}>
              <Plus size={18} />
              הוסף איש מפתח
            </button>
          </div>

          {personnel.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Users size={48} style={{ color: '#444', marginBottom: '1rem' }} />
              <p style={{ color: '#888' }}>אין אנשי מפתח עדיין</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
              {personnel.map((person) => (
                <div key={person.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                      }}>
                        {person.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h4 style={{ marginBottom: '0.25rem' }}>{person.full_name}</h4>
                        <div style={{ color: '#888', fontSize: '0.9rem' }}>{person.role}</div>
                        {person.years_experience && (
                          <div style={{ color: '#666', fontSize: '0.85rem' }}>{person.years_experience} שנות ניסיון</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setEditingItem(person); setShowPersonModal(true); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deletePersonnel(person.id)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {person.education && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.25rem' }}>השכלה</div>
                      <div style={{ color: '#ccc' }}>{person.education} {person.education_institution && `- ${person.education_institution}`}</div>
                    </div>
                  )}

                  {person.professional_certifications && person.professional_certifications.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>הסמכות</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {person.professional_certifications.map((cert, i) => (
                          <span key={i} style={{
                            padding: '0.25rem 0.75rem',
                            background: 'rgba(124, 58, 237, 0.15)',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            color: '#a78bfa',
                          }}>
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Financials Tab */}
      {activeTab === 'financials' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowFinancialModal(true); }}>
              <Plus size={18} />
              הוסף שנה
            </button>
          </div>

          {financials.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <DollarSign size={48} style={{ color: '#444', marginBottom: '1rem' }} />
              <p style={{ color: '#888' }}>אין נתונים פיננסיים עדיין</p>
            </div>
          ) : (
            <div className="card">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ textAlign: 'right', padding: '1rem', color: '#888' }}>שנה</th>
                    <th style={{ textAlign: 'right', padding: '1rem', color: '#888' }}>מחזור שנתי</th>
                    <th style={{ textAlign: 'right', padding: '1rem', color: '#888' }}>רווח נקי</th>
                    <th style={{ textAlign: 'right', padding: '1rem', color: '#888' }}>מספר עובדים</th>
                    <th style={{ textAlign: 'right', padding: '1rem', color: '#888' }}>מבוקר</th>
                    <th style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {financials.map((fin) => (
                    <tr key={fin.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{fin.fiscal_year}</td>
                      <td style={{ padding: '1rem', color: '#10b981' }}>{formatCurrency(fin.annual_revenue)}</td>
                      <td style={{ padding: '1rem' }}>{formatCurrency(fin.net_profit)}</td>
                      <td style={{ padding: '1rem' }}>{fin.employee_count || '-'}</td>
                      <td style={{ padding: '1rem' }}>
                        {fin.audited ? (
                          <CheckCircle size={18} style={{ color: '#22c55e' }} />
                        ) : (
                          <span style={{ color: '#666' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button onClick={() => { setEditingItem(fin); setShowFinancialModal(true); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginLeft: '0.5rem' }}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteFinancial(fin.id)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <ProjectModal
          project={editingItem}
          saving={saving}
          onSave={saveProject}
          onClose={() => { setShowProjectModal(false); setEditingItem(null); }}
        />
      )}

      {/* Certificate Modal */}
      {showCertModal && (
        <CertificateModal
          certificate={editingItem}
          saving={saving}
          onSave={saveCertificate}
          onClose={() => { setShowCertModal(false); setEditingItem(null); }}
        />
      )}

      {/* Personnel Modal */}
      {showPersonModal && (
        <PersonnelModal
          person={editingItem}
          saving={saving}
          onSave={savePersonnel}
          onClose={() => { setShowPersonModal(false); setEditingItem(null); }}
        />
      )}

      {/* Financial Modal */}
      {showFinancialModal && (
        <FinancialModal
          financial={editingItem}
          saving={saving}
          onSave={saveFinancial}
          onClose={() => { setShowFinancialModal(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.5rem 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// === MODALS ===

function ProjectModal({ project, saving, onSave, onClose }: {
  project: CompanyProject | null;
  saving: boolean;
  onSave: (data: Partial<CompanyProject>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<CompanyProject>>(project || {
    project_name: '',
    client_name: '',
    client_type: 'GOVERNMENT',
    project_type: 'COMBINED',
    role_type: 'PRIMARY',
    role_percentage: 100,
  });

  return (
    <Modal title={project ? 'עריכת פרויקט' : 'הוספת פרויקט'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <FormField label="שם הפרויקט *">
          <input
            type="text"
            value={form.project_name || ''}
            onChange={(e) => setForm({ ...form, project_name: e.target.value })}
            className="input"
          />
        </FormField>

        <FormField label="שם הלקוח *">
          <input
            type="text"
            value={form.client_name || ''}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            className="input"
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="סוג לקוח">
            <select
              value={form.client_type || 'GOVERNMENT'}
              onChange={(e) => setForm({ ...form, client_type: e.target.value })}
              className="input"
            >
              <option value="GOVERNMENT">ממשלתי</option>
              <option value="MUNICIPAL">רשות מקומית</option>
              <option value="PUBLIC_COMPANY">חברה ציבורית</option>
              <option value="PRIVATE">פרטי</option>
              <option value="DEFENSE">ביטחוני</option>
            </select>
          </FormField>

          <FormField label="סוג פרויקט">
            <select
              value={form.project_type || 'COMBINED'}
              onChange={(e) => setForm({ ...form, project_type: e.target.value })}
              className="input"
            >
              <option value="ESTABLISHMENT">הקמה</option>
              <option value="MAINTENANCE">אחזקה</option>
              <option value="COMBINED">משולב</option>
            </select>
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="תאריך התחלה">
            <input
              type="date"
              value={form.start_date || ''}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="input"
            />
          </FormField>

          <FormField label="תאריך סיום">
            <input
              type="date"
              value={form.end_date || ''}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="input"
            />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <FormField label="היקף כולל (₪)">
            <input
              type="number"
              value={form.total_value || ''}
              onChange={(e) => setForm({ ...form, total_value: parseFloat(e.target.value) || undefined })}
              className="input"
            />
          </FormField>

          <FormField label="היקף הקמה (₪)">
            <input
              type="number"
              value={form.establishment_value || ''}
              onChange={(e) => setForm({ ...form, establishment_value: parseFloat(e.target.value) || undefined })}
              className="input"
            />
          </FormField>

          <FormField label="היקף אחזקה (₪)">
            <input
              type="number"
              value={form.maintenance_value || ''}
              onChange={(e) => setForm({ ...form, maintenance_value: parseFloat(e.target.value) || undefined })}
              className="input"
            />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="תפקיד">
            <select
              value={form.role_type || 'PRIMARY'}
              onChange={(e) => setForm({ ...form, role_type: e.target.value })}
              className="input"
            >
              <option value="PRIMARY">קבלן ראשי</option>
              <option value="SUBCONTRACTOR">קבלן משנה</option>
              <option value="PARTNERSHIP">שותפות</option>
            </select>
          </FormField>

          <FormField label="אחוז תפקיד">
            <input
              type="number"
              min="0"
              max="100"
              value={form.role_percentage || 100}
              onChange={(e) => setForm({ ...form, role_percentage: parseFloat(e.target.value) || 100 })}
              className="input"
            />
          </FormField>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn" onClick={onClose}>ביטול</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(form)}
            disabled={saving || !form.project_name || !form.client_name}
          >
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            שמור
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CertificateModal({ certificate, saving, onSave, onClose }: {
  certificate: CompanyCertification | null;
  saving: boolean;
  onSave: (data: Partial<CompanyCertification>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<CompanyCertification>>(certificate || {
    cert_type: 'ISO',
    cert_name: '',
  });

  return (
    <Modal title={certificate ? 'עריכת הסמכה' : 'הוספת הסמכה'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="סוג">
            <select
              value={form.cert_type || 'ISO'}
              onChange={(e) => setForm({ ...form, cert_type: e.target.value })}
              className="input"
            >
              <option value="ISO">ISO</option>
              <option value="LICENSE">רישיון</option>
              <option value="SECURITY_CLEARANCE">סיווג ביטחוני</option>
              <option value="CONTRACTOR_REG">רישום קבלנים</option>
              <option value="TAX">אישור מס</option>
              <option value="OTHER">אחר</option>
            </select>
          </FormField>

          <FormField label="שם ההסמכה *">
            <input
              type="text"
              value={form.cert_name || ''}
              onChange={(e) => setForm({ ...form, cert_name: e.target.value })}
              className="input"
            />
          </FormField>
        </div>

        <FormField label="גורם מנפיק">
          <input
            type="text"
            value={form.issuing_body || ''}
            onChange={(e) => setForm({ ...form, issuing_body: e.target.value })}
            className="input"
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="תוקף מ-">
            <input
              type="date"
              value={form.valid_from || ''}
              onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
              className="input"
            />
          </FormField>

          <FormField label="תוקף עד">
            <input
              type="date"
              value={form.valid_until || ''}
              onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
              className="input"
            />
          </FormField>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn" onClick={onClose}>ביטול</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(form)}
            disabled={saving || !form.cert_name}
          >
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            שמור
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PersonnelModal({ person, saving, onSave, onClose }: {
  person: Personnel | null;
  saving: boolean;
  onSave: (data: Partial<Personnel>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Personnel>>(person || {
    full_name: '',
    role: '',
  });
  const [certsText, setCertsText] = useState((person?.professional_certifications || []).join(', '));

  const handleSave = () => {
    const certs = certsText.split(',').map(c => c.trim()).filter(c => c);
    onSave({ ...form, professional_certifications: certs });
  };

  return (
    <Modal title={person ? 'עריכת איש מפתח' : 'הוספת איש מפתח'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="שם מלא *">
            <input
              type="text"
              value={form.full_name || ''}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="input"
            />
          </FormField>

          <FormField label="תפקיד *">
            <input
              type="text"
              value={form.role || ''}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="input"
            />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="מחלקה">
            <input
              type="text"
              value={form.department || ''}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="input"
            />
          </FormField>

          <FormField label="שנות ניסיון">
            <input
              type="number"
              value={form.years_experience || ''}
              onChange={(e) => setForm({ ...form, years_experience: parseInt(e.target.value) || undefined })}
              className="input"
            />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="השכלה">
            <input
              type="text"
              value={form.education || ''}
              onChange={(e) => setForm({ ...form, education: e.target.value })}
              className="input"
              placeholder="לדוגמה: מהנדס חשמל"
            />
          </FormField>

          <FormField label="מוסד לימודים">
            <input
              type="text"
              value={form.education_institution || ''}
              onChange={(e) => setForm({ ...form, education_institution: e.target.value })}
              className="input"
              placeholder="לדוגמה: טכניון"
            />
          </FormField>
        </div>

        <FormField label="הסמכות מקצועיות (מופרדות בפסיק)">
          <input
            type="text"
            value={certsText}
            onChange={(e) => setCertsText(e.target.value)}
            className="input"
            placeholder="לדוגמה: PMP, CCIE, Milestone Certified"
          />
        </FormField>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn" onClick={onClose}>ביטול</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !form.full_name || !form.role}
          >
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            שמור
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FinancialModal({ financial, saving, onSave, onClose }: {
  financial: CompanyFinancial | null;
  saving: boolean;
  onSave: (data: Partial<CompanyFinancial>) => void;
  onClose: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState<Partial<CompanyFinancial>>(financial || {
    fiscal_year: currentYear - 1,
    audited: false,
  });

  return (
    <Modal title={financial ? 'עריכת נתונים פיננסיים' : 'הוספת שנה'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <FormField label="שנת כספים *">
          <input
            type="number"
            value={form.fiscal_year || currentYear - 1}
            onChange={(e) => setForm({ ...form, fiscal_year: parseInt(e.target.value) })}
            className="input"
            min="2000"
            max={currentYear}
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="מחזור שנתי (₪)">
            <input
              type="number"
              value={form.annual_revenue || ''}
              onChange={(e) => setForm({ ...form, annual_revenue: parseFloat(e.target.value) || undefined })}
              className="input"
            />
          </FormField>

          <FormField label="רווח נקי (₪)">
            <input
              type="number"
              value={form.net_profit || ''}
              onChange={(e) => setForm({ ...form, net_profit: parseFloat(e.target.value) || undefined })}
              className="input"
            />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="מספר עובדים">
            <input
              type="number"
              value={form.employee_count || ''}
              onChange={(e) => setForm({ ...form, employee_count: parseInt(e.target.value) || undefined })}
              className="input"
            />
          </FormField>

          <FormField label="מבוקר">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.audited || false}
                onChange={(e) => setForm({ ...form, audited: e.target.checked })}
              />
              דוחות מבוקרים
            </label>
          </FormField>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn" onClick={onClose}>ביטול</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave(form)}
            disabled={saving || !form.fiscal_year}
          >
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            שמור
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Helper Components
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div
        className="card"
        style={{
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.875rem' }}>
        {label}
      </label>
      {children}
    </div>
  );
}
