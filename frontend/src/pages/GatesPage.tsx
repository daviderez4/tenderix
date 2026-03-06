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
  Lightbulb,
  FileText,
  Users,
  Wrench,
  MessageSquare,
  Ban,
  Handshake,
  Target,
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
    // Expand all on analysis
    setExpandedIds(new Set());

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
        // Expand all conditions after analysis
        if (result.conditions) {
          setExpandedIds(new Set(result.conditions.map((c: { condition_id: string }) => c.condition_id)));
        }
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

  function getStatusIcon(status: string, size = 16) {
    switch (status) {
      case 'MEETS': return <CheckCircle size={size} style={{ color: 'var(--success)' }} />;
      case 'PARTIALLY_MEETS': return <AlertTriangle size={size} style={{ color: 'var(--warning)' }} />;
      case 'DOES_NOT_MEET': return <XCircle size={size} style={{ color: 'var(--danger)' }} />;
      default: return <HelpCircle size={size} style={{ color: 'var(--dark-400)' }} />;
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

  function getClosureIcon(option: string) {
    if (option.includes('קבלן משנה')) return <Handshake size={14} />;
    if (option.includes('שותפות') || option.includes('קונסורציום') || option.includes('שותף')) return <Users size={14} />;
    if (option.includes('מסמך') || option.includes('אישור')) return <FileText size={14} />;
    if (option.includes('פיתוח') || option.includes('התאמה') || option.includes('הכשרה') || option.includes('הסמכה')) return <Wrench size={14} />;
    if (option.includes('שאלת') || option.includes('הבהרה') || option.includes('בירור')) return <MessageSquare size={14} />;
    if (option.includes('חוסם') || option.includes('אין פתרון')) return <Ban size={14} />;
    return <Lightbulb size={14} />;
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
            <h1 className="page-title"><Shield size={24} style={{ color: 'var(--primary)' }} /> Gatekeeping</h1>
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
            Gatekeeping
          </h1>
          <p className="page-subtitle">{tenderName}</p>
        </div>
        <div className="page-header-actions">
          <select
            className="btn btn-secondary"
            style={{ minWidth: '220px', appearance: 'auto' }}
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
                מנתח {totalCount} תנאים...
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
        <div className="card" style={{ marginBottom: '1rem', background: recommendation === 'GO' ? 'var(--success-bg)' : recommendation === 'CONDITIONAL' ? 'var(--warning-bg)' : 'var(--danger-bg)', borderColor: recommendation === 'GO' ? 'var(--success-border)' : recommendation === 'CONDITIONAL' ? 'var(--warning-border)' : 'var(--danger-border)' }}>
          <div className="card-title" style={{ marginBottom: '0.5rem', color: recommendation === 'GO' ? 'var(--success)' : recommendation === 'CONDITIONAL' ? '#92400e' : 'var(--danger)' }}>
            <Target size={16} /> המלצות אסטרטגיות
          </div>
          <ul style={{ listStyle: 'none', fontSize: '0.87rem', color: 'var(--dark-700)' }}>
            {analysisResult.summary.recommendations.map((rec, i) => (
              <li key={i} style={{ padding: '0.25rem 0', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>&#8226;</span>
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
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {analyzed && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                if (expandedIds.size === conditions.length) {
                  setExpandedIds(new Set());
                } else {
                  setExpandedIds(new Set(conditions.map(c => c.id)));
                }
              }}>
                {expandedIds.size === conditions.length ? 'סגור הכל' : 'פתח הכל'}
              </button>
            )}
            {analyzed && (
              <button className="btn btn-ghost btn-sm" onClick={runAnalysis} disabled={analyzing}>
                <RefreshCw size={14} /> נתח מחדש
              </button>
            )}
          </div>
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
                        {getStatusIcon(cond.status, 12)} {getStatusText(cond.status)}
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
                      <span style={{ fontSize: '0.72rem', color: 'var(--dark-400)' }}>
                        <FileText size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> סעיף {cond.source_section}
                      </span>
                    )}
                    <span style={{ marginRight: 'auto' }}>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </div>

                  {isExpanded && hasAnalysis && (
                    <div className="gate-expanded">
                      {/* AI Summary - always on top */}
                      {cond.ai_summary && (
                        <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.8rem', borderRadius: '8px', background: cond.status === 'MEETS' ? 'var(--success-bg)' : cond.status === 'PARTIALLY_MEETS' ? 'var(--warning-bg)' : 'var(--danger-bg)', border: `1px solid ${cond.status === 'MEETS' ? 'var(--success-border)' : cond.status === 'PARTIALLY_MEETS' ? 'var(--warning-border)' : 'var(--danger-border)'}` }}>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                            {getStatusIcon(cond.status, 16)}
                            <span style={{ fontSize: '0.87rem', fontWeight: 600, color: 'var(--dark-800)' }}>{cond.ai_summary}</span>
                          </div>
                        </div>
                      )}

                      {/* Evidence */}
                      {cond.company_evidence && (
                        <div style={{ marginBottom: '0.6rem' }}>
                          <div className="gate-evidence-label">
                            <Building2 size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> ראיות מפרופיל החברה
                          </div>
                          <div className="gate-evidence" style={{ whiteSpace: 'pre-wrap' }}>{cond.company_evidence}</div>
                        </div>
                      )}

                      {/* Gap */}
                      {cond.gap_description && (
                        <div style={{ marginBottom: '0.6rem' }}>
                          <div className="gate-evidence-label" style={{ color: 'var(--danger)' }}>
                            <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> פער שזוהה
                          </div>
                          <div className="gate-evidence" style={{ borderRight: '3px solid var(--danger)', background: 'var(--danger-bg)' }}>
                            {cond.gap_description}
                          </div>
                        </div>
                      )}

                      {/* Closure Options - the magic! */}
                      {cond.closure_options && cond.closure_options.length > 0 && (
                        <div>
                          <div className="gate-evidence-label" style={{ color: 'var(--primary)' }}>
                            <Lightbulb size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> מסלולי סגירת פער
                          </div>
                          <ul className="gate-closure-options">
                            {cond.closure_options.map((opt, i) => (
                              <li key={i} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.5rem',
                                background: opt.includes('חוסם') || opt.includes('אין פתרון') ? 'var(--danger-bg)' : 'var(--blue-50)',
                                borderColor: opt.includes('חוסם') ? 'var(--danger-border)' : 'var(--blue-200)',
                              }}>
                                <span style={{ flexShrink: 0, marginTop: '1px', color: opt.includes('חוסם') ? 'var(--danger)' : 'var(--primary)' }}>
                                  {getClosureIcon(opt)}
                                </span>
                                <span>{opt}</span>
                              </li>
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
