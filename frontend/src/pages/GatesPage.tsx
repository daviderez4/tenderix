import { useState, useEffect } from 'react';
import { CheckSquare, RefreshCw, FileQuestion, Lightbulb, FileCheck, AlertCircle, FileText, Zap } from 'lucide-react';
import { api } from '../api/tenderix';
import type { GateCondition, Tender } from '../api/tenderix';
import { getCurrentTenderId, getCurrentOrgId, getTenderExtractedText } from '../api/config';
import { Loading } from '../components/Loading';
import { StatusBadge } from '../components/StatusBadge';

type TabType = 'conditions' | 'clarifications' | 'strategic' | 'documents';

export function GatesPage() {
  const [tender, setTender] = useState<Tender | null>(null);
  const [gates, setGates] = useState<GateCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('conditions');
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);
  const [workflowResults, setWorkflowResults] = useState<Record<string, unknown>>({});
  const [hasExtractedText, setHasExtractedText] = useState(false);
  const [extractingGates, setExtractingGates] = useState(false);

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

  async function runWorkflow(type: 'match' | 'clarifications' | 'strategic' | 'documents') {
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
          <div className="stat-value">{gateStats.total}</div>
          <div className="stat-label">סה"כ תנאים</div>
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
          <div className="stat-label">חובה</div>
        </div>
      </div>

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
            onClick={() => runWorkflow('match')}
            disabled={runningWorkflow !== null || extractingGates}
          >
            {runningWorkflow === 'match' ? <div className="spinner" /> : <RefreshCw size={18} />}
            התאמה לפרופיל
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('clarifications'); setActiveTab('clarifications'); }}
            disabled={runningWorkflow !== null || extractingGates}
          >
            {runningWorkflow === 'clarifications' ? <div className="spinner" /> : <FileQuestion size={18} />}
            שאלות הבהרה
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('strategic'); setActiveTab('strategic'); }}
            disabled={runningWorkflow !== null || extractingGates}
          >
            {runningWorkflow === 'strategic' ? <div className="spinner" /> : <Lightbulb size={18} />}
            שאלות אסטרטגיות
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('documents'); setActiveTab('documents'); }}
            disabled={runningWorkflow !== null || extractingGates}
          >
            {runningWorkflow === 'documents' ? <div className="spinner" /> : <FileCheck size={18} />}
            מסמכים נדרשים
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
      </div>

      {/* Tab Content */}
      {activeTab === 'conditions' && (
        <div>
          {gates.map((gate) => (
            <div key={gate.id} className="gate-item">
              <div className="gate-number">{gate.condition_number}</div>
              <div className="gate-content">
                <div className="gate-text">{gate.condition_text}</div>
                <div className="gate-meta">
                  <StatusBadge status={gate.status || 'UNKNOWN'} />
                  {gate.is_mandatory && <span className="badge badge-danger">חובה</span>}
                  {gate.evidence && <span style={{ color: 'var(--success)' }}>ראיה: {gate.evidence.substring(0, 50)}...</span>}
                  {gate.gap_description && <span style={{ color: 'var(--danger)' }}>פער: {gate.gap_description.substring(0, 50)}...</span>}
                </div>
              </div>
            </div>
          ))}
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

  return <pre style={{ fontSize: '0.75rem', overflow: 'auto' }}>{JSON.stringify(data, null, 2)}</pre>;
}
