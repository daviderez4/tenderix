import { useState } from 'react';
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
  Clock
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  totalValue: number;
  executionValue: number;
  maintenanceValue: number;
  maintenanceMonths: number;
  projectType: 'execution' | 'maintenance' | 'combined';
  role: 'main' | 'subcontractor';
  rolePercentage: number;
  technologies: string[];
  cameraCount?: number;
  description: string;
  completionType: 'delivery' | 'final_invoice' | 'warranty_end';
  clientApproval: boolean;
}

interface Certificate {
  id: string;
  type: string;
  name: string;
  issuer: string;
  validUntil: string;
  status: 'valid' | 'expiring' | 'expired';
}

interface KeyPerson {
  id: string;
  name: string;
  role: string;
  experience: number;
  education: string;
  certifications: string[];
  projects: string[];
}

export function CompanyProfilePage() {
  const [activeTab, setActiveTab] = useState<'basic' | 'projects' | 'certificates' | 'people'>('basic');
  const [, setShowAddProject] = useState(false);

  // Mock data
  const companyInfo = {
    name: 'חברת הדגמה בע"מ',
    registrationNumber: '514123456',
    foundedYear: 2010,
    employees: 85,
    annualRevenue: [
      { year: 2023, amount: 45000000 },
      { year: 2022, amount: 38000000 },
      { year: 2021, amount: 32000000 },
    ],
    fields: ['מערכות אבטחה', 'מצלמות', 'בקרת גישה', 'PSIM'],
    contractorRating: 'קבלן רשום ג-1',
    address: 'רח\' התעשייה 15, חולון',
    phone: '03-5551234',
    email: 'info@demo-company.co.il',
    website: 'www.demo-company.co.il',
    parentCompany: 'קבוצת הדגמה בע"מ',
    subsidiaries: ['חברת תחזוקה בע"מ', 'מערכות תוכנה בע"מ'],
  };

  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: 'מערכת אבטחה עיריית תל אביב',
      client: 'עיריית תל אביב',
      startDate: '2022-03-01',
      endDate: '2023-06-30',
      totalValue: 8500000,
      executionValue: 6000000,
      maintenanceValue: 2500000,
      maintenanceMonths: 36,
      projectType: 'combined',
      role: 'main',
      rolePercentage: 100,
      technologies: ['Milestone VMS', 'Axis Cameras', 'Genetec Access Control'],
      cameraCount: 450,
      description: 'התקנת מערכת מצלמות עירונית כולל VMS ובקרת גישה',
      completionType: 'delivery',
      clientApproval: true,
    },
    {
      id: '2',
      name: 'פרויקט בטחון משרד הביטחון',
      client: 'משרד הביטחון',
      startDate: '2021-01-15',
      endDate: '2022-12-31',
      totalValue: 15000000,
      executionValue: 12000000,
      maintenanceValue: 3000000,
      maintenanceMonths: 24,
      projectType: 'combined',
      role: 'main',
      rolePercentage: 80,
      technologies: ['PSIM', 'Thermal Cameras', 'Perimeter Detection'],
      cameraCount: 280,
      description: 'מערכת אבטחה היקפית כולל גילוי חדירה',
      completionType: 'final_invoice',
      clientApproval: true,
    },
    {
      id: '3',
      name: 'תחזוקת מצלמות רכבת ישראל',
      client: 'רכבת ישראל',
      startDate: '2020-06-01',
      endDate: '2024-05-31',
      totalValue: 4200000,
      executionValue: 0,
      maintenanceValue: 4200000,
      maintenanceMonths: 48,
      projectType: 'maintenance',
      role: 'main',
      rolePercentage: 100,
      technologies: ['Bosch VMS', 'Sony Cameras'],
      cameraCount: 1200,
      description: 'אחזקה שוטפת של מערכת מצלמות בתחנות',
      completionType: 'warranty_end',
      clientApproval: true,
    },
  ]);

  const [certificates] = useState<Certificate[]>([
    { id: '1', type: 'ISO', name: 'ISO 9001:2015', issuer: 'מכון התקנים', validUntil: '2025-12-31', status: 'valid' },
    { id: '2', type: 'ISO', name: 'ISO 27001', issuer: 'מכון התקנים', validUntil: '2025-06-30', status: 'valid' },
    { id: '3', type: 'Security', name: 'סיווג ביטחוני', issuer: 'מלמ"ב', validUntil: '2024-03-15', status: 'expiring' },
    { id: '4', type: 'Contractor', name: 'רישום קבלנים', issuer: 'רשם הקבלנים', validUntil: '2025-12-31', status: 'valid' },
  ]);

  const [keyPeople] = useState<KeyPerson[]>([
    {
      id: '1',
      name: 'דוד כהן',
      role: 'מנהל פרויקטים בכיר',
      experience: 15,
      education: 'מהנדס חשמל, טכניון',
      certifications: ['PMP', 'CCIE Security'],
      projects: ['עיריית תל אביב', 'משרד הביטחון'],
    },
    {
      id: '2',
      name: 'שרה לוי',
      role: 'מהנדסת מערכות',
      experience: 10,
      education: 'מהנדסת תוכנה, אונ\' ת"א',
      certifications: ['Milestone Certified', 'Genetec Certified'],
      projects: ['רכבת ישראל', 'עיריית תל אביב'],
    },
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);
  };

  const tabs = [
    { id: 'basic', label: 'פרטים בסיסיים', icon: Building2 },
    { id: 'projects', label: 'תיק פרויקטים', icon: Briefcase },
    { id: 'certificates', label: 'הסמכות ורישיונות', icon: Award },
    { id: 'people', label: 'אנשי מפתח', icon: Users },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>פרופיל חברה</h1>
          <p className="page-subtitle">Company Profile Manager - מודול רוחבי</p>
        </div>
        <button className="btn-primary">
          <Edit2 size={18} />
          עריכת פרופיל
        </button>
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
            אם הוזן פרויקט ובמהלך מכרז מסוים חודדו בו פרטים - המידע ישמר אוטומטית לעתיד
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
            }}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Basic Info Tab */}
      {activeTab === 'basic' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} style={{ color: '#7c3aed' }} />
              פרטי חברה
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <InfoRow label="שם החברה" value={companyInfo.name} />
              <InfoRow label="ח.פ." value={companyInfo.registrationNumber} />
              <InfoRow label="שנת הקמה" value={companyInfo.foundedYear.toString()} />
              <InfoRow label="מספר עובדים" value={companyInfo.employees.toString()} />
              <InfoRow label="סיווג קבלני" value={companyInfo.contractorRating} />
              <InfoRow label="חברת אם" value={companyInfo.parentCompany} />
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={20} style={{ color: '#10b981' }} />
              מחזור כספי
            </h3>
            {companyInfo.annualRevenue.map((rev) => (
              <div key={rev.year} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                marginBottom: '0.5rem',
              }}>
                <span style={{ color: '#888' }}>{rev.year}</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(rev.amount)}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={20} style={{ color: '#f59e0b' }} />
              תחומי פעילות
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {companyInfo.fields.map((field) => (
                <span key={field} style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(245, 158, 11, 0.15)',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  color: '#f59e0b',
                }}>
                  {field}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} style={{ color: '#00d4ff' }} />
              פרטי התקשרות
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ccc' }}>
                <MapPin size={16} style={{ color: '#888' }} />
                {companyInfo.address}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ccc' }}>
                <Phone size={16} style={{ color: '#888' }} />
                {companyInfo.phone}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ccc' }}>
                <Mail size={16} style={{ color: '#888' }} />
                {companyInfo.email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ccc' }}>
                <Globe size={16} style={{ color: '#888' }} />
                {companyInfo.website}
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
            <button className="btn-primary" onClick={() => setShowAddProject(true)}>
              <Plus size={18} />
              הוסף פרויקט
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {projects.map((project) => (
              <div key={project.id} className="card" style={{
                borderRight: `4px solid ${
                  project.projectType === 'execution' ? '#00d4ff' :
                  project.projectType === 'maintenance' ? '#10b981' : '#7c3aed'
                }`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ marginBottom: '0.25rem' }}>{project.name}</h4>
                    <div style={{ fontSize: '0.875rem', color: '#888' }}>{project.client}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      background: project.projectType === 'execution' ? 'rgba(0, 212, 255, 0.15)' :
                                  project.projectType === 'maintenance' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(124, 58, 237, 0.15)',
                      color: project.projectType === 'execution' ? '#00d4ff' :
                             project.projectType === 'maintenance' ? '#10b981' : '#7c3aed',
                    }}>
                      {project.projectType === 'execution' ? 'הקמה' :
                       project.projectType === 'maintenance' ? 'אחזקה' : 'משולב'}
                    </span>
                    {project.clientApproval && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#22c55e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}>
                        <CheckCircle size={12} />
                        אישור מזמין
                      </span>
                    )}
                  </div>
                </div>

                <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1rem' }}>{project.description}</p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>היקף כולל</div>
                    <div style={{ fontWeight: 600 }}>{formatCurrency(project.totalValue)}</div>
                  </div>
                  {project.executionValue > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>היקף הקמה</div>
                      <div style={{ fontWeight: 600, color: '#00d4ff' }}>{formatCurrency(project.executionValue)}</div>
                    </div>
                  )}
                  {project.maintenanceValue > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>היקף אחזקה</div>
                      <div style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(project.maintenanceValue)}</div>
                    </div>
                  )}
                  {project.maintenanceMonths > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>משך אחזקה</div>
                      <div style={{ fontWeight: 600 }}>{project.maintenanceMonths} חודשים</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>תפקיד</div>
                    <div style={{ fontWeight: 600 }}>
                      {project.role === 'main' ? 'קבלן ראשי' : 'קבלן משנה'} ({project.rolePercentage}%)
                    </div>
                  </div>
                  {project.cameraCount && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>מספר מצלמות</div>
                      <div style={{ fontWeight: 600 }}>{project.cameraCount}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {project.technologies.map((tech) => (
                    <span key={tech} style={{
                      padding: '0.25rem 0.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      color: '#ccc',
                    }}>
                      {tech}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#888' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span><Calendar size={14} style={{ verticalAlign: 'middle', marginLeft: '0.25rem' }} />{project.startDate} - {project.endDate}</span>
                    <span>
                      סיום: {project.completionType === 'delivery' ? 'מסירה' :
                             project.completionType === 'final_invoice' ? 'חשבון סופי' : 'תקופת בדק'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                      <Edit2 size={16} />
                    </button>
                    <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificates Tab */}
      {activeTab === 'certificates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {certificates.map((cert) => (
            <div key={cert.id} className="card" style={{
              borderRight: `4px solid ${
                cert.status === 'valid' ? '#22c55e' :
                cert.status === 'expiring' ? '#f59e0b' : '#ef4444'
              }`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{cert.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#888' }}>{cert.issuer}</div>
                </div>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  background: cert.status === 'valid' ? 'rgba(34, 197, 94, 0.15)' :
                              cert.status === 'expiring' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: cert.status === 'valid' ? '#22c55e' :
                         cert.status === 'expiring' ? '#f59e0b' : '#ef4444',
                }}>
                  {cert.status === 'valid' ? 'בתוקף' :
                   cert.status === 'expiring' ? 'עומד לפוג' : 'פג תוקף'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '0.875rem' }}>
                <Clock size={14} />
                תוקף עד: {cert.validUntil}
              </div>
            </div>
          ))}
          <div className="card" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '150px',
            border: '2px dashed #333',
            background: 'transparent',
            cursor: 'pointer',
          }}>
            <div style={{ textAlign: 'center', color: '#666' }}>
              <Plus size={32} style={{ marginBottom: '0.5rem' }} />
              <div>הוסף הסמכה</div>
            </div>
          </div>
        </div>
      )}

      {/* Key People Tab */}
      {activeTab === 'people' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem' }}>
          {keyPeople.map((person) => (
            <div key={person.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                }}>
                  {person.name.charAt(0)}
                </div>
                <div>
                  <h4 style={{ marginBottom: '0.25rem' }}>{person.name}</h4>
                  <div style={{ color: '#888', fontSize: '0.9rem' }}>{person.role}</div>
                  <div style={{ color: '#666', fontSize: '0.85rem' }}>{person.experience} שנות ניסיון</div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>השכלה</div>
                <div style={{ color: '#ccc' }}>{person.education}</div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>הסמכות</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {person.certifications.map((cert) => (
                    <span key={cert} style={{
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

              <div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>פרויקטים</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {person.projects.map((proj) => (
                    <span key={proj} style={{
                      padding: '0.25rem 0.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      color: '#ccc',
                    }}>
                      {proj}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <div className="card" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '250px',
            border: '2px dashed #333',
            background: 'transparent',
            cursor: 'pointer',
          }}>
            <div style={{ textAlign: 'center', color: '#666' }}>
              <Plus size={32} style={{ marginBottom: '0.5rem' }} />
              <div>הוסף איש מפתח</div>
            </div>
          </div>
        </div>
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
