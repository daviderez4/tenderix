import { useState, useEffect } from 'react';
import { BarChart3, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { API_CONFIG, getCurrentTenderId } from '../api/config';
import { api } from '../api/tenderix';
import type { Tender } from '../api/tenderix';
import { Loading } from '../components/Loading';

export function AnalysisPage() {
  const [tender, setTender] = useState<Tender | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'boq' | 'sow'>('boq');
  const [boqText, setBoqText] = useState('');
  const [sowText, setSowText] = useState('');
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [boqResult, setBoqResult] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sowResult, setSowResult] = useState<any>(null);

  useEffect(() => {
    loadTender();

    // Listen for tender changes
    const handleStorage = () => loadTender();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  async function loadTender() {
    setInitialLoading(true);
    try {
      const tenderId = getCurrentTenderId();
      const tenderData = await api.tenders.get(tenderId);
      setTender(tenderData);
    } catch (error) {
      console.error('Error loading tender:', error);
    } finally {
      setInitialLoading(false);
    }
  }

  async function analyzeBOQ() {
    if (!boqText.trim() || !tender) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_CONFIG.WEBHOOK_BASE}/tdx-boq-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tender_id: tender.id, boq_text: boqText }),
      });
      const result = await res.json();
      setBoqResult(result);
    } catch (error) {
      console.error('Error analyzing BOQ:', error);
    } finally {
      setLoading(false);
    }
  }

  async function analyzeSOW() {
    if (!sowText.trim() || !tender) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_CONFIG.WEBHOOK_BASE}/tdx-sow-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tender_id: tender.id, sow_text: sowText }),
      });
      const result = await res.json();
      setSowResult(result);
    } catch (error) {
      console.error('Error analyzing SOW:', error);
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) return <Loading />;

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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <BarChart3 size={28} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
          ניתוח מפרט וכמויות
        </h1>
        <p className="page-subtitle">
          {tender.tender_name}
          {tender.tender_number && ` | מכרז ${tender.tender_number}`}
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'boq' ? 'active' : ''}`} onClick={() => setActiveTab('boq')}>
          כתב כמויות (BOQ)
        </button>
        <button className={`tab ${activeTab === 'sow' ? 'active' : ''}`} onClick={() => setActiveTab('sow')}>
          היקף עבודה (SOW)
        </button>
      </div>

      {/* BOQ Tab */}
      {activeTab === 'boq' && (
        <div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              <FileText size={20} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
              הזן כתב כמויות
            </h3>
            <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
              העתק והדבק את כתב הכמויות מהמכרז לניתוח פריטים וסיכונים
            </p>
            <textarea
              value={boqText}
              onChange={(e) => setBoqText(e.target.value)}
              placeholder={`הדבק כאן את כתב הכמויות, לדוגמה:

כתב כמויות - מכרז מצלמות
1.1 מצלמות IP 4MP קבועות - 150 יח'
1.2 מצלמות PTZ 2MP ממונעות - 20 יח'
1.3 שרתי הקלטה NVR 32 ערוצים - 5 יח'
2.1 כבילה CAT6 - 5,000 מ'
2.2 ארונות תקשורת חיצוניים - 10 יח'
3.1 עבודות התקנה - סכום כולל
3.2 הדרכה - 40 שעות`}
              style={{
                width: '100%',
                minHeight: '250px',
                padding: '1rem',
                border: '1px solid var(--gray-300)',
                borderRadius: '8px',
                fontSize: '1rem',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
            <div style={{ marginTop: '1rem', textAlign: 'left' }}>
              <button
                className="btn btn-primary"
                onClick={analyzeBOQ}
                disabled={!boqText.trim() || loading}
              >
                {loading ? <Loader2 className="spinner" size={18} /> : <BarChart3 size={18} />}
                נתח כמויות
              </button>
            </div>
          </div>

          {boqResult && boqResult.success && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>
                <CheckCircle size={20} style={{ marginLeft: '0.5rem', verticalAlign: 'middle', color: 'var(--success)' }} />
                תוצאות ניתוח BOQ
              </h3>

              {boqResult.items && boqResult.items.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>פריטים ({boqResult.items.length})</h4>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>פריט</th>
                        <th>כמות</th>
                        <th>יחידה</th>
                        <th>קטגוריה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boqResult.items.slice(0, 15).map((item: { description: string; quantity: number; unit: string; category: string }, i: number) => (
                        <tr key={i}>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td><span className="badge badge-gray">{item.category}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {boqResult.risks && boqResult.risks.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '0.75rem', color: 'var(--warning)' }}>סיכוני תמחור</h4>
                  {boqResult.risks.map((risk: { item: string; risk: string; recommendation: string }, i: number) => (
                    <div key={i} className="gate-item" style={{ background: '#fef3c7' }}>
                      <div className="gate-content">
                        <div style={{ fontWeight: 500 }}>{risk.item}</div>
                        <div style={{ fontSize: '0.875rem' }}>{risk.risk}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>
                          <strong>המלצה:</strong> {risk.recommendation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SOW Tab */}
      {activeTab === 'sow' && (
        <div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              <FileText size={20} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
              הזן היקף עבודה
            </h3>
            <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
              העתק והדבק את היקף העבודה / מפרט טכני לניתוח דרישות וסיכונים
            </p>
            <textarea
              value={sowText}
              onChange={(e) => setSowText(e.target.value)}
              placeholder={`הדבק כאן את היקף העבודה, לדוגמה:

היקף העבודה - מערכת מצלמות עירונית

1. כללי
הקבלן יספק, יתקין ויפעיל מערכת מצלמות אבטחה עירונית הכוללת 150 מצלמות קבועות ו-20 מצלמות ממונעות.

2. לוח זמנים
- אספקת ציוד: 60 יום מחתימת חוזה
- התקנה: 120 יום
- הרצה ובדיקות: 30 יום

3. תחומי אחריות
- תכנון מפורט של המערכת
- אספקת כל הציוד
- עבודות חפירה ותשתית
- התקנת עמודים וציוד`}
              style={{
                width: '100%',
                minHeight: '250px',
                padding: '1rem',
                border: '1px solid var(--gray-300)',
                borderRadius: '8px',
                fontSize: '1rem',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
            <div style={{ marginTop: '1rem', textAlign: 'left' }}>
              <button
                className="btn btn-primary"
                onClick={analyzeSOW}
                disabled={!sowText.trim() || loading}
              >
                {loading ? <Loader2 className="spinner" size={18} /> : <BarChart3 size={18} />}
                נתח היקף עבודה
              </button>
            </div>
          </div>

          {sowResult && sowResult.success && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '1rem' }}>
                <CheckCircle size={20} style={{ marginLeft: '0.5rem', verticalAlign: 'middle', color: 'var(--success)' }} />
                תוצאות ניתוח SOW
              </h3>

              {sowResult.scope_summary && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>סיכום היקף</h4>
                  <p>{sowResult.scope_summary}</p>
                </div>
              )}

              {sowResult.deliverables && sowResult.deliverables.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>תוצרים נדרשים</h4>
                  <ul style={{ margin: 0, paddingRight: '1.25rem' }}>
                    {sowResult.deliverables.map((d: string, i: number) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {sowResult.timeline && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem' }}>לוח זמנים</h4>
                  <div className="grid grid-3">
                    {sowResult.timeline.phases?.map((phase: { name: string; duration: string }, i: number) => (
                      <div key={i} className="stat-card">
                        <div style={{ fontWeight: 500 }}>{phase.name}</div>
                        <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>{phase.duration}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sowResult.risks && sowResult.risks.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '0.75rem', color: 'var(--danger)' }}>סיכונים מזוהים</h4>
                  {sowResult.risks.map((risk: { risk: string; severity: string; mitigation: string }, i: number) => (
                    <div key={i} className="gate-item" style={{ background: '#fee2e2' }}>
                      <div className="gate-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{risk.risk}</strong>
                          <span className={`badge ${risk.severity === 'HIGH' ? 'badge-danger' : 'badge-warning'}`}>
                            {risk.severity}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                          <strong>מענה:</strong> {risk.mitigation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
