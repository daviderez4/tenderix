import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, CheckSquare, Users, Target, ArrowRight, Calendar, Plus,
  Upload, BarChart3, Clock, TrendingUp, AlertTriangle, CheckCircle
} from 'lucide-react';
import { api } from '../api/tenderix';
import type { Tender, GateCondition, Competitor, BOQItem, TenderDocument } from '../api/tenderix';
import { getCurrentTenderId, setCurrentTender, getCurrentOrgId } from '../api/config';
import { Loading } from '../components/Loading';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressStepper } from '../components/ProgressStepper';

export function Dashboard() {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [gates, setGates] = useState<GateCondition[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [documents, setDocuments] = useState<TenderDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  async function loadData() {
    try {
      const tendersData = await api.tenders.list();
      setTenders(tendersData || []);

      const currentId = getCurrentTenderId();
      const current = currentId && currentId.length > 0
        ? tendersData.find(t => t.id === currentId) || tendersData[0]
        : tendersData[0];

      if (current) {
        setSelectedTender(current);
        const [gatesData, competitorsData, boqData, docsData] = await Promise.all([
          api.getGateConditions(current.id),
          api.getCompetitors(getCurrentOrgId()),
          api.boq.list(current.id).catch(() => []),
          api.documents.list(current.id).catch(() => []),
        ]);
        setGates(gatesData);
        setCompetitors(competitorsData);
        setBoqItems(boqData);
        setDocuments(docsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectTender = async (tender: Tender) => {
    setSelectedTender(tender);
    setCurrentTender(tender.id, tender.tender_name);

    try {
      const [gatesData, boqData, docsData] = await Promise.all([
        api.getGateConditions(tender.id),
        api.boq.list(tender.id).catch(() => []),
        api.documents.list(tender.id).catch(() => []),
      ]);
      setGates(gatesData);
      setBoqItems(boqData);
      setDocuments(docsData);
    } catch (error) {
      console.error('Error loading tender data:', error);
      setGates([]);
      setBoqItems([]);
      setDocuments([]);
    }
  };

  if (loading) return <Loading />;

  // Calculate progress
  const tenderProgress = {
    hasBasicInfo: !!(selectedTender?.tender_name && selectedTender?.issuing_body),
    hasDocument: documents.length > 0,
    hasGates: gates.length > 0,
    gatesAnalyzed: gates.filter(g => g.status && g.status !== 'UNKNOWN').length > gates.length * 0.5,
    hasCompetitors: competitors.length > 0,
    hasBOQ: boqItems.length > 0,
    hasDecision: selectedTender?.status === 'GO' || selectedTender?.status === 'NO_GO',
  };

  const gateStats = {
    total: gates.length,
    meets: gates.filter(g => g.status === 'MEETS').length,
    partial: gates.filter(g => g.status === 'PARTIALLY_MEETS').length,
    fails: gates.filter(g => g.status === 'DOES_NOT_MEET').length,
    unknown: gates.filter(g => !g.status || g.status === 'UNKNOWN').length,
    mandatory: gates.filter(g => g.is_mandatory).length,
    mandatoryMet: gates.filter(g => g.is_mandatory && g.status === 'MEETS').length,
  };

  const eligibilityPercent = gates.length > 0
    ? Math.round(((gateStats.meets + gateStats.partial * 0.5) / gates.length) * 100)
    : 0;

  // Calculate recommendation
  const getRecommendation = () => {
    if (gates.length === 0) return { status: 'pending', text: 'טרם נותחו תנאי סף', color: '#888' };

    const mandatoryFails = gates.filter(g => g.is_mandatory && g.status === 'DOES_NOT_MEET').length;
    if (mandatoryFails > 0) {
      return { status: 'no-go', text: `לא עומדים ב-${mandatoryFails} תנאי חובה`, color: '#ef4444' };
    }

    if (eligibilityPercent >= 80) {
      return { status: 'go', text: 'מומלץ להגיש', color: '#22c55e' };
    } else if (eligibilityPercent >= 50) {
      return { status: 'maybe', text: 'יש לבחון - נדרשת עבודה', color: '#f59e0b' };
    } else {
      return { status: 'no-go', text: 'לא מומלץ להגיש', color: '#ef4444' };
    }
  };

  const recommendation = getRecommendation();

  // Days until deadline
  const daysUntilDeadline = selectedTender?.submission_deadline
    ? Math.ceil((new Date(selectedTender.submission_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>דשבורד Tenderix</h1>
          <p className="page-subtitle">מערכת ניתוח מכרזים חכמה</p>
        </div>
        <button onClick={() => navigate('/new')} className="btn btn-primary">
          <Plus size={18} />
          מכרז חדש
        </button>
      </div>

      {/* Progress Stepper - only show when tender is selected */}
      {selectedTender && <ProgressStepper tenderProgress={tenderProgress} />}

      {/* Tender List */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} style={{ color: '#7c3aed' }} />
            מכרזים ({tenders.length})
          </h2>
        </div>

        {tenders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>אין מכרזים במערכת</p>
            <button onClick={() => navigate('/new')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <Plus size={18} />
              הוסף מכרז ראשון
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tenders.map((tender) => (
              <div
                key={tender.id}
                onClick={() => handleSelectTender(tender)}
                style={{
                  padding: '1rem',
                  background: selectedTender?.id === tender.id
                    ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(0, 212, 255, 0.1))'
                    : 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  borderRight: selectedTender?.id === tender.id ? '4px solid #7c3aed' : '4px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{tender.tender_name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#888', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {tender.tender_number && <span>מס׳ {tender.tender_number}</span>}
                      {tender.issuing_body && <span>{tender.issuing_body}</span>}
                      {tender.submission_deadline && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} />
                          {new Date(tender.submission_deadline).toLocaleDateString('he-IL')}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={tender.status || 'ACTIVE'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Tender Dashboard */}
      {selectedTender && (
        <>
          {/* Quick Stats Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            {/* Deadline Card */}
            {daysUntilDeadline !== null && (
              <div className="card" style={{
                background: daysUntilDeadline <= 7
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))'
                  : daysUntilDeadline <= 14
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1))'
                    : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))',
                borderRight: `4px solid ${daysUntilDeadline <= 7 ? '#ef4444' : daysUntilDeadline <= 14 ? '#f59e0b' : '#10b981'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Clock size={24} style={{ color: daysUntilDeadline <= 7 ? '#ef4444' : daysUntilDeadline <= 14 ? '#f59e0b' : '#10b981' }} />
                  <div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{daysUntilDeadline}</div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>ימים להגשה</div>
                  </div>
                </div>
              </div>
            )}

            {/* Gates Summary */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(124, 58, 237, 0.05))',
              borderRight: '4px solid #7c3aed',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckSquare size={24} style={{ color: '#7c3aed' }} />
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                    {gateStats.meets}/{gateStats.total}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>תנאי סף עומדים</div>
                </div>
              </div>
            </div>

            {/* Eligibility */}
            <div className="card" style={{
              background: eligibilityPercent >= 80
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))'
                : eligibilityPercent >= 50
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1))'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))',
              borderRight: `4px solid ${eligibilityPercent >= 80 ? '#22c55e' : eligibilityPercent >= 50 ? '#f59e0b' : '#ef4444'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <TrendingUp size={24} style={{ color: eligibilityPercent >= 80 ? '#22c55e' : eligibilityPercent >= 50 ? '#f59e0b' : '#ef4444' }} />
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{eligibilityPercent}%</div>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>כשירות</div>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="card" style={{
              background: `linear-gradient(135deg, ${recommendation.color}30, ${recommendation.color}10)`,
              borderRight: `4px solid ${recommendation.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {recommendation.status === 'go' ? (
                  <CheckCircle size={24} style={{ color: recommendation.color }} />
                ) : recommendation.status === 'no-go' ? (
                  <AlertTriangle size={24} style={{ color: recommendation.color }} />
                ) : (
                  <Target size={24} style={{ color: recommendation.color }} />
                )}
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: recommendation.color }}>
                    {recommendation.status === 'go' ? 'GO' : recommendation.status === 'no-go' ? 'NO-GO' : 'בבדיקה'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>{recommendation.text}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards - Next Steps */}
          <h3 style={{ marginBottom: '1rem', color: '#ccc' }}>השלבים הבאים</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            {/* Step 1: Upload/Edit Tender */}
            <ActionCard
              icon={Upload}
              title="קליטת מכרז"
              pillar="P1"
              color="#00d4ff"
              path="/intake"
              isComplete={tenderProgress.hasBasicInfo && tenderProgress.hasDocument}
              description={
                !tenderProgress.hasDocument
                  ? 'העלה את מסמך המכרז לניתוח'
                  : 'פרטי מכרז הוזנו בהצלחה'
              }
              actionText={!tenderProgress.hasDocument ? 'העלה מסמך' : 'ערוך פרטים'}
            />

            {/* Step 2: Gate Conditions */}
            <ActionCard
              icon={CheckSquare}
              title="תנאי סף"
              pillar="P2"
              color="#7c3aed"
              path="/gates"
              isComplete={tenderProgress.gatesAnalyzed}
              description={
                gates.length === 0
                  ? 'חלץ תנאי סף מהמסמך'
                  : gateStats.unknown > 0
                    ? `${gateStats.unknown} תנאים ממתינים לניתוח`
                    : `${gateStats.meets}/${gateStats.total} תנאים עומדים`
              }
              actionText={gates.length === 0 ? 'חלץ תנאים' : gateStats.unknown > 0 ? 'נתח תנאים' : 'צפה בניתוח'}
            />

            {/* Step 3: BOQ Analysis */}
            <ActionCard
              icon={BarChart3}
              title="מפרט וכמויות"
              pillar="P3"
              color="#10b981"
              path="/analysis"
              isComplete={tenderProgress.hasBOQ}
              description={
                boqItems.length === 0
                  ? 'נתח כתב כמויות והיקף עבודה'
                  : `${boqItems.length} פריטים נותחו`
              }
              actionText={boqItems.length === 0 ? 'נתח BOQ' : 'ערוך פריטים'}
            />

            {/* Step 4: Competitors */}
            <ActionCard
              icon={Users}
              title="מתחרים"
              pillar="P4"
              color="#f59e0b"
              path="/competitors"
              isComplete={tenderProgress.hasCompetitors}
              description={
                competitors.length === 0
                  ? 'הגדר מתחרים פוטנציאליים'
                  : `${competitors.length} מתחרים במערכת`
              }
              actionText={competitors.length === 0 ? 'הוסף מתחרים' : 'נהל מתחרים'}
            />

            {/* Step 5: Decision */}
            <ActionCard
              icon={Target}
              title="דוח והחלטה"
              pillar="GO"
              color="#22c55e"
              path="/decision"
              isComplete={tenderProgress.hasDecision}
              description={
                !tenderProgress.hasDecision
                  ? 'הפק דוח Go/No-Go סופי'
                  : selectedTender.status === 'GO' ? 'החלטה: להגיש' : 'החלטה: לא להגיש'
              }
              actionText="צפה בדוח"
              highlight={eligibilityPercent >= 80}
            />
          </div>

          {/* Gate Conditions Summary */}
          {gates.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>סקירת תנאי סף</h3>
                <Link to="/gates" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                  <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
                  כל התנאים
                </Link>
              </div>

              {/* Gates by status */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.15)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{gateStats.meets}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>עומדים</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{gateStats.partial}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>חלקי</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{gateStats.fails}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>לא עומדים</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(107, 114, 128, 0.15)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6b7280' }}>{gateStats.unknown}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>לא נותחו</div>
                </div>
              </div>

              {/* Critical gates (mandatory that fail) */}
              {gates.filter(g => g.is_mandatory && g.status === 'DOES_NOT_MEET').length > 0 && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  padding: '1rem',
                  borderRight: '4px solid #ef4444',
                }}>
                  <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={16} />
                    תנאי חובה שלא עומדים בהם:
                  </div>
                  {gates.filter(g => g.is_mandatory && g.status === 'DOES_NOT_MEET').slice(0, 3).map((gate) => (
                    <div key={gate.id} style={{ fontSize: '0.875rem', color: '#ccc', marginTop: '0.5rem' }}>
                      • {gate.condition_text.slice(0, 100)}...
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Action Card Component
function ActionCard({
  icon: Icon,
  title,
  pillar,
  color,
  path,
  isComplete,
  description,
  actionText,
  highlight = false,
}: {
  icon: React.ElementType;
  title: string;
  pillar: string;
  color: string;
  path: string;
  isComplete: boolean;
  description: string;
  actionText: string;
  highlight?: boolean;
}) {
  return (
    <Link
      to={path}
      style={{
        textDecoration: 'none',
        display: 'block',
      }}
    >
      <div
        className="card"
        style={{
          padding: '1.25rem',
          borderRight: `4px solid ${color}`,
          background: highlight
            ? `linear-gradient(135deg, ${color}20, ${color}10)`
            : isComplete
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>{title}</div>
              <span style={{
                fontSize: '0.65rem',
                color,
                background: `${color}20`,
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                {pillar}
              </span>
            </div>
          </div>
          {isComplete && (
            <CheckCircle size={20} style={{ color: '#22c55e' }} />
          )}
        </div>

        <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 0.75rem 0' }}>
          {description}
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color,
          fontSize: '0.85rem',
          fontWeight: 500,
        }}>
          {actionText}
          <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
        </div>
      </div>
    </Link>
  );
}
