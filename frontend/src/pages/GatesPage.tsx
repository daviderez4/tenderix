import { useState, useEffect } from 'react';
import {
  Shield,
  Play,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Building2,
  Loader,
} from 'lucide-react';
import { supabase } from '../api/supabaseClient';
import { getCurrentTenderId, getCurrentOrgId, getEdgeFunctionUrl, API_CONFIG } from '../api/config';

interface GateCondition {
  id: string;
  tender_id: string;
  condition_number: string;
  condition_text: string;
  condition_type: string;
  is_mandatory: boolean;
  requirement_type: string;
  required_amount: number | null;
  required_count: number | null;
  required_years: number | null;
  status: string;
  company_evidence: string | null;
  gap_description: string | null;
  closure_options: string[] | null;
  ai_summary: string | null;
  ai_confidence: number | null;
  ai_analyzed_at: string | null;
  source_section: string | null;
}

interface AnalysisResult {
  success: boolean;
  org_name: string;
  conditions: Array<{
    condition_id: string;
    condition_number: string;
    status: string;
    evidence: string;
    gap_description: string | null;
    closure_options: string[];
    ai_summary: string;
    ai_confidence: number;
  }>;
  summary: {
    total_conditions: number;
    meets_count: number;
    partially_meets_count: number;
    does_not_meet_count: number;
    overall_eligibility: string;
    go_recommendation: string;
    recommendations: string[];
    avg_confidence: number;
  };
}

interface Org {
  id: string;
  name: string;
}

export function GatesPage() {
  const [conditions, setConditions] = useState<GateCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState(getCurrentOrgId());
  const [selectedOrgName, setSelectedOrgName] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [tenderName, setTenderName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const tenderId = getCurrentTenderId();

  useEffect(() => {
    loadOrgs();
    if (tenderId) {
      loadConditions();
      loadTenderName();
    }
  }, [tenderId]);

  useEffect(() => {
    const orgName = orgs.find(o => o.id === selectedOrgId)?.name || '';
    setSelectedOrgName(orgName);
  }, [selectedOrgId, orgs]);

  async function loadOrgs() {
    const { data } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');
    if (data) {
      setOrgs(data);
      if (!selectedOrgId && data.length > 0) {
        setSelectedOrgId(data[0].id);
      }
    }
  }

  async function loadTenderName() {
    const { data } = await supabase
      .from('tenders')
      .select('tender_name')
      .eq('id', tenderId)
      .single();
    if (data) setTenderName(data.tender_name);
  }

  async function loadConditions() {
    setLoading(true);
    const { data } = await supabase
      .from('gate_conditions')
      .select('*')
      .eq('tender_id', tenderId)
      .order('condition_number');
    if (data) setConditions(data);
    setLoading(false);
  }

  async function runAnalysis() {
    if (!tenderId || !selectedOrgId) return;

    setAnalyzing(true);
    setAnalysisResult(null);
    setErrorMsg('');

    try {
      const response = await fetch(getEdgeFunctionUrl('gate-analyze'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          tender_id: tenderId,
          org_id: selectedOrgId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAnalysisResult(result);
        await loadConditions();
      } else {
        setErrorMsg(result.error || 'שגיאה בניתוח');
      }
    } catch (err) {
      setErrorMsg('שגיאה בחיבור לשרת');
      console.error('Analysis error:', err);
    }

    setAnalyzing(false);
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'MEETS': return <CheckCircle size={16} style={{ color: 'var(--success)' }} />;
      case 'PARTIALLY_MEETS': return <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />;
      case 'DOES_NOT_MEET': return <XCircle size={16} style={{ color: 'var(--danger)' }} />;
      default: return <HelpCircle size={16} style={{ color: 'var(--dark-400)' }} />;
    }
  }

  function getStatusClass(status: string) {
    switch (status) {
      case 'MEETS': return 'gate-meets';
      case 'PARTIALLY_MEETS': return 'gate-partial';
      case 'DOES_NOT_MEET': return 'gate-fails';
      default: return 'gate-unknown';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'MEETS': return 'עומד';
      case 'PARTIALLY_MEETS': return 'חלקי';
      case 'DOES_NOT_MEET': return 'לא עומד';
      default: return 'לא נבדק';
    }
  }

  const meetsCount = conditions.filter(c => c.status === 'MEETS').length;
  const partialCount = conditions.filter(c => c.status === 'PARTIALLY_MEETS').length;
  const failsCount = conditions.filter(c => c.status === 'DOES_NOT_MEET').length;
  const unknownCount = conditions.filter(c => !c.status || c.status === 'UNKNOWN').length;
  const totalCount = conditions.length;
  const analyzed = totalCount > 0 && unknownCount < totalCount;

  const recommendation = analysisResult?.summary?.go_recommendation ||
    (analyzed ? (failsCount > 0 ? 'NO_GO' : partialCount > 0 ? 'CONDITIONAL' : 'GO') : null);

  if (!tenderId) {
    return (
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-right">
            <h1 className="page-title"><Shield size={24} style={{ color: 'var(--primary)' }} /> תנאי סף - Gatekeeping</h1>
            <p className="page-subtitle">ניתוח זכאות ועמידה בתנאי סף</p>
          </div>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Shield size={28} /></div>
            <div className="empty-state-title">לא נבחר מכרז</div>
            <div className="empty-state-text">בחר מכרז מהדשבורד כדי לנתח את תנאי הסף</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner spinner-lg" />
        <span>טוען תנאי סף...</span>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-right">
          <h1 className="page-title">
            <Shield size={24} style={{ color: 'var(--primary)' }} />
            תנאי סף - Gatekeeping
          </h1>
          <p className="page-subtitle">{tenderName}</p>
        </div>
        <div className="page-header-actions">
          <select
            className="btn btn-secondary"
            style={{ minWidth: '200px', appearance: 'auto' }}
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
          >
            {orgs.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <button
            className="btn btn-primary btn-lg"
            onClick={runAnalysis}
            disabled={analyzing || !selectedOrgId}
          >
            {analyzing ? (
              <>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                מנתח...
              </>
            ) : (
              <>
                <Play size={16} />
                נתח תנאי סף
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="card" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', marginBottom: '1rem' }}>
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{errorMsg}</span>
        </div>
      )}

      {/* Decision Banner */}
      {recommendation && analyzed && (
        <div className={`decision-banner decision-${recommendation === 'GO' ? 'go' : recommendation === 'CONDITIONAL' ? 'conditional' : 'nogo'}`}>
          <div className="decision-label">
            {recommendation === 'GO' ? 'GO' : recommendation === 'CONDITIONAL' ? 'CONDITIONAL' : 'NO GO'}
          </div>
          <div className="decision-subtitle">
            {recommendation === 'GO' && `${selectedOrgName} עומדת בכל תנאי הסף - מומלץ להגיש הצעה`}
            {recommendation === 'CONDITIONAL' && `${selectedOrgName} עומדת חלקית - נדרשת השלמה`}
            {recommendation === 'NO_GO' && `${selectedOrgName} לא עומדת בתנאי סף מהותיים`}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
        <div className="stat-card">
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">תנאי סף</div>
        </div>
        <div className="stat-card" style={{ borderRight: '3px solid var(--success)' }}>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{meetsCount}</div>
          <div className="stat-label">עומד</div>
        </div>
        <div className="stat-card" style={{ borderRight: '3px solid var(--warning)' }}>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{partialCount}</div>
          <div className="stat-label">חלקי</div>
        </div>
        <div className="stat-card" style={{ borderRight: '3px solid var(--danger)' }}>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{failsCount}</div>
          <div className="stat-label">לא עומד</div>
        </div>
      </div>

      {/* Summary Bar */}
      {analyzed && totalCount > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div className="summary-bar">
            <div className="summary-segment" style={{ width: `${(meetsCount / totalCount) * 100}%`, background: 'var(--success)' }} />
            <div className="summary-segment" style={{ width: `${(partialCount / totalCount) * 100}%`, background: 'var(--warning)' }} />
            <div className="summary-segment" style={{ width: `${(failsCount / totalCount) * 100}%`, background: 'var(--danger)' }} />
            <div className="summary-segment" style={{ width: `${(unknownCount / totalCount) * 100}%`, background: 'var(--dark-200)' }} />
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysisResult?.summary?.recommendations && analysisResult.summary.recommendations.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', background: 'var(--blue-50)', borderColor: 'var(--blue-200)' }}>
          <div className="card-title" style={{ marginBottom: '0.5rem', color: 'var(--blue-800)' }}>
            <Building2 size={16} /> המלצות
          </div>
          <ul style={{ listStyle: 'none', fontSize: '0.87rem', color: 'var(--dark-700)' }}>
            {analysisResult.summary.recommendations.map((rec, i) => (
              <li key={i} style={{ padding: '0.2rem 0', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>&#8226;</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conditions List */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Shield size={18} />
            רשימת תנאי סף ({totalCount})
          </div>
          {analyzed && (
            <button className="btn btn-ghost btn-sm" onClick={runAnalysis} disabled={analyzing}>
              <RefreshCw size={14} /> נתח מחדש
            </button>
          )}
        </div>

        <div className="gate-list">
          {conditions.map((cond) => {
            const isExpanded = expandedIds.has(cond.id);
            const hasAnalysis = cond.status && cond.status !== 'UNKNOWN';

            return (
              <div
                key={cond.id}
                className={`gate-item ${getStatusClass(cond.status)}`}
                onClick={() => toggleExpand(cond.id)}
              >
                <div className="gate-number">{cond.condition_number}</div>
                <div className="gate-content">
                  <div className="gate-text">{cond.condition_text}</div>
                  <div className="gate-meta">
                    {cond.is_mandatory ? (
                      <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>חובה</span>
                    ) : (
                      <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>יתרון</span>
                    )}
                    {cond.requirement_type && (
                      <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                        {cond.requirement_type === 'CAPABILITY' ? 'יכולת' : 'ביצוע'}
                      </span>
                    )}
                    {hasAnalysis && (
                      <span className={`badge ${cond.status === 'MEETS' ? 'badge-success' : cond.status === 'PARTIALLY_MEETS' ? 'badge-warning' : 'badge-danger'}`}>
                        {getStatusIcon(cond.status)} {getStatusText(cond.status)}
                      </span>
                    )}
                    {cond.ai_confidence != null && cond.ai_confidence > 0 && (
                      <div className="confidence-meter">
                        <div className="confidence-bar">
                          <div
                            className="confidence-fill"
                            style={{
                              width: `${cond.ai_confidence * 100}%`,
                              background: cond.ai_confidence > 0.8 ? 'var(--success)' : cond.ai_confidence > 0.5 ? 'var(--warning)' : 'var(--danger)',
                            }}
                          />
                        </div>
                        <span className="confidence-value">{Math.round(cond.ai_confidence * 100)}%</span>
                      </div>
                    )}
                    {cond.source_section && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--dark-400)' }}>סעיף {cond.source_section}</span>
                    )}
                    <span style={{ marginRight: 'auto' }}>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </div>

                  {isExpanded && hasAnalysis && (
                    <div className="gate-expanded">
                      {cond.ai_summary && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <div className="gate-evidence-label">סיכום</div>
                          <div style={{ fontSize: '0.87rem', color: 'var(--dark-700)' }}>{cond.ai_summary}</div>
                        </div>
                      )}
                      {cond.company_evidence && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <div className="gate-evidence-label">ראיות</div>
                          <div className="gate-evidence">{cond.company_evidence}</div>
                        </div>
                      )}
                      {cond.gap_description && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <div className="gate-evidence-label" style={{ color: 'var(--danger)' }}>פער</div>
                          <div className="gate-evidence" style={{ borderRight: '3px solid var(--danger)' }}>
                            {cond.gap_description}
                          </div>
                        </div>
                      )}
                      {cond.closure_options && cond.closure_options.length > 0 && (
                        <div>
                          <div className="gate-evidence-label" style={{ color: 'var(--primary)' }}>פתרונות מוצעים</div>
                          <ul className="gate-closure-options">
                            {cond.closure_options.map((opt, i) => (
                              <li key={i}>{opt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
