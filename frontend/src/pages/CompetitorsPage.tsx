import { useState, useEffect } from 'react';
import { Users, DollarSign, Target, Plus } from 'lucide-react';
import { api, populateSampleCompetitors } from '../api/tenderix';
import type { Competitor, Tender } from '../api/tenderix';
import { getCurrentTenderId, getCurrentOrgId } from '../api/config';
import { Loading } from '../components/Loading';
import { StatusBadge } from '../components/StatusBadge';

type TabType = 'list' | 'mapping' | 'pricing' | 'intel';

export function CompetitorsPage() {
  const [tender, setTender] = useState<Tender | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);
  const [workflowResults, setWorkflowResults] = useState<Record<string, unknown>>({});
  const [populatingCompetitors, setPopulatingCompetitors] = useState(false);

  useEffect(() => {
    loadData();

    // Listen for tender changes
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const tenderId = getCurrentTenderId();
      const orgId = getCurrentOrgId();
      const [tenderData, competitorsData] = await Promise.all([
        api.tenders.get(tenderId),
        api.getCompetitors(orgId),
      ]);
      setTender(tenderData);
      setCompetitors(competitorsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function runWorkflow(type: 'mapping' | 'pricing' | 'intel') {
    const tenderId = getCurrentTenderId();
    const orgId = getCurrentOrgId();

    setRunningWorkflow(type);
    try {
      let result;
      switch (type) {
        case 'mapping':
          result = await api.workflows.mapCompetitors(tenderId, orgId);
          break;
        case 'pricing':
          result = await api.workflows.getPricingIntel(tenderId, orgId);
          break;
        case 'intel':
          result = await api.workflows.getCompetitiveIntel(tenderId, orgId);
          break;
      }
      setWorkflowResults(prev => ({ ...prev, [type]: result }));
      setActiveTab(type);
    } catch (error) {
      console.error('Workflow error:', error);
    } finally {
      setRunningWorkflow(null);
    }
  }

  async function handlePopulateSampleCompetitors() {
    const orgId = getCurrentOrgId();
    setPopulatingCompetitors(true);
    try {
      const newCompetitors = await populateSampleCompetitors(orgId);
      setCompetitors(newCompetitors);
    } catch (error) {
      console.error('Error populating competitors:', error);
    } finally {
      setPopulatingCompetitors(false);
    }
  }

  if (loading) return <Loading />;

  // Show competitors list even without tender (competitors belong to org, not tender)
  // Only AI analysis features require a tender

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Users size={28} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
          מתחרים
        </h1>
        {tender ? (
          <p className="page-subtitle">
            {tender.tender_name}
            {tender.tender_number && ` | מכרז ${tender.tender_number}`}
          </p>
        ) : (
          <p className="page-subtitle">מאגר מתחרים של הארגון</p>
        )}
      </div>

      {/* AI Actions - only show when tender is selected */}
      {tender && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>ניתוח AI</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => runWorkflow('mapping')}
              disabled={runningWorkflow !== null}
            >
              {runningWorkflow === 'mapping' ? <div className="spinner" /> : <Users size={18} />}
              מיפוי מתחרים
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => runWorkflow('pricing')}
              disabled={runningWorkflow !== null}
            >
              {runningWorkflow === 'pricing' ? <div className="spinner" /> : <DollarSign size={18} />}
              מודיעין תמחור
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => runWorkflow('intel')}
              disabled={runningWorkflow !== null}
            >
              {runningWorkflow === 'intel' ? <div className="spinner" /> : <Target size={18} />}
              מודיעין תחרותי
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
          מאגר מתחרים ({competitors.length})
        </button>
        {tender && (
          <>
            <button className={`tab ${activeTab === 'mapping' ? 'active' : ''}`} onClick={() => setActiveTab('mapping')}>
              מיפוי למכרז
            </button>
            <button className={`tab ${activeTab === 'pricing' ? 'active' : ''}`} onClick={() => setActiveTab('pricing')}>
              מודיעין תמחור
            </button>
            <button className={`tab ${activeTab === 'intel' ? 'active' : ''}`} onClick={() => setActiveTab('intel')}>
              מודיעין תחרותי
            </button>
          </>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        competitors.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <Users size={48} style={{ color: 'var(--gray-400)', marginBottom: '1rem' }} />
            <h3>אין מתחרים במאגר</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
              הוסף מתחרים למאגר או טען נתונים לדוגמה
            </p>
            <button
              className="btn btn-primary"
              onClick={handlePopulateSampleCompetitors}
              disabled={populatingCompetitors}
            >
              {populatingCompetitors ? <div className="spinner" /> : <Plus size={18} />}
              טען מתחרים לדוגמה
            </button>
          </div>
        ) : (
          <div className="grid grid-2">
            {competitors.map((comp) => (
              <div key={comp.id} className="card">
                <h4 style={{ marginBottom: '0.75rem' }}>{comp.name}</h4>
                {comp.company_number && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>
                    ח.פ. {comp.company_number}
                  </div>
                )}
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>תחומים:</strong>
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {comp.typical_domains?.map((d, i) => (
                      <span key={i} className="badge badge-gray">{d}</span>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>חוזקות:</strong>
                  <ul style={{ margin: '0.25rem 0 0 1rem', fontSize: '0.875rem' }}>
                    {comp.strengths?.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <strong>חולשות:</strong>
                  <ul style={{ margin: '0.25rem 0 0 1rem', fontSize: '0.875rem' }}>
                    {comp.weaknesses?.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'mapping' && (
        <div className="card">
          {workflowResults.mapping ? (
            <MappingResult data={workflowResults.mapping} />
          ) : (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem' }}>
              לחץ על "מיפוי מתחרים" לניתוח מתחרים צפויים למכרז
            </p>
          )}
        </div>
      )}

      {activeTab === 'pricing' && (
        <div className="card">
          {workflowResults.pricing ? (
            <PricingResult data={workflowResults.pricing} />
          ) : (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem' }}>
              לחץ על "מודיעין תמחור" לניתוח מחירים והמלצות
            </p>
          )}
        </div>
      )}

      {activeTab === 'intel' && (
        <div className="card">
          {workflowResults.intel ? (
            <IntelResult data={workflowResults.intel} />
          ) : (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem' }}>
              לחץ על "מודיעין תחרותי" לדוח תחרותי מלא
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MappingResult({ data }: { data: any }) {
  if (!data.success) return <p style={{ color: 'var(--danger)' }}>שגיאה</p>;

  return (
    <div>
      {data.market_summary && (
        <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-value">{data.market_summary.total_expected_bidders || 0}</div>
            <div className="stat-label">מתחרים צפויים</div>
          </div>
          <div className="stat-card">
            <StatusBadge status={data.market_summary.competition_level || 'MEDIUM'} />
            <div className="stat-label" style={{ marginTop: '0.5rem' }}>רמת תחרות</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: '0.875rem' }}>{data.market_summary.recommended_positioning}</div>
            <div className="stat-label" style={{ marginTop: '0.5rem' }}>פוזיציה מומלצת</div>
          </div>
        </div>
      )}

      <h4 style={{ marginBottom: '1rem' }}>ניתוח מתחרים</h4>
      {data.competitors_analysis?.map((c: {
        competitor_name: string;
        threat_level: string;
        likelihood_to_bid: string;
        strengths_for_tender: string[];
        weaknesses_for_tender: string[];
        our_counter_strategy: string;
      }, i: number) => (
        <div key={i} className="gate-item">
          <div className="gate-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong>{c.competitor_name}</strong>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <StatusBadge status={c.threat_level} />
                <span className="badge badge-gray">סבירות: {c.likelihood_to_bid}</span>
              </div>
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              <div><strong>יתרונות:</strong> {c.strengths_for_tender?.join(', ')}</div>
              <div><strong>חולשות:</strong> {c.weaknesses_for_tender?.join(', ')}</div>
              <div style={{ color: 'var(--primary)' }}><strong>אסטרטגיה נגדית:</strong> {c.our_counter_strategy}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PricingResult({ data }: { data: any }) {
  if (!data.success) return <p style={{ color: 'var(--danger)' }}>שגיאה</p>;

  const rec = data.pricing_recommendation || {};
  const analysis = data.pricing_analysis || {};

  return (
    <div>
      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--success), #059669)', color: 'white' }}>
          <div className="stat-value">{rec.recommended_bid_range?.aggressive?.toLocaleString() || 'N/A'}</div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>אגרסיבי</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white' }}>
          <div className="stat-value">{rec.recommended_bid_range?.balanced?.toLocaleString() || 'N/A'}</div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>מאוזן</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--warning), #d97706)', color: 'white' }}>
          <div className="stat-value">{rec.recommended_bid_range?.conservative?.toLocaleString() || 'N/A'}</div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>שמרני</div>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--gray-50)' }}>
        <h4>המלצת אסטרטגיה: {rec.recommended_strategy}</h4>
        <p style={{ marginTop: '0.5rem' }}>{rec.strategy_rationale}</p>
        <p><strong>יעד מרווח:</strong> {rec.margin_target}</p>
      </div>

      {analysis.competitor_pricing_patterns && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '0.75rem' }}>דפוסי תמחור מתחרים</h4>
          {analysis.competitor_pricing_patterns.map((p: { competitor: string; typical_strategy: string; expected_bid_range: string }, i: number) => (
            <div key={i} className="gate-item">
              <strong>{p.competitor}</strong>
              <div style={{ fontSize: '0.875rem' }}>
                {p.typical_strategy} | טווח צפוי: {p.expected_bid_range}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IntelResult({ data }: { data: any }) {
  if (!data.success) return <p style={{ color: 'var(--danger)' }}>שגיאה</p>;

  const landscape = data.competitive_landscape || {};
  const position = data.our_position || {};

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">{landscape.total_expected_competitors || 0}</div>
          <div className="stat-label">מתחרים צפויים</div>
        </div>
        <div className="stat-card">
          <StatusBadge status={landscape.competition_intensity || 'MEDIUM'} />
          <div className="stat-label" style={{ marginTop: '0.5rem' }}>עוצמת תחרות</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{position.win_probability || 0}%</div>
          <div className="stat-label">סיכויי זכייה</div>
        </div>
        <div className="stat-card">
          <StatusBadge status={data.risk_assessment?.overall_risk_level || 'MEDIUM'} />
          <div className="stat-label" style={{ marginTop: '0.5rem' }}>רמת סיכון</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card" style={{ background: '#dcfce7' }}>
          <h4 style={{ color: '#166534' }}>יתרונות תחרותיים</h4>
          <ul style={{ margin: '0.5rem 0 0 1rem' }}>
            {position.competitive_advantages?.map((a: string, i: number) => <li key={i}>{a}</li>)}
          </ul>
        </div>
        <div className="card" style={{ background: '#fee2e2' }}>
          <h4 style={{ color: '#991b1b' }}>חולשות</h4>
          <ul style={{ margin: '0.5rem 0 0 1rem' }}>
            {position.competitive_weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      </div>

      {data.strategic_recommendations && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '0.75rem' }}>המלצות אסטרטגיות</h4>
          {data.strategic_recommendations.map((r: { area: string; recommendation: string; priority: string; rationale: string }, i: number) => (
            <div key={i} className="gate-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <strong>{r.recommendation}</strong>
                <div>
                  <span className="badge badge-gray">{r.area}</span>
                  <span className="badge badge-warning" style={{ marginRight: '0.25rem' }}>{r.priority}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>{r.rationale}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
