import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  FolderOpen,
  ChevronLeft,
  Search,
  Sparkles,
  FileText,
  CheckSquare,
  Clock,
  ArrowRight,
  Briefcase,
  Star,
  Trash2,
} from 'lucide-react';
import { api } from '../api/tenderix';
import type { Tender, Organization } from '../api/tenderix';
import { setCurrentTender } from '../api/config';
import { Loading } from '../components/Loading';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { deleteTender } from '../api/tenderix';

// ==================== FICTIONAL COMPANIES ====================
export interface FictionalCompany {
  id: string;
  name: string;
  company_number: string;
  description: string;
  domain: string;
  founding_year: number;
  specializations: string;
  employee_count: number;
  annual_revenue: number; // millions ILS
}

export const FICTIONAL_COMPANIES: FictionalCompany[] = [
  {
    id: 'fictional-tech-01',
    name: 'דיגיטק פתרונות מתקדמים בע"מ',
    company_number: '510000001',
    description: 'חברת טכנולוגיה מובילה בתחום פיתוח מערכות מידע ותשתיות IT',
    domain: 'טכנולוגיה ומערכות מידע',
    founding_year: 2008,
    specializations: 'פיתוח תוכנה, אינטגרציה, מערכות ERP, ענן, סייבר',
    employee_count: 180,
    annual_revenue: 95,
  },
  {
    id: 'fictional-construction-01',
    name: 'א.ב. בנייה והנדסה בע"מ',
    company_number: '510000002',
    description: 'חברת בנייה ותשתיות עם ניסיון בפרויקטים ממשלתיים גדולים',
    domain: 'בנייה ותשתיות',
    founding_year: 1995,
    specializations: 'בנייה, תשתיות, חשמל, מיזוג אוויר, אינסטלציה',
    employee_count: 350,
    annual_revenue: 250,
  },
  {
    id: 'fictional-security-01',
    name: 'מגן-טק אבטחת מידע בע"מ',
    company_number: '510000003',
    description: 'חברת סייבר ואבטחת מידע עם סיווג ביטחוני',
    domain: 'סייבר ואבטחת מידע',
    founding_year: 2012,
    specializations: 'אבטחת מידע, SOC, בדיקות חדירה, ייעוץ סייבר, SIEM',
    employee_count: 85,
    annual_revenue: 45,
  },
  {
    id: 'fictional-logistics-01',
    name: 'שילוח ישיר לוגיסטיקה בע"מ',
    company_number: '510000004',
    description: 'חברת לוגיסטיקה ושילוח עם צי רכבים ומחסנים ארציים',
    domain: 'לוגיסטיקה ושילוח',
    founding_year: 2001,
    specializations: 'שילוח, אחסנה, הפצה, ניהול מלאי, שרשרת אספקה',
    employee_count: 220,
    annual_revenue: 120,
  },
  {
    id: 'fictional-env-01',
    name: 'ירוק-טק סביבה ואנרגיה בע"מ',
    company_number: '510000005',
    description: 'חברת סביבה ואנרגיה מתחדשת עם ניסיון בפרויקטים ירוקים',
    domain: 'סביבה ואנרגיה',
    founding_year: 2015,
    specializations: 'אנרגיה סולארית, טיפול בפסולת, ייעוץ סביבתי, קיימות',
    employee_count: 65,
    annual_revenue: 30,
  },
  {
    id: 'fictional-consulting-01',
    name: 'אופק ייעוץ ניהולי בע"מ',
    company_number: '510000006',
    description: 'חברת ייעוץ ניהולי ואסטרטגי עם ניסיון במגזר הציבורי',
    domain: 'ייעוץ וניהול',
    founding_year: 2005,
    specializations: 'ייעוץ אסטרטגי, ניהול פרויקטים, ליווי מכרזים, שיפור תהליכים',
    employee_count: 40,
    annual_revenue: 22,
  },
];

// ==================== THEME ====================
const THEME = {
  pageBg: '#f0f9fb',
  headerText: '#1e3a4c',
  subtitleText: '#5a7d8a',
  accentPrimary: '#00b4d8',
  accentGradient: 'linear-gradient(135deg, #00b4d8, #0096c7)',
  cardBg: '#ffffff',
  cardBorder: '#c8e4eb',
  selectedBorder: '#00b4d8',
  fictionalBg: '#fef7ed',
  fictionalBorder: '#f59e0b',
};

// ==================== STEP TYPE ====================
type Step = 'select-company' | 'company-projects';

export function HomePage() {
  const navigate = useNavigate();

  // Main state
  const [step, setStep] = useState<Step>('select-company');
  const [loading, setLoading] = useState(true);

  // Company selection
  const [dbCompanies, setDbCompanies] = useState<Organization[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Organization | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFictional, setShowFictional] = useState(false);

  // Projects (tenders for selected company)
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loadingTenders, setLoadingTenders] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Tender | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load companies on mount
  useEffect(() => {
    loadCompanies();

    // Check if we already have a selected company in session
    const savedOrgId = localStorage.getItem('tenderix_selected_org_id');
    const savedOrgName = localStorage.getItem('tenderix_selected_org_name');
    if (savedOrgId && savedOrgName) {
      // Resume with saved company
      setSelectedCompany({ id: savedOrgId, name: savedOrgName } as Organization);
      setStep('company-projects');
      loadTendersForOrg(savedOrgId);
    }
  }, []);

  async function loadCompanies() {
    setLoading(true);
    try {
      // Load all organizations from DB
      const orgs = await api.organizations.list();
      setDbCompanies(orgs || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      setDbCompanies([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadTendersForOrg(orgId: string) {
    setLoadingTenders(true);
    try {
      const data = await api.tenders.listByOrg(orgId);
      setTenders(data || []);
    } catch (error) {
      console.error('Error loading tenders:', error);
      setTenders([]);
    } finally {
      setLoadingTenders(false);
    }
  }

  function selectCompany(company: Organization) {
    setSelectedCompany(company);
    setStep('company-projects');

    // Save to localStorage for persistence
    localStorage.setItem('tenderix_selected_org_id', company.id);
    localStorage.setItem('tenderix_selected_org_name', company.name);

    // Set as current org for the session
    localStorage.setItem('tenderix_session_org_id', company.id);

    loadTendersForOrg(company.id);
  }

  async function selectFictionalCompany(fc: FictionalCompany) {
    try {
      // Create or get this fictional company in DB
      const org = await api.organizations.ensureExists(fc.id, {
        name: fc.name,
        company_number: fc.company_number,
        founding_year: fc.founding_year,
        specializations: fc.specializations,
      });
      selectCompany(org || { id: fc.id, name: fc.name } as Organization);
    } catch (error) {
      console.error('Error creating fictional company:', error);
      // Still proceed with minimal data
      selectCompany({ id: fc.id, name: fc.name } as Organization);
    }
  }

  function changeCompany() {
    setStep('select-company');
    setSelectedCompany(null);
    setTenders([]);
    localStorage.removeItem('tenderix_selected_org_id');
    localStorage.removeItem('tenderix_selected_org_name');
  }

  function openTender(tender: Tender) {
    setCurrentTender(tender.id, tender.tender_name);
    localStorage.setItem('tenderix_session_org_id', selectedCompany?.id || '');
    navigate('/gates');
  }

  function startNewTender() {
    if (selectedCompany) {
      localStorage.setItem('tenderix_session_org_id', selectedCompany.id);
    }
    navigate('/simple');
  }

  async function handleDeleteTender() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteTender(deleteTarget.id);
      setTenders(prev => prev.filter(t => t.id !== deleteTarget.id));

      const currentId = localStorage.getItem('currentTenderId');
      if (currentId === deleteTarget.id) {
        localStorage.removeItem('currentTenderId');
        localStorage.removeItem('currentTenderName');
      }
    } catch (error) {
      console.error('Error deleting tender:', error);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  // Filter companies by search
  const filteredDbCompanies = dbCompanies.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.company_number?.toLowerCase().includes(q) ||
      c.specializations?.toLowerCase().includes(q)
    );
  });

  const filteredFictional = FICTIONAL_COMPANIES.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q) ||
      c.specializations.toLowerCase().includes(q)
    );
  });

  // Don't show fictional companies that are already in DB
  const dbIds = new Set(dbCompanies.map(c => c.id));
  const availableFictional = filteredFictional.filter(fc => !dbIds.has(fc.id));

  if (loading) return <Loading />;

  // ==================== STEP 1: COMPANY SELECTION ====================
  if (step === 'select-company') {
    return (
      <div style={{ minHeight: '100vh', background: THEME.pageBg, padding: '2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: THEME.headerText,
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
            }}>
              <Building2 size={32} color={THEME.accentPrimary} />
              בחר חברה
            </h1>
            <p style={{ color: THEME.subtitleText, fontSize: '1.05rem' }}>
              בחר חברה מהמאגר כדי להתחיל לנתח מכרזים עבורה
            </p>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            padding: '0.75rem 1rem',
            background: THEME.cardBg,
            borderRadius: '12px',
            border: `2px solid ${THEME.cardBorder}`,
          }}>
            <Search size={20} color={THEME.subtitleText} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="חפש חברה לפי שם, תחום או מספר..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '1rem',
                fontFamily: 'inherit',
                background: 'transparent',
                color: THEME.headerText,
              }}
            />
          </div>

          {/* DB Companies */}
          {filteredDbCompanies.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: THEME.headerText,
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <Briefcase size={18} color={THEME.accentPrimary} />
                חברות במאגר ({filteredDbCompanies.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {filteredDbCompanies.map(company => (
                  <button
                    key={company.id}
                    onClick={() => selectCompany(company)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      background: THEME.cardBg,
                      border: `2px solid ${THEME.cardBorder}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'right',
                      transition: 'all 0.2s',
                      width: '100%',
                      fontFamily: 'inherit',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = THEME.selectedBorder;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 180, 216, 0.15)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = THEME.cardBorder;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: THEME.accentGradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Building2 size={24} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem', color: THEME.headerText }}>
                        {company.name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: THEME.subtitleText }}>
                        {company.company_number && `ח.פ. ${company.company_number}`}
                        {company.specializations && ` · ${company.specializations}`}
                      </div>
                    </div>
                    <ChevronLeft size={20} color={THEME.subtitleText} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fictional Companies Toggle */}
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={() => setShowFictional(!showFictional)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: showFictional ? THEME.fictionalBg : THEME.cardBg,
                border: `2px solid ${showFictional ? THEME.fictionalBorder : THEME.cardBorder}`,
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: showFictional ? '#92400e' : THEME.headerText,
                width: '100%',
                transition: 'all 0.2s',
              }}
            >
              <Star size={18} color={showFictional ? '#f59e0b' : THEME.subtitleText} />
              חברות לדוגמה ({availableFictional.length})
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: THEME.subtitleText }}>
                {showFictional ? 'הסתר' : 'הצג'}
              </span>
            </button>
          </div>

          {/* Fictional Companies List */}
          {showFictional && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
              {availableFictional.map(fc => (
                <button
                  key={fc.id}
                  onClick={() => selectFictionalCompany(fc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    background: THEME.fictionalBg,
                    border: `2px solid ${THEME.fictionalBorder}40`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'right',
                    transition: 'all 0.2s',
                    width: '100%',
                    fontFamily: 'inherit',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = THEME.fictionalBorder;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.15)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = `${THEME.fictionalBorder}40`;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Star size={24} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '1.05rem', color: '#92400e' }}>
                      {fc.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#b45309' }}>
                      {fc.domain} · {fc.employee_count} עובדים · מחזור {fc.annual_revenue}M
                    </div>
                    <div style={{ fontSize: '0.8rem', color: THEME.subtitleText, marginTop: '0.2rem' }}>
                      {fc.description}
                    </div>
                  </div>
                  <ChevronLeft size={20} color="#b45309" />
                </button>
              ))}
            </div>
          )}

          {/* Create New Company */}
          <button
            onClick={() => {
              // Create a new org and go to company profile to fill details
              const newOrgId = crypto.randomUUID();
              localStorage.setItem('tenderix_session_org_id', newOrgId);
              localStorage.setItem('tenderix_selected_org_id', newOrgId);
              localStorage.setItem('tenderix_selected_org_name', 'חברה חדשה');
              navigate('/company');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '1rem',
              background: THEME.cardBg,
              border: `2px dashed ${THEME.cardBorder}`,
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '1rem',
              fontWeight: 600,
              color: THEME.accentPrimary,
              transition: 'all 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = THEME.accentPrimary;
              e.currentTarget.style.background = '#f0f9ff';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = THEME.cardBorder;
              e.currentTarget.style.background = THEME.cardBg;
            }}
          >
            <Plus size={20} />
            צור חברה חדשה
          </button>

          {/* Empty state */}
          {filteredDbCompanies.length === 0 && !showFictional && (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: THEME.subtitleText,
              marginTop: '1rem',
            }}>
              <Building2 size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>אין חברות במאגר עדיין</p>
              <p style={{ fontSize: '0.9rem' }}>לחץ על "חברות לדוגמה" לטעינת חברות מוכנות, או צור חברה חדשה</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== STEP 2: COMPANY PROJECTS ====================
  return (
    <div style={{ minHeight: '100vh', background: THEME.pageBg, padding: '2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Company Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
          padding: '1.25rem 1.5rem',
          background: THEME.cardBg,
          borderRadius: '16px',
          border: `2px solid ${THEME.cardBorder}`,
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: THEME.accentGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Building2 size={28} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: THEME.headerText }}>
              {selectedCompany?.name || 'חברה'}
            </h2>
            <div style={{ fontSize: '0.9rem', color: THEME.subtitleText }}>
              {selectedCompany?.company_number && `ח.פ. ${selectedCompany.company_number}`}
              {selectedCompany?.specializations && ` · ${selectedCompany.specializations}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => {
                if (selectedCompany) {
                  localStorage.setItem('tenderix_session_org_id', selectedCompany.id);
                }
                navigate('/company');
              }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: `1px solid ${THEME.cardBorder}`,
                background: THEME.cardBg,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                color: THEME.headerText,
              }}
            >
              פרופיל
            </button>
            <button
              onClick={changeCompany}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: `1px solid ${THEME.cardBorder}`,
                background: THEME.cardBg,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                color: THEME.subtitleText,
              }}
            >
              החלף חברה
            </button>
          </div>
        </div>

        {/* New Tender Button */}
        <button
          onClick={startNewTender}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            width: '100%',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            borderRadius: '16px',
            border: 'none',
            background: THEME.accentGradient,
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 180, 216, 0.3)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Plus size={22} />
          טען מכרז חדש
        </button>

        {/* Tenders / Projects List */}
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: THEME.headerText,
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <FolderOpen size={18} color={THEME.accentPrimary} />
            פרויקטים שמורים ({tenders.length})
          </h3>
        </div>

        {loadingTenders ? (
          <Loading />
        ) : tenders.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            background: THEME.cardBg,
            borderRadius: '16px',
            border: `2px solid ${THEME.cardBorder}`,
          }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem', color: THEME.accentPrimary }} />
            <h3 style={{ margin: '0 0 0.5rem', color: THEME.headerText }}>אין פרויקטים עדיין</h3>
            <p style={{ color: THEME.subtitleText, marginBottom: '1.5rem' }}>
              טען מכרז חדש כדי להתחיל לנתח תנאי סף
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tenders.map(tender => {
              const statusColors: Record<string, string> = {
                'ACTIVE': '#10b981',
                'COMPLETED': '#6b7280',
                'CANCELLED': '#ef4444',
              };
              const statusLabels: Record<string, string> = {
                'ACTIVE': 'פעיל',
                'COMPLETED': 'הושלם',
                'CANCELLED': 'בוטל',
                'GATES_ANALYSIS': 'ניתוח סף',
              };
              const stepLabels: Record<string, string> = {
                'p1': 'קליטה',
                'GATES_ANALYSIS': 'תנאי סף',
                'BOQ_ANALYSIS': 'מפרט',
                'COMPETITORS': 'מתחרים',
                'DECISION': 'החלטה',
              };

              return (
                <div
                  key={tender.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    background: THEME.cardBg,
                    border: `2px solid ${THEME.cardBorder}`,
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                  onClick={() => openTender(tender)}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = THEME.selectedBorder;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 180, 216, 0.1)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = THEME.cardBorder;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: tender.go_nogo_decision === 'GO'
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : tender.go_nogo_decision === 'NO_GO'
                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                        : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {tender.current_step === 'GATES_ANALYSIS' ? (
                      <CheckSquare size={22} color="white" />
                    ) : tender.go_nogo_decision ? (
                      <Sparkles size={22} color="white" />
                    ) : (
                      <FileText size={22} color="white" />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: THEME.headerText, marginBottom: '0.25rem' }}>
                      {tender.tender_name}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: THEME.subtitleText, flexWrap: 'wrap' }}>
                      {tender.issuing_body && <span>{tender.issuing_body}</span>}
                      {tender.tender_number && <span>#{tender.tender_number}</span>}
                      {tender.current_step && (
                        <span style={{
                          background: '#f3e8ff',
                          color: '#7c3aed',
                          padding: '0.1rem 0.5rem',
                          borderRadius: '4px',
                        }}>
                          {stepLabels[tender.current_step] || tender.current_step}
                        </span>
                      )}
                      {tender.status && (
                        <span style={{
                          color: statusColors[tender.status] || THEME.subtitleText,
                          fontWeight: 500,
                        }}>
                          {statusLabels[tender.status] || tender.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Deadline */}
                  {tender.submission_deadline && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.8rem',
                      color: new Date(tender.submission_deadline) < new Date() ? '#ef4444' : THEME.subtitleText,
                    }}>
                      <Clock size={14} />
                      {new Date(tender.submission_deadline).toLocaleDateString('he-IL')}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(tender);
                      }}
                      style={{
                        padding: '0.4rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: THEME.subtitleText,
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = THEME.subtitleText; }}
                      title="מחק פרויקט"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div style={{
                      padding: '0.4rem',
                      color: THEME.accentPrimary,
                    }}>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="מחיקת פרויקט"
        message={`האם למחוק את "${deleteTarget?.tender_name}"? פעולה זו אינה ניתנת לביטול.`}
        confirmText={isDeleting ? 'מוחק...' : 'מחק'}
        cancelText="ביטול"
        variant="danger"
        onConfirm={handleDeleteTender}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
