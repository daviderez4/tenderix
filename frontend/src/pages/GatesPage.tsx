import { useState, useEffect } from 'react';
import { CheckSquare, RefreshCw, FileQuestion, Lightbulb, FileCheck } from 'lucide-react';
import { api } from '../api/tenderix';
import type { GateCondition } from '../api/tenderix';
import { TEST_IDS } from '../api/config';
import { Loading } from '../components/Loading';
import { StatusBadge } from '../components/StatusBadge';

type TabType = 'conditions' | 'clarifications' | 'strategic' | 'documents';

export function GatesPage() {
  const [gates, setGates] = useState<GateCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('conditions');
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);
  const [workflowResults, setWorkflowResults] = useState<Record<string, unknown>>({});

  useEffect(() => {
    loadGates();
  }, []);

  async function loadGates() {
    setLoading(true);
    try {
      const data = await api.getGateConditions(TEST_IDS.TENDER_ID);
      setGates(data);
    } catch (error) {
      console.error('Error loading gates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function runWorkflow(type: 'match' | 'clarifications' | 'strategic' | 'documents') {
    setRunningWorkflow(type);
    try {
      let result;
      switch (type) {
        case 'match':
          result = await api.workflows.matchGates(TEST_IDS.TENDER_ID, TEST_IDS.ORG_ID);
          await loadGates();
          break;
        case 'clarifications':
          result = await api.workflows.getClarifications(TEST_IDS.TENDER_ID, TEST_IDS.ORG_ID);
          break;
        case 'strategic':
          result = await api.workflows.getStrategicQuestions(TEST_IDS.TENDER_ID, TEST_IDS.ORG_ID);
          break;
        case 'documents':
          result = await api.workflows.getRequiredDocs(TEST_IDS.TENDER_ID, TEST_IDS.ORG_ID);
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
        <p className="page-subtitle">ניהול וניתוח תנאי סף למכרז</p>
      </div>

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
          <button
            className="btn btn-primary"
            onClick={() => runWorkflow('match')}
            disabled={runningWorkflow !== null}
          >
            {runningWorkflow === 'match' ? <div className="spinner" /> : <RefreshCw size={18} />}
            התאמה לפרופיל
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('clarifications'); setActiveTab('clarifications'); }}
            disabled={runningWorkflow !== null}
          >
            {runningWorkflow === 'clarifications' ? <div className="spinner" /> : <FileQuestion size={18} />}
            שאלות הבהרה
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('strategic'); setActiveTab('strategic'); }}
            disabled={runningWorkflow !== null}
          >
            {runningWorkflow === 'strategic' ? <div className="spinner" /> : <Lightbulb size={18} />}
            שאלות אסטרטגיות
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => { runWorkflow('documents'); setActiveTab('documents'); }}
            disabled={runningWorkflow !== null}
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

  if (type === 'clarifications' && data.clarifications) {
    return (
      <div>
        <h4 style={{ marginBottom: '1rem' }}>שאלות הבהרה ({data.clarifications.length})</h4>
        {data.clarifications.map((q: { question: string; reason: string; expected_impact: string }, i: number) => (
          <div key={i} className="gate-item">
            <div className="gate-number">{i + 1}</div>
            <div className="gate-content">
              <div className="gate-text" style={{ fontWeight: 500 }}>{q.question}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                <strong>סיבה:</strong> {q.reason}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                <strong>השפעה צפויה:</strong> {q.expected_impact}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'strategic' && data.strategic_questions) {
    return (
      <div>
        <h4 style={{ marginBottom: '1rem' }}>שאלות אסטרטגיות ({data.strategic_questions.length})</h4>
        {data.strategic_questions.map((q: { question: string; category: string; strategic_goal: string }, i: number) => (
          <div key={i} className="gate-item">
            <div className="gate-number">{i + 1}</div>
            <div className="gate-content">
              <div className="gate-text" style={{ fontWeight: 500 }}>{q.question}</div>
              <div className="gate-meta">
                <span className="badge badge-gray">{q.category}</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>
                <strong>מטרה:</strong> {q.strategic_goal}
              </div>
            </div>
          </div>
        ))}
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
