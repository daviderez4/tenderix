import { useState, useEffect, useCallback } from 'react';
import { CheckSquare, RefreshCw, FileQuestion, Lightbulb, FileCheck, AlertCircle, FileText, Zap, RotateCcw, DollarSign, Sparkles, ChevronDown, ChevronUp, X, CheckCircle, AlertTriangle, Info, Upload, BarChart3, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/tenderix';
import type { GateCondition, Tender } from '../api/tenderix';
import { getCurrentTenderId, getCurrentOrgId, getTenderExtractedText } from '../api/config';
import { saveAnalysis } from '../api/analysisCache';
import type { GateConditionsData } from '../pdf/types';
import { Loading } from '../components/Loading';
import { StatusBadge } from '../components/StatusBadge';

type TabType = 'conditions' | 'summary' | 'clarifications' | 'strategic' | 'documents' | 'reanalysis' | 'pricing';

// Toast notification type
type ToastType = 'success' | 'error' | 'warning' | 'info';
interface Toast {
  id: string;
  type: ToastType;
  message: string;
  details?: string;
}

export function GatesPage() {
  const selectedOrgName = localStorage.getItem('tenderix_selected_org_name') || '';

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
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast management
  const addToast = useCallback((type: ToastType, message: string, details?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message, details }]);
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Cache gate conditions for PDF export whenever gates change
  const cacheGateConditions = useCallback((currentGates: GateCondition[]) => {
    const tenderId = getCurrentTenderId();
    if (!tenderId || currentGates.length === 0) return;

    const gateData: GateConditionsData = {
      conditions: currentGates.map(g => ({
        condition_number: g.condition_number,
        condition_text: g.condition_text,
        status: (g.status as 'MEETS' | 'PARTIALLY_MEETS' | 'DOES_NOT_MEET' | 'UNKNOWN') || 'UNKNOWN',
        is_mandatory: g.is_mandatory,
        requirement_type: g.requirement_type,
        evidence: g.evidence,
        gap_description: g.gap_description,
        ai_summary: g.ai_summary,
        ai_confidence: g.ai_confidence,
        legal_classification: g.legal_classification,
        legal_reasoning: g.legal_reasoning,
        technical_requirement: g.technical_requirement,
        equivalent_options: g.equivalent_options,
        closure_options: g.closure_options,
        source_section: g.source_section,
        source_page: g.source_page,
        required_years: g.required_years,
        required_amount: g.required_amount,
        required_count: g.required_count,
      })),
      summary: {
        total: currentGates.length,
        meets: currentGates.filter(g => g.status === 'MEETS').length,
        partial: currentGates.filter(g => g.status === 'PARTIALLY_MEETS').length,
        fails: currentGates.filter(g => g.status === 'DOES_NOT_MEET').length,
        unknown: currentGates.filter(g => !g.status || g.status === 'UNKNOWN').length,
        mandatory: currentGates.filter(g => g.is_mandatory).length,
      },
    };
    saveAnalysis(tenderId, 'gateConditions', gateData);
  }, []);

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

      // Cache for PDF export
      setGates(current => { cacheGateConditions(current); return current; });
    } catch (error) {
      console.error('Error analyzing gate:', error);
      addToast('error', `שגיאה בניתוח תנאי #${gate.condition_number}`, 'נסה שוב');
    } finally {
      setAnalyzingGateId(null);
    }
  }

  // Analyze all gates with AI in parallel batches
  async function analyzeAllGates() {
    const orgId = getCurrentOrgId();
    const unanalyzedGates = gates.filter(g => !g.status || g.status === 'UNKNOWN');

    if (unanalyzedGates.length === 0) {
      addToast('info', 'כל התנאים כבר נותחו', 'אין תנאים נוספים לניתוח');
      return;
    }

    addToast('info', `מתחיל ניתוח של ${unanalyzedGates.length} תנאי סף...`, 'הניתוח עשוי לקחת מספר שניות');
    setAnalyzingAllGates(true);
    setAnalysisProgress({ current: 0, total: unanalyzedGates.length });

    try {
      // Load company profile ONCE at the start
      console.log('Loading company profile once for all gates...');
      const [projects, financials, certifications] = await Promise.all([
        api.company.getProjects(orgId).catch(() => []),
        api.company.getFinancials(orgId).catch(() => []),
        api.company.getCertifications(orgId).catch(() => []),
      ]);
      const preloadedProfile = { projects, financials, certifications };
      console.log('Profile loaded, starting parallel analysis...');
      addToast('success', 'פרופיל חברה נטען בהצלחה', `${projects.length} פרויקטים, ${certifications.length} הסמכות`);

      // Process in batches of 3 for parallel execution
      const BATCH_SIZE = 3;
      let completed = 0;

      for (let i = 0; i < unanalyzedGates.length; i += BATCH_SIZE) {
        const batch = unanalyzedGates.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const batchPromises = batch.map(async (gate) => {
          try {
            const result = await api.workflows.analyzeGateWithAI(
              gate.tender_id,
              gate.id,
              gate.condition_text,
              orgId,
              preloadedProfile
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
            return result;
          } catch (error) {
            console.error(`Error analyzing gate ${gate.id}:`, error);
            return null;
          }
        });

        // Wait for batch to complete
        await Promise.all(batchPromises);
        completed += batch.length;
        setAnalysisProgress({ current: completed, total: unanalyzedGates.length });

        // Small delay between batches to avoid overwhelming the server
        if (i + BATCH_SIZE < unanalyzedGates.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Summary of analysis results
      const updatedGates = gates.filter(g => g.status && g.status !== 'UNKNOWN');
      const meetsCount = updatedGates.filter(g => g.status === 'MEETS').length;
      const partialCount = updatedGates.filter(g => g.status === 'PARTIALLY_MEETS').length;
      const failsCount = updatedGates.filter(g => g.status === 'DOES_NOT_MEET').length;

      addToast('success', `הניתוח הושלם! נותחו ${unanalyzedGates.length} תנאים`,
        `עומד: ${meetsCount} | חלקי: ${partialCount} | לא עומד: ${failsCount}`);

      // Cache for PDF export
      setGates(current => { cacheGateConditions(current); return current; });

      // Switch to summary tab to show combined results
      setActiveTab('summary');

    } catch (error) {
      console.error('Error in analyzeAllGates:', error);
      addToast('error', 'שגיאה בניתוח תנאי הסף', 'נסה שוב מאוחר יותר');
    } finally {
      setAnalyzingAllGates(false);
      setAnalysisProgress({ current: 0, total: 0 });
    }
  }

  async function runWorkflow(type: 'match' | 'semantic-match' | 'clarifications' | 'strategic' | 'documents' | 'reanalysis' | 'priorities' | 'pricing') {
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
        case 'semantic-match':
          addToast('info', 'מריץ התאמה סמנטית v4.0', 'חילוץ הגדרות + סיווג AI + הסברים מפורטים...');
          // Step 1: Extract definitions (if not already done)
          try {
            const tenderText = getTenderExtractedText(tenderId);
            if (tenderText && tenderText.length > 100) {
              await api.definitions.extract(tenderId, tenderText);
              addToast('success', 'הגדרות חולצו בהצלחה', '');
            }
          } catch (defError) {
            console.warn('Definition extraction failed:', defError);
            addToast('warning', 'חילוץ הגדרות נכשל', 'שגיאת רשת - ודא ש-n8n webhooks פעילים');
            break;
          }
          // Step 2: Run semantic matching
          try {
            result = await api.semanticMatching.run(tenderId, orgId);
            await loadData();
            addToast('success', 'התאמה סמנטית הושלמה', 'הגדרות המכרז שימשו לסיווג הפרויקטים');
          } catch (matchError) {
            console.warn('Semantic matching failed:', matchError);
            addToast('error', 'התאמה סמנטית נכשלה', 'שגיאת רשת - השתמש ב"התאמה מהירה" או "נתח עם AI" במקום');
          }
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

      // Cache results for PDF export
      if (result && tenderId) {
        if (type === 'clarifications') saveAnalysis(tenderId, 'clarifications', result);
        if (type === 'strategic') saveAnalysis(tenderId, 'strategic', result);
        if (type === 'documents') saveAnalysis(tenderId, 'requiredDocs', result);
        if (type === 'pricing') saveAnalysis(tenderId, 'pricingIntel', result);
      }
    } catch (error) {
      console.error('Workflow error:', error);
      const errMsg = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      if (errMsg.includes('Failed to fetch') || errMsg.includes('CORS') || errMsg.includes('NetworkError')) {
        addToast('error', 'שגיאת רשת', 'לא ניתן להתחבר לשרת AI. נסה "נתח את כל התנאים עם AI" במקום');
      } else {
        addToast('error', 'שגיאה בהרצת התהליך', errMsg.substring(0, 100));
      }
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
            {selectedOrgName
              ? `יש לטעון מכרז עבור ${selectedOrgName} כדי לחלץ תנאי סף`
              : 'יש לבחור חברה ולטעון מכרז כדי להתחיל'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            {selectedOrgName ? (
              <Link to="/simple" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={18} />
                טען מכרז
              </Link>
            ) : (
              <Link to="/" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={18} />
                בחר חברה
              </Link>
            )}
            <Link to="/" className="btn" style={{ background: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              חזור לבית
            </Link>
          </div>
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
      {/* Breadcrumb / Back navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        padding: '0.65rem 1rem',
        background: 'var(--surface)',
        borderRadius: '10px',
        border: '1px solid var(--gray-200)',
        boxShadow: 'var(--shadow-xs)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to="/"
            style={{
              color: 'var(--gray-500)',
              textDecoration: 'none',
              fontSize: '0.82rem',
            }}
          >
            {selectedOrgName || 'בית'}
          </Link>
          <span style={{ color: 'var(--gray-600)' }}>/</span>
          <Link
            to="/simple"
            style={{
              color: 'var(--gray-500)',
              textDecoration: 'none',
              fontSize: '0.82rem',
            }}
          >
            מכרז
          </Link>
          <span style={{ color: 'var(--gray-600)' }}>/</span>
          <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 500 }}>
            תנאי סף
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            to="/analysis"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--gray-500)',
              textDecoration: 'none',
              fontSize: '0.82rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <BarChart3 size={14} />
            P3: מפרט ו-BOQ
          </Link>
          <Link
            to="/decision"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--gray-500)',
              textDecoration: 'none',
              fontSize: '0.82rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <Target size={14} />
            החלטה
          </Link>
          <Link
            to={`/profile-test/${tender?.id || ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--gray-500)',
              textDecoration: 'none',
              fontSize: '0.82rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            <Sparkles size={14} />
            בדיקת פרופילים
          </Link>
        </div>
      </div>

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

      {/* What's next guidance */}
      {gates.length > 0 && gateStats.aiAnalyzed === 0 && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(99, 102, 241, 0.06))',
          borderRadius: '14px',
          border: '1px solid rgba(6, 182, 212, 0.15)',
          borderRight: '4px solid var(--accent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <Lightbulb size={24} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent-dark)' }}>מה עכשיו?</h4>
              <div style={{ color: 'var(--gray-600)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 0.5rem' }}>
                  <strong>{gates.length} תנאי סף</strong> חולצו מהמסמך. עכשיו אפשר:
                </p>
                <ul style={{ margin: '0', paddingRight: '1.25rem' }}>
                  <li>לחץ על <strong>"נתח את כל התנאים עם AI"</strong> לבדוק התאמה אוטומטית לפרופיל החברה</li>
                  <li>או לחץ על תנאי ספציפי לניתוח בודד</li>
                  <li>ניתוח יבדוק: האם עומדים? מה חסר? מה האפשרויות לסגירת פערים?</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Actions - Primary */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>ניתוח תנאי סף</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {/* Extract gates button - always show if text is available */}
          {hasExtractedText && gates.length === 0 && (
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
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates || gates.length === 0}
          >
            {runningWorkflow === 'match' ? <div className="spinner" /> : <RefreshCw size={18} />}
            התאמה מהירה לפרופיל
          </button>
        </div>

        {/* Secondary actions row */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1px solid var(--gray-200)' }}>
          <span style={{ color: 'var(--gray-500)', fontSize: '0.82rem', alignSelf: 'center', marginLeft: '0.5rem' }}>כלי עזר:</span>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('clarifications'); setActiveTab('clarifications'); }}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates || gates.length === 0}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
          >
            {runningWorkflow === 'clarifications' ? <div className="spinner" /> : <FileQuestion size={15} />}
            שאלות הבהרה
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('strategic'); setActiveTab('strategic'); }}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates || gates.length === 0}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
          >
            {runningWorkflow === 'strategic' ? <div className="spinner" /> : <Lightbulb size={15} />}
            שאלות אסטרטגיות
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('documents'); setActiveTab('documents'); }}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates || gates.length === 0}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
          >
            {runningWorkflow === 'documents' ? <div className="spinner" /> : <FileCheck size={15} />}
            מסמכים נדרשים
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setActiveTab('reanalysis')}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates || gates.length === 0}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
          >
            <RotateCcw size={15} />
            ניתוח מחדש
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('pricing'); setActiveTab('pricing'); }}
            disabled={runningWorkflow !== null || extractingGates || analyzingAllGates || gates.length === 0}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
          >
            {runningWorkflow === 'pricing' ? <div className="spinner" /> : <DollarSign size={15} />}
            סיכוני תמחור
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'conditions' ? 'active' : ''}`} onClick={() => setActiveTab('conditions')}>
          תנאי סף ({gates.length})
        </button>
        {gateStats.aiAnalyzed > 0 && (
          <button className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}
            style={activeTab === 'summary' ? {} : { background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            סיכום ניתוח
          </button>
        )}
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

            const statusBorderColor =
              gate.status === 'MEETS' ? '#10b981' :
              gate.status === 'DOES_NOT_MEET' ? '#ef4444' :
              gate.status === 'PARTIALLY_MEETS' ? '#f59e0b' :
              'transparent';

            const hasAnalysis = gate.status && gate.status !== 'UNKNOWN';
            const confidencePct = gate.ai_confidence != null ? Math.round(gate.ai_confidence * 100) : null;

            return (
              <div
                key={gate.id}
                className="card"
                style={{
                  marginBottom: '0.75rem',
                  padding: 0,
                  overflow: 'hidden',
                  borderRight: `4px solid ${statusBorderColor}`,
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Card header - always visible */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '1rem 1rem 0.75rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleGateExpanded(gate.id)}
                >
                  {/* Number badge */}
                  <div style={{
                    background: `linear-gradient(135deg, ${categoryColors[gate.requirement_type || 'OTHER'] || '#6b7280'}, ${categoryColors[gate.requirement_type || 'OTHER'] || '#6b7280'}dd)`,
                    color: 'white',
                    borderRadius: '10px',
                    padding: '0.4rem 0.65rem',
                    fontWeight: 'bold',
                    minWidth: '40px',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}>
                    #{gate.condition_number}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: '0.4rem', lineHeight: 1.5 }}>{gate.condition_text}</div>

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                      {gate.required_years != null && (
                        <span className="badge" style={{ background: 'var(--gray-700)', color: 'white' }}>
                          {gate.required_years} שנים
                        </span>
                      )}
                      {gate.required_amount != null && (
                        <span className="badge" style={{ background: 'var(--gray-700)', color: 'white' }}>
                          {(gate.required_amount / 1000000).toFixed(1)}M
                        </span>
                      )}
                      {gate.required_count != null && (
                        <span className="badge" style={{ background: 'var(--gray-700)', color: 'white' }}>
                          {gate.required_count} פרויקטים
                        </span>
                      )}
                      {gate.source_section && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          עמ' {gate.source_page || '?'} | {gate.source_section}
                        </span>
                      )}
                    </div>

                    {/* Collapsed preview: show mini-summary if analyzed but not expanded */}
                    {hasAnalysis && !isExpanded && gate.ai_summary && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.45rem 0.7rem',
                        background: gate.status === 'MEETS'
                          ? 'rgba(34, 197, 94, 0.06)'
                          : gate.status === 'DOES_NOT_MEET'
                            ? 'rgba(239, 68, 68, 0.06)'
                            : 'rgba(245, 158, 11, 0.06)',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        color: 'var(--gray-600)',
                        lineHeight: 1.45,
                      }}>
                        {gate.ai_summary.length > 120 ? gate.ai_summary.substring(0, 120) + '...' : gate.ai_summary}
                      </div>
                    )}
                  </div>

                  {/* Right column: confidence + actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {/* Confidence circle */}
                    {confidencePct !== null && (
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: `conic-gradient(${
                          confidencePct > 70 ? '#22c55e' : confidencePct > 40 ? '#f59e0b' : '#ef4444'
                        } ${confidencePct * 3.6}deg, var(--gray-200) 0deg)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: confidencePct > 70 ? '#16a34a' : confidencePct > 40 ? '#d97706' : '#dc2626',
                        }}>
                          {confidencePct}%
                        </div>
                      </div>
                    )}

                    <button
                      className="btn btn-secondary"
                      onClick={(e) => { e.stopPropagation(); analyzeGate(gate); }}
                      disabled={isAnalyzing || runningWorkflow !== null}
                      style={{
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.78rem',
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: 'white',
                        border: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isAnalyzing ? <div className="spinner" style={{ width: '12px', height: '12px' }} /> : <Sparkles size={12} />}
                      {isAnalyzing ? '...' : 'נתח'}
                    </button>
                    <div style={{ color: 'var(--gray-500)', fontSize: '0.7rem' }}>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{
                    padding: '0 1rem 1rem',
                    borderTop: '1px solid var(--gray-100)',
                  }}>
                    <div style={{
                      marginTop: '0.75rem',
                      display: 'grid',
                      gap: '0.65rem',
                    }}>
                      {/* AI Summary */}
                      {gate.ai_summary && (
                        <div style={{
                          padding: '0.75rem 1rem',
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(139, 92, 246, 0.03))',
                          borderRadius: '10px',
                          borderRight: '3px solid var(--primary)',
                        }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.3rem' }}>
                            סיכום ניתוח AI
                          </div>
                          <div style={{ color: 'var(--gray-700)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                            {gate.ai_summary}
                          </div>
                        </div>
                      )}

                      {/* Evidence - what matches */}
                      {gate.evidence && (
                        <div style={{
                          padding: '0.75rem 1rem',
                          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.06), rgba(22, 163, 74, 0.03))',
                          borderRadius: '10px',
                          borderRight: '3px solid var(--success)',
                        }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--success-dark)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CheckCircle size={14} /> ראיות להתאמה
                          </div>
                          <div style={{ color: 'var(--gray-700)', lineHeight: 1.6, fontSize: '0.88rem' }}>
                            {gate.evidence}
                          </div>
                        </div>
                      )}

                      {/* Gap - what's missing */}
                      {gate.gap_description && (
                        <div style={{
                          padding: '0.75rem 1rem',
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(220, 38, 38, 0.03))',
                          borderRadius: '10px',
                          borderRight: '3px solid var(--danger)',
                        }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--danger-dark)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <AlertTriangle size={14} /> פערים שזוהו
                          </div>
                          <div style={{ color: 'var(--gray-700)', lineHeight: 1.6, fontSize: '0.88rem' }}>
                            {gate.gap_description}
                          </div>
                        </div>
                      )}

                      {/* Recommendations for closing gaps */}
                      {(gate.status === 'DOES_NOT_MEET' || gate.status === 'PARTIALLY_MEETS') && (
                        <div style={{
                          padding: '0.75rem 1rem',
                          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.06), rgba(99, 102, 241, 0.03))',
                          borderRadius: '10px',
                          borderRight: '3px solid var(--accent)',
                        }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-dark)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Lightbulb size={14} /> המלצות לסגירת הפער
                          </div>
                          <div style={{ color: 'var(--gray-700)', fontSize: '0.88rem', lineHeight: 1.7 }}>
                            {gate.equivalent_options && gate.equivalent_options.length > 0 ? (
                              <ul style={{ margin: 0, paddingRight: '1.25rem' }}>
                                {gate.equivalent_options.map((opt, i) => (
                                  <li key={i} style={{ marginBottom: '0.3rem' }}>{opt}</li>
                                ))}
                              </ul>
                            ) : gate.closure_options && gate.closure_options.length > 0 ? (
                              <ul style={{ margin: 0, paddingRight: '1.25rem' }}>
                                {gate.closure_options.map((opt, i) => (
                                  <li key={i} style={{ marginBottom: '0.3rem' }}>{opt}</li>
                                ))}
                              </ul>
                            ) : (
                              <ul style={{ margin: 0, paddingRight: '1.25rem' }}>
                                {gate.legal_classification === 'open' && (
                                  <li style={{ marginBottom: '0.3rem' }}>התנאי פתוח לפרשנות - ניתן לנסות להוכיח עמידה חלקית</li>
                                )}
                                {gate.bearer_entity === 'subcontractor_allowed' && (
                                  <li style={{ marginBottom: '0.3rem' }}>ניתן לצרף קבלן משנה שעומד בדרישה</li>
                                )}
                                {gate.bearer_entity === 'consortium_member' && (
                                  <li style={{ marginBottom: '0.3rem' }}>ניתן לצרף שותף למיזם משותף</li>
                                )}
                                {gate.subcontractor_allowed && (
                                  <li style={{ marginBottom: '0.3rem' }}>מותר שימוש בקבלן משנה{gate.subcontractor_limit ? ` (עד ${gate.subcontractor_limit}%)` : ''}</li>
                                )}
                                {gate.group_companies_allowed && (
                                  <li style={{ marginBottom: '0.3rem' }}>ניתן להשתמש בניסיון של חברות קבוצה</li>
                                )}
                                <li>לחץ "נתח" לקבלת המלצות מפורטות</li>
                              </ul>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Legal & Technical details - side by side if both exist */}
                      {(gate.legal_classification || gate.technical_requirement) && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: gate.legal_classification && gate.technical_requirement ? '1fr 1fr' : '1fr',
                          gap: '0.65rem',
                        }}>
                          {gate.legal_classification && (
                            <div style={{
                              padding: '0.65rem 0.85rem',
                              background: 'rgba(99, 102, 241, 0.05)',
                              borderRadius: '10px',
                              border: '1px solid rgba(99, 102, 241, 0.1)',
                            }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.3rem' }}>
                                סיווג משפטי
                              </div>
                              <span className="badge" style={{
                                background: gate.legal_classification === 'strict' ? 'var(--danger)' :
                                  gate.legal_classification === 'open' ? 'var(--success)' : 'var(--warning)',
                                color: 'white',
                                fontSize: '0.73rem',
                              }}>
                                {gate.legal_classification === 'strict' ? 'קשיח - פסילה' :
                                 gate.legal_classification === 'open' ? 'פתוח לפרשנות' : 'תלוי הוכחות'}
                              </span>
                              {gate.legal_reasoning && (
                                <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--gray-500)', lineHeight: 1.5 }}>
                                  {gate.legal_reasoning}
                                </div>
                              )}
                            </div>
                          )}
                          {gate.technical_requirement && (
                            <div style={{
                              padding: '0.65rem 0.85rem',
                              background: 'rgba(6, 182, 212, 0.05)',
                              borderRadius: '10px',
                              border: '1px solid rgba(6, 182, 212, 0.1)',
                            }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-dark)', marginBottom: '0.3rem' }}>
                                דרישה טכנית
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>
                                {gate.technical_requirement}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {gate.bearer_entity && (
                        <div style={{
                          padding: '0.45rem 0.85rem',
                          background: 'var(--gray-50)',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          color: 'var(--gray-600)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}>
                          <strong>נושא הדרישה:</strong>
                          <span className="badge" style={{ fontSize: '0.73rem' }}>
                            {gate.bearer_entity === 'bidder_only' ? 'המציע בלבד' :
                             gate.bearer_entity === 'consortium_member' ? 'שותף במיזם' : 'קבלן משנה מותר'}
                          </span>
                        </div>
                      )}

                      {/* Confidence bar - prominent at bottom */}
                      {confidencePct !== null && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.6rem 0',
                          borderTop: '1px solid var(--gray-100)',
                          fontSize: '0.8rem',
                          color: 'var(--gray-500)',
                        }}>
                          <span>רמת ביטחון:</span>
                          <div style={{
                            flex: 1,
                            height: '8px',
                            background: 'var(--gray-200)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${confidencePct}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, ${
                                confidencePct > 70 ? '#22c55e, #4ade80' :
                                confidencePct > 40 ? '#f59e0b, #fbbf24' :
                                '#ef4444, #f87171'
                              })`,
                              borderRadius: '4px',
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                          <span style={{
                            fontWeight: 800,
                            color: confidencePct > 70 ? '#16a34a' : confidencePct > 40 ? '#d97706' : '#dc2626',
                          }}>
                            {confidencePct}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Tab - Overall analysis view */}
      {activeTab === 'summary' && gateStats.aiAnalyzed > 0 && (
        <div>
          {/* Overall eligibility assessment */}
          {(() => {
            const mandatoryFails = gates.filter(g => g.is_mandatory && g.status === 'DOES_NOT_MEET');
            const isEligible = mandatoryFails.length === 0 && gateStats.meets > 0;
            const isConditional = mandatoryFails.length === 0 && gateStats.partial > 0;
            return (
              <div className="card" style={{
                marginBottom: '1rem',
                padding: '1.25rem',
                background: isEligible
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(22, 163, 74, 0.04))'
                  : mandatoryFails.length > 0
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(220, 38, 38, 0.04))'
                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(217, 119, 6, 0.04))',
                borderRight: `4px solid ${isEligible ? '#22c55e' : mandatoryFails.length > 0 ? '#ef4444' : '#f59e0b'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  {isEligible ? <CheckCircle size={28} style={{ color: '#22c55e' }} /> :
                   mandatoryFails.length > 0 ? <AlertTriangle size={28} style={{ color: '#ef4444' }} /> :
                   <Info size={28} style={{ color: '#f59e0b' }} />}
                  <div>
                    <h3 style={{ margin: 0, color: isEligible ? '#16a34a' : mandatoryFails.length > 0 ? '#dc2626' : '#d97706' }}>
                      {isEligible ? 'עומדים בתנאי הסף' :
                       mandatoryFails.length > 0 ? `לא עומדים - ${mandatoryFails.length} תנאי חובה נכשלים` :
                       isConditional ? 'עמידה חלקית - נדרשת השלמה' : 'נדרש בירור נוסף'}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                      נותחו {gateStats.aiAnalyzed} מתוך {gateStats.total} תנאים
                    </p>
                  </div>
                </div>

                {/* Stats bar */}
                <div style={{ display: 'flex', gap: '0.25rem', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  {gateStats.meets > 0 && (
                    <div style={{ flex: gateStats.meets, background: '#22c55e', borderRadius: gateStats.partial === 0 && gateStats.fails === 0 ? '6px' : '6px 0 0 6px' }} />
                  )}
                  {gateStats.partial > 0 && (
                    <div style={{ flex: gateStats.partial, background: '#f59e0b' }} />
                  )}
                  {gateStats.fails > 0 && (
                    <div style={{ flex: gateStats.fails, background: '#ef4444', borderRadius: gateStats.meets === 0 && gateStats.partial === 0 ? '6px' : '0 6px 6px 0' }} />
                  )}
                  {(gateStats.total - gateStats.aiAnalyzed) > 0 && (
                    <div style={{ flex: gateStats.total - gateStats.aiAnalyzed, background: 'var(--gray-300)' }} />
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: '#22c55e' }}>{gateStats.meets} עומדים</span>
                  <span style={{ color: '#f59e0b' }}>{gateStats.partial} חלקי</span>
                  <span style={{ color: '#ef4444' }}>{gateStats.fails} לא עומדים</span>
                  {(gateStats.total - gateStats.aiAnalyzed) > 0 && (
                    <span style={{ color: 'var(--gray-500)' }}>{gateStats.total - gateStats.aiAnalyzed} לא נותחו</span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Failing mandatory conditions - most critical */}
          {gates.filter(g => g.is_mandatory && g.status === 'DOES_NOT_MEET').length > 0 && (
            <div className="card" style={{ marginBottom: '1rem', borderRight: '4px solid #ef4444' }}>
              <h4 style={{ color: '#ef4444', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} />
                תנאי חובה שלא עומדים ({gates.filter(g => g.is_mandatory && g.status === 'DOES_NOT_MEET').length})
              </h4>
              {gates.filter(g => g.is_mandatory && g.status === 'DOES_NOT_MEET').map(gate => (
                <div key={gate.id} style={{
                  padding: '0.65rem 0.85rem',
                  marginBottom: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.04)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.1)',
                }}>
                  <div style={{ fontWeight: 500, marginBottom: '0.3rem' }}>
                    #{gate.condition_number}: {gate.condition_text}
                  </div>
                  {gate.gap_description && (
                    <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>
                      {gate.gap_description}
                    </div>
                  )}
                  {gate.ai_summary && (
                    <div style={{ color: 'var(--gray-600)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                      {gate.ai_summary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Partial conditions - need attention */}
          {gates.filter(g => g.status === 'PARTIALLY_MEETS').length > 0 && (
            <div className="card" style={{ marginBottom: '1rem', borderRight: '4px solid #f59e0b' }}>
              <h4 style={{ color: '#d97706', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={18} />
                עמידה חלקית - ניתן לסגור פערים ({gates.filter(g => g.status === 'PARTIALLY_MEETS').length})
              </h4>
              {gates.filter(g => g.status === 'PARTIALLY_MEETS').map(gate => (
                <div key={gate.id} style={{
                  padding: '0.65rem 0.85rem',
                  marginBottom: '0.5rem',
                  background: 'rgba(245, 158, 11, 0.04)',
                  borderRadius: '8px',
                  border: '1px solid rgba(245, 158, 11, 0.1)',
                }}>
                  <div style={{ fontWeight: 500, marginBottom: '0.3rem' }}>
                    #{gate.condition_number}: {gate.condition_text}
                  </div>
                  {gate.evidence && <div style={{ color: '#16a34a', fontSize: '0.85rem' }}>{gate.evidence}</div>}
                  {gate.gap_description && <div style={{ color: '#d97706', fontSize: '0.85rem' }}>{gate.gap_description}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Meeting conditions - good news */}
          {gates.filter(g => g.status === 'MEETS').length > 0 && (
            <div className="card" style={{ marginBottom: '1rem', borderRight: '4px solid #22c55e' }}>
              <h4 style={{ color: '#16a34a', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} />
                עומדים ({gates.filter(g => g.status === 'MEETS').length})
              </h4>
              {gates.filter(g => g.status === 'MEETS').map(gate => (
                <div key={gate.id} style={{
                  padding: '0.5rem 0.85rem',
                  marginBottom: '0.35rem',
                  background: 'rgba(34, 197, 94, 0.04)',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                }}>
                  <span style={{ fontWeight: 500 }}>#{gate.condition_number}</span>: {gate.condition_text}
                  {gate.evidence && (
                    <span style={{ color: '#16a34a', fontSize: '0.82rem', marginRight: '0.5rem' }}> - {gate.evidence}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Unknown/unanalyzed */}
          {gates.filter(g => !g.status || g.status === 'UNKNOWN').length > 0 && (
            <div className="card" style={{ borderRight: '4px solid var(--gray-400)' }}>
              <h4 style={{ color: 'var(--gray-500)', margin: '0 0 0.5rem' }}>
                טרם נותחו ({gates.filter(g => !g.status || g.status === 'UNKNOWN').length})
              </h4>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                {gates.filter(g => !g.status || g.status === 'UNKNOWN').map(g => `#${g.condition_number}`).join(', ')}
              </div>
            </div>
          )}
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

      {/* Toast Notifications */}
      <div style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '400px'
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
              animation: 'slideIn 0.3s ease-out',
              backdropFilter: 'blur(20px)',
              background: toast.type === 'success' ? 'linear-gradient(135deg, #22c55e, #16a34a)' :
                          toast.type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                          toast.type === 'warning' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                          'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              color: 'white'
            }}
          >
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
              {toast.type === 'success' && <CheckCircle size={20} />}
              {toast.type === 'error' && <AlertCircle size={20} />}
              {toast.type === 'warning' && <AlertTriangle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: toast.details ? '0.25rem' : 0 }}>
                {toast.message}
              </div>
              {toast.details && (
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  {toast.details}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.25rem',
                opacity: 0.7,
                transition: 'opacity 0.2s'
              }}
              onMouseOver={e => (e.currentTarget.style.opacity = '1')}
              onMouseOut={e => (e.currentTarget.style.opacity = '0.7')}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
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
