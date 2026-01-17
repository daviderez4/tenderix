import { useState, useEffect } from 'react';
import { CheckSquare, RefreshCw, FileQuestion, Lightbulb, FileCheck, AlertCircle, FileText, Zap, RotateCcw, ListOrdered, DollarSign, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/tenderix';
import type { GateCondition, Tender } from '../api/tenderix';
import { getCurrentTenderId, getCurrentOrgId, getTenderExtractedText } from '../api/config';
import { Loading } from '../components/Loading';
import { StatusBadge } from '../components/StatusBadge';

type TabType = 'conditions' | 'clarifications' | 'strategic' | 'documents' | 'reanalysis' | 'priorities' | 'pricing';

export function GatesPage() {
  const [tender, setTender] = useState<Tender | null>(null);
  const [gates, setGates] = useState<GateCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('conditions');
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [workflowResults, setWorkflowResults] = useState<Record<string, any>>({});
  const [hasExtractedText, setHasExtractedText] = useState(false);
  const [extractingGates, setExtractingGates] = useState(false);
  const [clarificationText, setClarificationText] = useState('');
  const [analyzingGateId, setAnalyzingGateId] = useState<string | null>(null);
  const [expandedGates, setExpandedGates] = useState<Set<string>>(new Set());
  const [analyzingAllGates, setAnalyzingAllGates] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });

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

      // Don't make API calls if no tender is selected
      if (!tenderId) {
        setTender(null);
        setGates([]);
        setHasExtractedText(false);
        return;
      }

      const [tenderData, gatesData] = await Promise.all([
        api.tenders.get(tenderId),
        api.getGateConditions(tenderId),
      ]);
      setTender(tenderData);
      setGates(gatesData);

      // Check if we have extracted text for this tender
      const extractedText = getTenderExtractedText(tenderId);
      setHasExtractedText(!!extractedText && extractedText.length > 100);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Extract gates from stored tender text
  async function extractGatesFromText() {
    const tenderId = getCurrentTenderId();
    const extractedText = getTenderExtractedText(tenderId);

    if (!extractedText) {
      console.error('No extracted text found for tender');
      return;
    }

    setExtractingGates(true);
    try {
      console.log(`Extracting gates from ${extractedText.length} chars of text`);
      const result = await api.workflows.extractGates(tenderId, extractedText);
      console.log('Extract gates result:', result);

      if (result.success && result.conditions) {
        // Reload gates from database
        await loadData();
      }
    } catch (error) {
      console.error('Error extracting gates:', error);
    } finally {
      setExtractingGates(false);
    }
  }

  // Toggle expanded state for a gate
  function toggleGateExpanded(gateId: string) {
    setExpandedGates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gateId)) {
        newSet.delete(gateId);
      } else {
        newSet.add(gateId);
      }
      return newSet;
    });
  }

  // Analyze a single gate condition with AI (Module 2.6 + 2.5)
  async function analyzeGate(gate: GateCondition) {
    const orgId = getCurrentOrgId();
    setAnalyzingGateId(gate.id);

    try {
      // Call the new AI analysis endpoint for this specific condition
      const result = await api.workflows.analyzeGateWithAI(
        gate.tender_id,
        gate.id,
        gate.condition_text,
        orgId
      );

      if (result.success) {
        // Update local state with the analysis results
        setGates(prev => prev.map(g => {
          if (g.id === gate.id) {
            return {
              ...g,
              status: result.status,
              evidence: result.evidence,
              gap_description: result.gap_description,
              legal_classification: result.interpretation?.legal?.classification as 'strict' | 'open' | 'proof_dependent' | undefined,
              legal_reasoning: result.interpretation?.legal?.reasoning,
              technical_requirement: result.interpretation?.technical?.what_is_required,
              equivalent_options: result.interpretation?.technical?.equivalent_options,
              ai_confidence: result.ai_confidence,
              ai_summary: result.ai_summary,
              ai_analyzed_at: new Date().toISOString(),
            };
          }
          return g;
        }));
      }

      // Expand to show results
      setExpandedGates(prev => new Set([...prev, gate.id]));
    } catch (error) {
      console.error('Error analyzing gate:', error);
    } finally {
      setAnalyzingGateId(null);
    }
  }

  // Analyze all gates with AI one by one
  async function analyzeAllGates() {
    const orgId = getCurrentOrgId();
    const unanalyzedGates = gates.filter(g => !g.status || g.status === 'UNKNOWN');

    if (unanalyzedGates.length === 0) {
      alert('כל התנאים כבר נותחו');
      return;
    }

    setAnalyzingAllGates(true);
    setAnalysisProgress({ current: 0, total: unanalyzedGates.length });

    try {
      for (let i = 0; i < unanalyzedGates.length; i++) {
        const gate = unanalyzedGates[i];
        setAnalysisProgress({ current: i + 1, total: unanalyzedGates.length });

        try {
          const result = await api.workflows.analyzeGateWithAI(
            gate.tender_id,
            gate.id,
            gate.condition_text,
            orgId
          );

          if (result.success) {
            setGates(prev => prev.map(g => {
              if (g.id === gate.id) {
                return {
                  ...g,
                  status: result.status,
                  evidence: result.evidence,
                  gap_description: result.gap_description,
                  legal_classification: result.interpretation?.legal?.classification as 'strict' | 'open' | 'proof_dependent' | undefined,
                  legal_reasoning: result.interpretation?.legal?.reasoning,
                  technical_requirement: result.interpretation?.technical?.what_is_required,
                  equivalent_options: result.interpretation?.technical?.equivalent_options,
                  ai_confidence: result.ai_confidence,
                  ai_summary: result.ai_summary,
                  ai_analyzed_at: new Date().toISOString(),
                };
              }
              return g;
            }));
          }
        } catch (error) {
          console.error(`Error analyzing gate ${gate.id}:`, error);
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } finally {
      setAnalyzingAllGates(false);
      setAnalysisProgress({ current: 0, total: 0 });
    }
  }

  async function runWorkflow(type: 'match' | 'clarifications' | 'strategic' | 'documents' | 'reanalysis' | 'priorities' | 'pricing') {
    const tenderId = getCurrentTenderId();
    const orgId = getCurrentOrgId();

    setRunningWorkflow(type);
    try {
      let result;
      switch (type) {
        case 'match':
          result = await api.workflows.matchGates(tenderId, orgId);
          await loadData();
          break;
        case 'clarifications':
          result = await api.workflows.getClarifications(tenderId, orgId);
          break;
        case 'strategic':
          result = await api.workflows.getStrategicQuestions(tenderId, orgId);
          break;
        case 'documents':
          result = await api.workflows.getRequiredDocs(tenderId, orgId);
          break;
        case 'reanalysis':
          result = await api.workflows.reAnalyzeAfterClarifications(tenderId, orgId, clarificationText);
          await loadData();
          break;
        case 'priorities':
          result = await api.workflows.generatePrioritizedQuestions(tenderId, orgId);
          break;
        case 'pricing':
          // Get BOQ items for pricing analysis - using gate conditions as proxy since BOQ may not exist
          result = await api.workflows.analyzePricingRisks(tenderId, gates as unknown as import('../api/tenderix').BOQItem[]);
          break;
      }
      setWorkflowResults(prev => ({ ...prev, [type]: result }));
    } catch (error) {
      console.error('Workflow error:', error);
    } finally {
      setRunningWorkflow(null);
    }
  }

  if (loading) return <Loading />;

  // Show message if no tender is selected
  if (!tender) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
          <h2>לא נבחר מכרז</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
            יש לבחור מכרז מהדשבורד או להעלות מכרז חדש
          </p>
          <a href="/" className="btn btn-primary">חזור לדשבורד</a>
        </div>
      </div>
    );
  }

  const gateStats = {
    total: gates.length,
    meets: gates.filter(g => g.status === 'MEETS').length,
    partial: gates.filter(g => g.status === 'PARTIALLY_MEETS').length,
    fails: gates.filter(g => g.status === 'DOES_NOT_MEET').length,
    mandatory: gates.filter(g => g.is_mandatory).length,
    aiAnalyzed: gates.filter(g => g.status && g.status !== 'UNKNOWN').length,
    byCategory: {
      experience: gates.filter(g => g.requirement_type === 'EXPERIENCE').length,
      financial: gates.filter(g => g.requirement_type === 'FINANCIAL').length,
      certification: gates.filter(g => g.requirement_type === 'CERTIFICATION').length,
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <CheckSquare size={28} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
          תנאי סף
        </h1>
        <p className="page-subtitle">
          {tender.tender_name}
          {tender.tender_number && ` | מכרז ${tender.tender_number}`}
        </p>
      </div>

      {/* Extract Gates from Document - show when text is available but no gates extracted */}
      {hasExtractedText && gates.length === 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(0, 212, 255, 0.1))', borderRight: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <FileText size={32} style={{ color: '#7c3aed' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, color: '#7c3aed' }}>מסמך מכרז זמין לניתוח</h3>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-400)', fontSize: '0.9rem' }}>
                לחץ לחילוץ תנאי הסף אוטומטית מהמסמך שהועלה
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={extractGatesFromText}
              disabled={extractingGates}
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            >
              {extractingGates ? <div className="spinner" /> : <Zap size={18} />}
              חלץ תנאי סף
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{gateStats.aiAnalyzed}/{gateStats.total}</div>
          <div className="stat-label">נותחו AI</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{gateStats.meets}</div>
          <div className="stat-label">עומדים</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{gateStats.fails}</div>
          <div className="stat-label">לא עומדים</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{gateStats.mandatory}</div>
          <div className="stat-label">תנאי חובה</div>
        </div>
      </div>

      {/* Category breakdown */}
      {(gateStats.byCategory.experience > 0 || gateStats.byCategory.financial > 0 || gateStats.byCategory.certification > 0) && (
        <div className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>לפי קטגוריה:</span>
            {gateStats.byCategory.experience > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#7c3aed' }}></span>
                <span>{gateStats.byCategory.experience} ניסיון</span>
              </span>
            )}
            {gateStats.byCategory.financial > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#059669' }}></span>
                <span>{gateStats.byCategory.financial} כספי</span>
              </span>
            )}
            {gateStats.byCategory.certification > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#d97706' }}></span>
                <span>{gateStats.byCategory.certification} הסמכות</span>
              </span>
            )}
            {gateStats.total - gateStats.byCategory.experience - gateStats.byCategory.financial - gateStats.byCategory.certification > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#6b7280' }}></span>
                <span>{gateStats.total - gateStats.byCategory.experience - gateStats.byCategory.financial - gateStats.byCategory.certification} אחר</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>פעולות AI</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Extract gates button - always show if text is available */}
          {hasExtractedText && (
            <button
              className="btn btn-secondary"
              onClick={extractGatesFromText}
              disabled={extractingGates || runningWorkflow !== null}
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: 'none' }}
            >
              {extractingGates ? <div className="spinner" /> : <Zap size={18} />}
              חלץ תנאי סף מהמסמך
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={analyzeAllGates}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates || gates.length === 0}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
          >
            {analyzingAllGates ? (
              <>
                <div className="spinner" />
                {analysisProgress.current}/{analysisProgress.total}
              </>
            ) : (
              <>
                <Sparkles size={18} />
                נתח את כל התנאים עם AI
              </>
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => runWorkflow('match')}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates}
          >
            {runningWorkflow === 'match' ? <div className="spinner" /> : <RefreshCw size={18} />}
            התאמה מהירה לפרופיל
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('clarifications'); setActiveTab('clarifications'); }}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates}
          >
            {runningWorkflow === 'clarifications' ? <div className="spinner" /> : <FileQuestion size={18} />}
            שאלות הבהרה
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('strategic'); setActiveTab('strategic'); }}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates}
          >
            {runningWorkflow === 'strategic' ? <div className="spinner" /> : <Lightbulb size={18} />}
            שאלות אסטרטגיות
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('documents'); setActiveTab('documents'); }}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates}
          >
            {runningWorkflow === 'documents' ? <div className="spinner" /> : <FileCheck size={18} />}
            מסמכים נדרשים
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setActiveTab('reanalysis')}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates}
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none' }}
          >
            <RotateCcw size={18} />
            ניתוח מחדש (הבהרות)
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('priorities'); setActiveTab('priorities'); }}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none' }}
          >
            {runningWorkflow === 'priorities' ? <div className="spinner" /> : <ListOrdered size={18} />}
            שאלות עם עדיפויות
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('pricing'); setActiveTab('pricing'); }}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates}
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', border: 'none' }}
          >
            {runningWorkflow === 'pricing' ? <div className="spinner" /> : <DollarSign size={18} />}
            ניתוח סיכוני תמחור
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'conditions' ? 'active' : ''}`} onClick={() => setActiveTab('conditions')}>
          תנאי סף ({gates.length})
        </button>
        <button className={`tab ${activeTab === 'clarifications' ? 'active' : ''}`} onClick={() => setActiveTab('clarifications')}>
          שאלות הבהרה
        </button>
        <button className={`tab ${activeTab === 'strategic' ? 'active' : ''}`} onClick={() => setActiveTab('strategic')}>
          שאלות אסטרטגיות
        </button>
        <button className={`tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          מסמכים נדרשים
        </button>
        <button className={`tab ${activeTab === 'reanalysis' ? 'active' : ''}`} onClick={() => setActiveTab('reanalysis')}>
          ניתוח מחדש
        </button>
        <button className={`tab ${activeTab === 'priorities' ? 'active' : ''}`} onClick={() => setActiveTab('priorities')}>
          שאלות P1/P2/P3
        </button>
        <button className={`tab ${activeTab === 'pricing' ? 'active' : ''}`} onClick={() => setActiveTab('pricing')}>
          סיכוני תמחור
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'conditions' && (
        <div>
          {/* Summary badges */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>
              {gates.length} תנאים
            </span>
            <span className="badge badge-danger">{gateStats.mandatory} חובה</span>
            {gates.filter(g => g.requirement_type === 'EXPERIENCE').length > 0 && (
              <span className="badge" style={{ background: '#7c3aed', color: 'white' }}>
                {gates.filter(g => g.requirement_type === 'EXPERIENCE').length} ניסיון
              </span>
            )}
            {gates.filter(g => g.requirement_type === 'FINANCIAL').length > 0 && (
              <span className="badge" style={{ background: '#059669', color: 'white' }}>
                {gates.filter(g => g.requirement_type === 'FINANCIAL').length} כספי
              </span>
            )}
            {gates.filter(g => g.requirement_type === 'CERTIFICATION').length > 0 && (
              <span className="badge" style={{ background: '#d97706', color: 'white' }}>
                {gates.filter(g => g.requirement_type === 'CERTIFICATION').length} הסמכות
              </span>
            )}
          </div>

          {gates.map((gate) => {
            const isExpanded = expandedGates.has(gate.id);
            const isAnalyzing = analyzingGateId === gate.id;
            const categoryColors: Record<string, string> = {
              EXPERIENCE: '#7c3aed',
              FINANCIAL: '#059669',
              CERTIFICATION: '#d97706',
              PERSONNEL: '#0891b2',
              EQUIPMENT: '#6366f1',
              LEGAL: '#dc2626',
              OTHER: '#6b7280',
            };
            const categoryLabels: Record<string, string> = {
              EXPERIENCE: 'ניסיון',
              FINANCIAL: 'כספי',
              CERTIFICATION: 'הסמכה',
              PERSONNEL: 'כח אדם',
              EQUIPMENT: 'ציוד',
              LEGAL: 'משפטי',
              OTHER: 'אחר',
            };

            return (
              <div key={gate.id} className="card" style={{ marginBottom: '0.75rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  {/* Number badge */}
                  <div style={{
                    background: 'linear-gradient(135deg, var(--primary), #6d28d9)',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    fontWeight: 'bold',
                    minWidth: '45px',
                    textAlign: 'center'
                  }}>
                    #{gate.condition_number}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '0.5rem' }}>{gate.condition_text}</div>

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <StatusBadge status={gate.status || 'UNKNOWN'} />
                      {gate.is_mandatory && <span className="badge badge-danger">חובה</span>}
                      {gate.requirement_type && (
                        <span className="badge" style={{
                          background: categoryColors[gate.requirement_type] || '#6b7280',
                          color: 'white'
                        }}>
                          {categoryLabels[gate.requirement_type] || gate.requirement_type}
                        </span>
                      )}
                      {gate.required_years && (
                        <span className="badge" style={{ background: 'var(--gray-700)', color: 'white' }}>
                          {gate.required_years} שנים
                        </span>
                      )}
                      {gate.required_amount && (
                        <span className="badge" style={{ background: 'var(--gray-700)', color: 'white' }}>
                          {(gate.required_amount / 1000000).toFixed(1)}M ₪
                        </span>
                      )}
                      {gate.required_count && (
                        <span className="badge" style={{ background: 'var(--gray-700)', color: 'white' }}>
                          {gate.required_count} פרויקטים
                        </span>
                      )}
                      {gate.source_section && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                          📄 עמוד {gate.source_page || '?'} | סעיף {gate.source_section}
                        </span>
                      )}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'rgba(124, 58, 237, 0.1)',
                        borderRadius: '8px',
                        borderRight: '3px solid var(--primary)'
                      }}>
                        {gate.evidence && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: 'var(--success)' }}>✓ ראיה:</strong>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-300)' }}>{gate.evidence}</p>
                          </div>
                        )}
                        {gate.gap_description && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: 'var(--danger)' }}>✗ פער:</strong>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-300)' }}>{gate.gap_description}</p>
                          </div>
                        )}
                        {gate.legal_classification && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <strong>פרשנות משפטית:</strong>
                            <span className="badge" style={{ marginRight: '0.5rem' }}>
                              {gate.legal_classification === 'strict' ? 'קשיח' :
                               gate.legal_classification === 'open' ? 'פתוח לפרשנות' : 'תלוי הוכחות'}
                            </span>
                            {gate.legal_reasoning && <span style={{ color: 'var(--gray-400)' }}>{gate.legal_reasoning}</span>}
                          </div>
                        )}
                        {gate.technical_requirement && (
                          <div>
                            <strong>דרישה טכנית:</strong>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-300)' }}>{gate.technical_requirement}</p>
                          </div>
                        )}
                        {gate.bearer_entity && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <strong>נושא הדרישה:</strong>
                            <span className="badge" style={{ marginRight: '0.5rem' }}>
                              {gate.bearer_entity === 'bidder_only' ? 'המציע בלבד' :
                               gate.bearer_entity === 'consortium_member' ? 'שותף במיזם' : 'קבלן משנה מותר'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => analyzeGate(gate)}
                      disabled={isAnalyzing || runningWorkflow !== null}
                      style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.85rem',
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      {isAnalyzing ? <div className="spinner" style={{ width: '14px', height: '14px' }} /> : <Sparkles size={14} />}
                      נתח תנאי זה
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => toggleGateExpanded(gate.id)}
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? 'הסתר' : 'פרטים'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'clarifications' && (
        <div className="card">
          {workflowResults.clarifications ? (
            <WorkflowResult data={workflowResults.clarifications} type="clarifications" />
          ) : (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem' }}>
              לחץ על "שאלות הבהרה" כדי לייצר שאלות למזמין
            </p>
          )}
        </div>
      )}

      {activeTab === 'strategic' && (
        <div className="card">
          {workflowResults.strategic ? (
            <WorkflowResult data={workflowResults.strategic} type="strategic" />
          ) : (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem' }}>
              לחץ על "שאלות אסטרטגיות" כדי לייצר שאלות שיפיקו יתרון תחרותי
            </p>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card">
          {workflowResults.documents ? (
            <WorkflowResult data={workflowResults.documents} type="documents" />
          ) : (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem' }}>
              לחץ על "מסמכים נדרשים" כדי לייצר רשימת מסמכים
            </p>
          )}
        </div>
      )}

      {/* Module 2.10: ניתוח מחדש אחרי הבהרות */}
      {activeTab === 'reanalysis' && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', color: '#f59e0b' }}>
            <RotateCcw size={20} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
            ניתוח מחדש אחרי הבהרות
          </h3>
          <p style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>
            הזן את תוכן ההבהרות שהתקבלו מהמזמין כדי לנתח מחדש את תנאי הסף ולזהות שינויים
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              תוכן ההבהרות:
            </label>
            <textarea
              value={clarificationText}
              onChange={(e) => setClarificationText(e.target.value)}
              placeholder="הדבק כאן את תוכן תשובות ההבהרה שהתקבלו..."
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '1rem',
                border: '1px solid var(--gray-300)',
                borderRadius: '8px',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
              }}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={() => runWorkflow('reanalysis')}
            disabled={runningWorkflow !== null || !clarificationText.trim()}
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            {runningWorkflow === 'reanalysis' ? <div className="spinner" /> : <RotateCcw size={18} />}
            נתח מחדש
          </button>

          {workflowResults.reanalysis && (
            <div style={{ marginTop: '1.5rem' }}>
              <WorkflowResult data={workflowResults.reanalysis} type="reanalysis" />
            </div>
          )}
        </div>
      )}

      {/* Module 2.7: שאלות עם עדיפויות P1/P2/P3 */}
      {activeTab === 'priorities' && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', color: '#10b981' }}>
            <ListOrdered size={20} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
            שאלות עם עדיפויות
          </h3>
          {workflowResults.priorities ? (
            <WorkflowResult data={workflowResults.priorities} type="priorities" />
          ) : (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem' }}>
              לחץ על "שאלות עם עדיפויות" כדי לייצר שאלות ממוינות לפי חשיבות
            </p>
          )}
        </div>
      )}

      {/* Module 3.5: ניתוח סיכוני תמחור */}
      {activeTab === 'pricing' && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', color: '#8b5cf6' }}>
            <DollarSign size={20} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
            ניתוח סיכוני תמחור
          </h3>
          {workflowResults.pricing ? (
            <WorkflowResult data={workflowResults.pricing} type="pricing" />
          ) : (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem' }}>
              לחץ על "ניתוח סיכוני תמחור" כדי לנתח סיכונים והמלצות תמחור
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WorkflowResult({ data, type }: { data: any; type: string }) {
  if (!data.success) {
    return <p style={{ color: 'var(--danger)' }}>שגיאה בהרצת התהליך</p>;
  }

  // Handle clarifications - API returns "questions" array
  if (type === 'clarifications' && (data.clarifications || data.questions)) {
    const questions = data.clarifications || data.questions || [];
    return (
      <div>
        <h4 style={{ marginBottom: '1rem' }}>שאלות הבהרה ({questions.length})</h4>
        {questions.map((q: { question: string; reason?: string; rationale?: string; expected_impact?: string; priority?: string; condition?: string }, i: number) => (
          <div key={i} className="gate-item">
            <div className="gate-number">{q.condition || (i + 1)}</div>
            <div className="gate-content">
              <div className="gate-text" style={{ fontWeight: 500 }}>{q.question}</div>
              {q.priority && (
                <div className="gate-meta">
                  <span className={`badge ${q.priority === 'P1' ? 'badge-danger' : 'badge-warning'}`}>{q.priority}</span>
                </div>
              )}
              {(q.reason || q.rationale) && (
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                  <strong>סיבה:</strong> {q.reason || q.rationale}
                </div>
              )}
              {q.expected_impact && (
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                  <strong>השפעה צפויה:</strong> {q.expected_impact}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Handle strategic questions - API returns "safe_questions" and "by_type" arrays
  if (type === 'strategic' && (data.strategic_questions || data.safe_questions || data.by_type)) {
    const safeQuestions = data.safe_questions || [];
    const byType = data.by_type || [];
    const allQuestions = data.strategic_questions || [...safeQuestions, ...byType];
    const totalCount = data.total_questions || allQuestions.length;

    return (
      <div>
        <h4 style={{ marginBottom: '1rem' }}>שאלות אסטרטגיות ({totalCount})</h4>

        {safeQuestions.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h5 style={{ color: 'var(--success)', marginBottom: '0.75rem' }}>שאלות בטוחות ({safeQuestions.length})</h5>
            {safeQuestions.map((q: { question: string; type?: string; justification?: string; impact?: string; risk?: string; num?: number }, i: number) => (
              <div key={i} className="gate-item">
                <div className="gate-number">{q.num || (i + 1)}</div>
                <div className="gate-content">
                  <div className="gate-text" style={{ fontWeight: 500 }}>{q.question}</div>
                  {q.type && (
                    <div className="gate-meta">
                      <span className="badge badge-gray">{q.type}</span>
                      {q.risk && <span className={`badge ${q.risk === 'גבוה' ? 'badge-danger' : 'badge-warning'}`}>{q.risk}</span>}
                    </div>
                  )}
                  {q.justification && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                      <strong>נימוק:</strong> {q.justification}
                    </div>
                  )}
                  {q.impact && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      <strong>השפעה:</strong> {q.impact}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {byType.length > 0 && (
          <div>
            <h5 style={{ color: 'var(--warning)', marginBottom: '0.75rem' }}>שאלות אסטרטגיות לפי סוג ({byType.length})</h5>
            {byType.map((q: { question: string; type?: string; justification?: string; impact?: string; risk?: string; num?: number }, i: number) => (
              <div key={i} className="gate-item" style={{ borderRight: '3px solid var(--warning)' }}>
                <div className="gate-number">{q.num || (i + 1)}</div>
                <div className="gate-content">
                  <div className="gate-text" style={{ fontWeight: 500 }}>{q.question}</div>
                  {q.type && (
                    <div className="gate-meta">
                      <span className="badge badge-warning">{q.type}</span>
                      {q.risk && <span className={`badge ${q.risk === 'גבוה' ? 'badge-danger' : 'badge-gray'}`}>סיכון: {q.risk}</span>}
                    </div>
                  )}
                  {q.justification && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                      <strong>נימוק:</strong> {q.justification}
                    </div>
                  )}
                  {q.impact && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      <strong>השפעה:</strong> {q.impact}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === 'documents' && data.required_documents) {
    return (
      <div>
        <h4 style={{ marginBottom: '1rem' }}>מסמכים נדרשים ({data.required_documents.length})</h4>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>שם המסמך</th>
              <th>קטגוריה</th>
              <th>מקור</th>
              <th>זמן הכנה</th>
            </tr>
          </thead>
          <tbody>
            {data.required_documents.map((doc: { document_name: string; category: string; source: string; prep_time: string }, i: number) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{doc.document_name}</td>
                <td><span className="badge badge-gray">{doc.category}</span></td>
                <td>{doc.source}</td>
                <td>{doc.prep_time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Module 2.10: Reanalysis after clarifications
  if (type === 'reanalysis') {
    return (
      <div>
        {/* Summary */}
        {data.summary && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05))',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            borderRight: '4px solid #f59e0b'
          }}>
            <h4 style={{ margin: '0 0 0.5rem', color: '#f59e0b' }}>סיכום</h4>
            <p style={{ margin: 0 }}>{data.summary}</p>
          </div>
        )}

        {/* Changes Detected */}
        {data.changes_detected?.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.75rem' }}>שינויים שזוהו ({data.changes_detected.length})</h4>
            {data.changes_detected.map((change: { area: string; original: string; updated: string }, i: number) => (
              <div key={i} className="gate-item" style={{ borderRight: '3px solid #f59e0b' }}>
                <div className="gate-number">{i + 1}</div>
                <div className="gate-content">
                  <div className="gate-text" style={{ fontWeight: 500 }}>{change.area}</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    <div style={{ color: 'var(--danger)' }}><strong>מקורי:</strong> {change.original}</div>
                    <div style={{ color: 'var(--success)' }}><strong>מעודכן:</strong> {change.updated}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gate Impacts */}
        {data.gate_impacts?.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.75rem', color: 'var(--danger)' }}>השפעה על תנאי סף ({data.gate_impacts.length})</h4>
            {data.gate_impacts.map((impact: { condition_number: string; original_status: string; new_status: string; reason: string }, i: number) => (
              <div key={i} className="gate-item" style={{ borderRight: '3px solid var(--danger)' }}>
                <div className="gate-number">{impact.condition_number}</div>
                <div className="gate-content">
                  <div className="gate-meta">
                    <span className={`badge ${impact.original_status === 'MEETS' ? 'badge-success' : impact.original_status === 'DOES_NOT_MEET' ? 'badge-danger' : 'badge-warning'}`}>
                      {impact.original_status}
                    </span>
                    <span style={{ margin: '0 0.5rem' }}>→</span>
                    <span className={`badge ${impact.new_status === 'MEETS' ? 'badge-success' : impact.new_status === 'DOES_NOT_MEET' ? 'badge-danger' : 'badge-warning'}`}>
                      {impact.new_status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                    <strong>סיבה:</strong> {impact.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations?.length > 0 && (
          <div>
            <h4 style={{ marginBottom: '0.75rem', color: 'var(--success)' }}>המלצות</h4>
            <ul style={{ paddingRight: '1.25rem' }}>
              {data.recommendations.map((rec: string, i: number) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Module 2.7: Prioritized Questions (P1/P2/P3)
  if (type === 'priorities') {
    return (
      <div>
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--gray-100)', borderRadius: '8px' }}>
          <strong>סה"כ שאלות:</strong> {data.total_questions || 0}
        </div>

        {/* P1 - Critical */}
        {data.p1_critical?.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>
              P1 - שאלות קריטיות ({data.p1_critical.length})
            </h4>
            {data.p1_critical.map((q: { question: string; rationale: string; deadline: string }, i: number) => (
              <div key={i} className="gate-item" style={{ borderRight: '4px solid var(--danger)' }}>
                <div className="gate-number" style={{ background: 'var(--danger)', color: 'white' }}>{i + 1}</div>
                <div className="gate-content">
                  <div className="gate-text" style={{ fontWeight: 500 }}>{q.question}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                    <strong>נימוק:</strong> {q.rationale}
                  </div>
                  {q.deadline && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                      <strong>דדליין:</strong> {q.deadline}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* P2 - Important */}
        {data.p2_important?.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: 'var(--warning)', marginBottom: '0.75rem' }}>
              P2 - שאלות חשובות ({data.p2_important.length})
            </h4>
            {data.p2_important.map((q: { question: string; rationale: string }, i: number) => (
              <div key={i} className="gate-item" style={{ borderRight: '4px solid var(--warning)' }}>
                <div className="gate-number" style={{ background: 'var(--warning)', color: 'white' }}>{i + 1}</div>
                <div className="gate-content">
                  <div className="gate-text" style={{ fontWeight: 500 }}>{q.question}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                    <strong>נימוק:</strong> {q.rationale}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* P3 - Nice to have */}
        {data.p3_nice_to_have?.length > 0 && (
          <div>
            <h4 style={{ color: 'var(--gray-500)', marginBottom: '0.75rem' }}>
              P3 - שאלות משניות ({data.p3_nice_to_have.length})
            </h4>
            {data.p3_nice_to_have.map((q: { question: string; rationale: string }, i: number) => (
              <div key={i} className="gate-item" style={{ borderRight: '4px solid var(--gray-400)' }}>
                <div className="gate-number">{i + 1}</div>
                <div className="gate-content">
                  <div className="gate-text" style={{ fontWeight: 500 }}>{q.question}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                    <strong>נימוק:</strong> {q.rationale}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Module 3.5: Pricing Risks Analysis
  if (type === 'pricing') {
    return (
      <div>
        {/* Overall Score */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05))',
          borderRadius: '8px',
          borderRight: '4px solid #8b5cf6'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>ציון סיכון כולל:</strong> {data.overall_risk_score || 0}/100
            </div>
            <div style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              background: (data.overall_risk_score || 0) > 70 ? 'var(--danger)' : (data.overall_risk_score || 0) > 40 ? 'var(--warning)' : 'var(--success)',
              color: 'white',
              fontWeight: 'bold'
            }}>
              {(data.overall_risk_score || 0) > 70 ? 'סיכון גבוה' : (data.overall_risk_score || 0) > 40 ? 'סיכון בינוני' : 'סיכון נמוך'}
            </div>
          </div>
        </div>

        {/* Reserve Recommendation */}
        {data.reserve_recommendation && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--gray-100)', borderRadius: '8px' }}>
            <h4 style={{ marginBottom: '0.75rem' }}>המלצת רזרבה</h4>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <span className="badge badge-gray">מינימום</span>
                <span style={{ marginRight: '0.5rem' }}>{data.reserve_recommendation.min_percent}%</span>
              </div>
              <div>
                <span className="badge badge-success">מומלץ</span>
                <span style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>{data.reserve_recommendation.recommended_percent}%</span>
              </div>
              <div>
                <span className="badge badge-warning">מקסימום</span>
                <span style={{ marginRight: '0.5rem' }}>{data.reserve_recommendation.max_percent}%</span>
              </div>
            </div>
            {data.reserve_recommendation.reasoning && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                {data.reserve_recommendation.reasoning}
              </p>
            )}
          </div>
        )}

        {/* Pricing Strategy */}
        {data.pricing_strategy && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', borderRight: '4px solid var(--success)' }}>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--success)' }}>אסטרטגיית תמחור</h4>
            <p style={{ marginBottom: '0.5rem' }}><strong>גישה:</strong> {data.pricing_strategy.approach}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>{data.pricing_strategy.reasoning}</p>
            {data.pricing_strategy.key_items_to_focus?.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>פריטים להתמקד בהם:</strong>
                <ul style={{ paddingRight: '1.25rem', marginTop: '0.25rem' }}>
                  {data.pricing_strategy.key_items_to_focus.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Risk Analysis Items */}
        {data.risk_analysis?.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.75rem' }}>ניתוח סיכונים לפי פריט ({data.risk_analysis.length})</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>פריט</th>
                  <th>תיאור</th>
                  <th>סוג סיכון</th>
                  <th>רמה</th>
                  <th>% מומלץ</th>
                </tr>
              </thead>
              <tbody>
                {data.risk_analysis.map((item: { item_number: string; description: string; risk_type: string; risk_level: string; suggested_markup_percent: number }, i: number) => (
                  <tr key={i}>
                    <td>{item.item_number}</td>
                    <td>{item.description?.substring(0, 40)}{item.description?.length > 40 ? '...' : ''}</td>
                    <td><span className="badge badge-gray">{item.risk_type}</span></td>
                    <td>
                      <span className={`badge ${item.risk_level === 'HIGH' ? 'badge-danger' : item.risk_level === 'MEDIUM' ? 'badge-warning' : 'badge-success'}`}>
                        {item.risk_level}
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{item.suggested_markup_percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Warnings */}
        {data.warnings?.length > 0 && (
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', borderRight: '4px solid var(--danger)' }}>
            <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>אזהרות</h4>
            <ul style={{ paddingRight: '1.25rem', margin: 0 }}>
              {data.warnings.map((warning: string, i: number) => (
                <li key={i} style={{ color: 'var(--danger)' }}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return <pre style={{ fontSize: '0.75rem', overflow: 'auto' }}>{JSON.stringify(data, null, 2)}</pre>;
}
