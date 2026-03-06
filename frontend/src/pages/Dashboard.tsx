import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  Zap,
  Plus,
} from 'lucide-react';
import { supabase } from '../api/supabaseClient';
import { setCurrentTender } from '../api/config';

interface Tender {
  id: string;
  tender_name: string;
  tender_number: string;
  issuing_body: string;
  submission_deadline: string;
  estimated_value: number;
  status: string;
  go_nogo_decision: string;
  current_step: string;
  category: string;
  created_at: string;
}

interface GateSummary {
  tender_id: string;
  total_conditions: number;
  meets_count: number;
  partially_meets_count: number;
  does_not_meet_count: number;
  overall_eligibility: string;
  go_recommendation: string;
}

export function Dashboard() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [summaries, setSummaries] = useState<Record<string, GateSummary>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: tendersData } = await supabase
      .from('tenders')
      .select('*')
      .order('created_at', { ascending: false });

    if (tendersData) {
      setTenders(tendersData);

      const { data: summaryData } = await supabase
        .from('gate_conditions_summary')
        .select('*');

      if (summaryData) {
        const map: Record<string, GateSummary> = {};
        for (const s of summaryData) {
          map[s.tender_id] = s;
        }
        setSummaries(map);
      }
    }

    setLoading(false);
  }

  function openTender(tender: Tender) {
    setCurrentTender(tender.id, tender.tender_name);
    navigate('/gates');
  }

  const activeTenders = tenders.filter(t => t.status === 'ACTIVE');
  const analyzedCount = Object.keys(summaries).length;
  const goCount = Object.values(summaries).filter(s => s.go_recommendation === 'GO').length;

  function formatCurrency(val: number) {
    if (!val) return '-';
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('he-IL');
  }

  function getStatusBadge(summary: GateSummary | undefined) {
    if (!summary) return <span className="badge badge-gray">ממתין לניתוח</span>;
    if (summary.overall_eligibility === 'ELIGIBLE') return <span className="badge badge-success">עומד בתנאים</span>;
    if (summary.overall_eligibility === 'PARTIALLY_ELIGIBLE') return <span className="badge badge-warning">עומד חלקית</span>;
    return <span className="badge badge-danger">לא עומד</span>;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner spinner-lg" />
        <span>טוען נתונים...</span>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-right">
          <h1 className="page-title">
            <Zap size={24} style={{ color: 'var(--primary)' }} />
            Winning Decision Center
          </h1>
          <p className="page-subtitle">מרכז קבלת החלטות - סקירת מכרזים פעילים</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/tender/new')}>
            <Plus size={16} /> מכרז חדש
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-accent">
          <div className="stat-icon stat-icon-blue"><FileText size={20} /></div>
          <div className="stat-value">{tenders.length}</div>
          <div className="stat-label">מכרזים במערכת</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-yellow"><Clock size={20} /></div>
          <div className="stat-value">{activeTenders.length}</div>
          <div className="stat-label">מכרזים פעילים</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><Shield size={20} /></div>
          <div className="stat-value">{analyzedCount}</div>
          <div className="stat-label">נותחו תנאי סף</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><TrendingUp size={20} /></div>
          <div className="stat-value">{goCount}</div>
          <div className="stat-label">המלצת GO</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><FileText size={18} /> מכרזים</div>
        </div>

        {tenders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={28} /></div>
            <div className="empty-state-title">אין מכרזים עדיין</div>
            <div className="empty-state-text">הוסף מכרז חדש כדי להתחיל</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>שם המכרז</th>
                  <th>גורם מזמין</th>
                  <th>מועד הגשה</th>
                  <th>אומדן</th>
                  <th>תנאי סף</th>
                  <th>סטטוס</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tenders.map(tender => {
                  const summary = summaries[tender.id];
                  return (
                    <tr key={tender.id} onClick={() => openTender(tender)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--dark-800)' }}>{tender.tender_name}</div>
                        {tender.tender_number && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--dark-400)' }}>{tender.tender_number}</div>
                        )}
                      </td>
                      <td>{tender.issuing_body || '-'}</td>
                      <td>
                        {tender.submission_deadline ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={13} style={{ color: 'var(--dark-400)' }} />
                            {formatDate(tender.submission_deadline)}
                          </span>
                        ) : '-'}
                      </td>
                      <td>{formatCurrency(tender.estimated_value)}</td>
                      <td>
                        {summary ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {summary.meets_count > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: 'var(--success)' }}>
                                <CheckCircle size={13} /> {summary.meets_count}
                              </span>
                            )}
                            {summary.partially_meets_count > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: 'var(--warning)' }}>
                                <AlertTriangle size={13} /> {summary.partially_meets_count}
                              </span>
                            )}
                            {summary.does_not_meet_count > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', color: 'var(--danger)' }}>
                                <XCircle size={13} /> {summary.does_not_meet_count}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--dark-400)' }}>-</span>
                        )}
                      </td>
                      <td>{getStatusBadge(summary)}</td>
                      <td><ChevronLeft size={16} style={{ color: 'var(--dark-400)' }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
