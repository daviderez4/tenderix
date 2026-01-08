import { useState } from 'react';
import { Target, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '../api/tenderix';
import { TEST_IDS } from '../api/config';
import { StatusBadge } from '../components/StatusBadge';

export function DecisionPage() {
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [decision, setDecision] = useState<any>(null);

  async function generateDecision() {
    setLoading(true);
    try {
      const result = await api.workflows.getFinalDecision(TEST_IDS.TENDER_ID, TEST_IDS.ORG_ID);
      setDecision(result);
    } catch (error) {
      console.error('Error generating decision:', error);
    } finally {
      setLoading(false);
    }
  }

  const getDecisionClass = (d: string) => {
    switch (d) {
      case 'GO': return 'decision-go';
      case 'NO-GO': return 'decision-nogo';
      default: return 'decision-conditional';
    }
  };

  const getDecisionIcon = (d: string) => {
    switch (d) {
      case 'GO': return <CheckCircle size={48} />;
      case 'NO-GO': return <XCircle size={48} />;
      default: return <AlertTriangle size={48} />;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Target size={28} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
          דוח החלטה GO/NO-GO
        </h1>
        <p className="page-subtitle">דוח מסכם להחלטה על השתתפות במכרז</p>
      </div>

      {!decision && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Target size={64} style={{ color: 'var(--gray-300)', marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>הפק דוח החלטה</h3>
          <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
            המערכת תנתח את כל הנתונים ותייצר דוח GO/NO-GO מקיף
          </p>
          <button
            className="btn btn-primary"
            onClick={generateDecision}
            disabled={loading}
            style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
          >
            {loading ? (
              <>
                <div className="spinner" />
                מייצר דוח...
              </>
            ) : (
              <>
                <RefreshCw size={20} />
                הפק דוח החלטה
              </>
            )}
          </button>
        </div>
      )}

      {decision && decision.success && (
        <div>
          {/* Decision Header */}
          <div className={`decision-header ${getDecisionClass(decision.decision)}`}>
            {getDecisionIcon(decision.decision)}
            <div className="decision-title">{decision.decision}</div>
            <div className="decision-confidence">רמת ביטחון: {decision.confidence}%</div>
          </div>

          {/* Executive Summary */}
          <div className="card">
            <h3 className="card-title">סיכום מנהלים</h3>
            <p style={{ fontSize: '1.125rem', lineHeight: 1.8 }}>{decision.executive_summary}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <StatusBadge status={decision.eligibility_status || 'UNKNOWN'} />
              <div className="stat-label" style={{ marginTop: '0.5rem' }}>כשירות</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{decision.gate_analysis?.total || 0}</div>
              <div className="stat-label">תנאי סף</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--success)' }}>{decision.gate_analysis?.meets || 0}</div>
              <div className="stat-label">עומדים</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{decision.gate_analysis?.fails || 0}</div>
              <div className="stat-label">לא עומדים</div>
            </div>
          </div>

          {/* Blocking Issues */}
          {decision.blocking_issues?.length > 0 && (
            <div className="card" style={{ borderRight: '4px solid var(--danger)' }}>
              <h3 className="card-title" style={{ color: 'var(--danger)' }}>
                <AlertTriangle size={20} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
                בעיות חוסמות ({decision.blocking_issues.length})
              </h3>
              {decision.blocking_issues.map((issue: { issue: string; severity: string; resolution: string }, i: number) => (
                <div key={i} className="gate-item" style={{ background: '#fee2e2' }}>
                  <div className="gate-content">
                    <div style={{ fontWeight: 500 }}>{issue.issue}</div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                      <StatusBadge status={issue.severity} />
                      <span><strong>פתרון:</strong> {issue.resolution}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-2">
            <div className="card" style={{ background: '#dcfce7' }}>
              <h4 style={{ color: '#166534', marginBottom: '0.75rem' }}>
                <CheckCircle size={18} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
                חוזקות
              </h4>
              <ul style={{ margin: 0, paddingRight: '1.25rem' }}>
                {decision.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="card" style={{ background: '#fef3c7' }}>
              <h4 style={{ color: '#92400e', marginBottom: '0.75rem' }}>
                <AlertTriangle size={18} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
                חולשות
              </h4>
              <ul style={{ margin: 0, paddingRight: '1.25rem' }}>
                {decision.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>

          {/* Risks */}
          {decision.risks?.length > 0 && (
            <div className="card">
              <h3 className="card-title">סיכונים</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>סיכון</th>
                    <th>הסתברות</th>
                    <th>השפעה</th>
                    <th>מענה</th>
                  </tr>
                </thead>
                <tbody>
                  {decision.risks.map((r: { risk: string; probability: string; impact: string; mitigation: string }, i: number) => (
                    <tr key={i}>
                      <td>{r.risk}</td>
                      <td><StatusBadge status={r.probability} /></td>
                      <td><StatusBadge status={r.impact} /></td>
                      <td>{r.mitigation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recommended Actions */}
          {decision.recommended_actions?.length > 0 && (
            <div className="card">
              <h3 className="card-title">
                <Clock size={20} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
                פעולות נדרשות
              </h3>
              {decision.recommended_actions.map((a: { action: string; priority: string; deadline: string }, i: number) => (
                <div key={i} className="gate-item">
                  <div className="gate-number">{i + 1}</div>
                  <div className="gate-content">
                    <div style={{ fontWeight: 500 }}>{a.action}</div>
                    <div className="gate-meta">
                      <span className="badge badge-warning">{a.priority}</span>
                      {a.deadline && <span>עד: {a.deadline}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resource Estimate */}
          {decision.resource_estimate && (
            <div className="card">
              <h3 className="card-title">הערכת משאבים</h3>
              <div className="grid grid-3">
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>שעות BD</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{decision.resource_estimate.bd_hours || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>שעות טכניות</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{decision.resource_estimate.tech_hours || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>עלות משוערת</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                    {decision.resource_estimate.estimated_cost?.toLocaleString() || 0} ש"ח
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Regenerate Button */}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
              className="btn btn-secondary"
              onClick={generateDecision}
              disabled={loading}
            >
              {loading ? <div className="spinner" /> : <RefreshCw size={18} />}
              הפק דוח מחדש
            </button>
          </div>
        </div>
      )}

      {decision && !decision.success && (
        <div className="card" style={{ background: '#fee2e2', textAlign: 'center' }}>
          <XCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h3>שגיאה בהפקת הדוח</h3>
          <p>{decision.error || 'אירעה שגיאה לא צפויה'}</p>
          <button className="btn btn-primary" onClick={generateDecision} style={{ marginTop: '1rem' }}>
            נסה שוב
          </button>
        </div>
      )}
    </div>
  );
}
