import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckSquare, Users, Target, ArrowLeft, Calendar, Building } from 'lucide-react';
import { api } from '../api/tenderix';
import type { Tender, GateCondition } from '../api/tenderix';
import { TEST_IDS } from '../api/config';
import { Loading } from '../components/Loading';
import { StatusBadge } from '../components/StatusBadge';

export function Dashboard() {
  const [tender, setTender] = useState<Tender | null>(null);
  const [gates, setGates] = useState<GateCondition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [tenderData, gatesData] = await Promise.all([
          api.getTender(TEST_IDS.TENDER_ID),
          api.getGateConditions(TEST_IDS.TENDER_ID),
        ]);
        setTender(tenderData);
        setGates(gatesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <Loading />;

  const gateStats = {
    total: gates.length,
    meets: gates.filter(g => g.status === 'MEETS').length,
    partial: gates.filter(g => g.status === 'PARTIALLY_MEETS').length,
    fails: gates.filter(g => g.status === 'DOES_NOT_MEET').length,
    unknown: gates.filter(g => !g.status || g.status === 'UNKNOWN').length,
  };

  const eligibilityPercent = gates.length > 0
    ? Math.round(((gateStats.meets + gateStats.partial * 0.5) / gates.length) * 100)
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">דשבורד Tenderix</h1>
        <p className="page-subtitle">מערכת ניתוח מכרזים חכמה</p>
      </div>

      {/* Tender Info */}
      {tender && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <FileText size={20} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
              {tender.tender_name}
            </h2>
            <StatusBadge status={tender.status || 'active'} />
          </div>
          <div className="grid grid-3">
            <div>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                <Building size={14} style={{ verticalAlign: 'middle', marginLeft: '0.25rem' }} />
                גוף מזמין
              </div>
              <div style={{ fontWeight: 500 }}>{tender.issuing_body || 'לא צוין'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                <Calendar size={14} style={{ verticalAlign: 'middle', marginLeft: '0.25rem' }} />
                מועד הגשה
              </div>
              <div style={{ fontWeight: 500 }}>
                {tender.submission_deadline
                  ? new Date(tender.submission_deadline).toLocaleDateString('he-IL')
                  : 'לא צוין'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                שווי משוער
              </div>
              <div style={{ fontWeight: 500 }}>
                {tender.estimated_value
                  ? `${(tender.estimated_value / 1000000).toFixed(1)} מיליון ש"ח`
                  : 'לא צוין'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{gateStats.total}</div>
          <div className="stat-label">תנאי סף</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{gateStats.meets}</div>
          <div className="stat-label">עומדים</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{gateStats.partial}</div>
          <div className="stat-label">חלקית</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{gateStats.fails}</div>
          <div className="stat-label">לא עומדים</div>
        </div>
      </div>

      {/* Eligibility Progress */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">סטטוס כשירות</h3>
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{eligibilityPercent}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${eligibilityPercent}%`,
              background: eligibilityPercent >= 80 ? 'var(--success)' :
                eligibilityPercent >= 50 ? 'var(--warning)' : 'var(--danger)'
            }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>פעולות מהירות</h3>
        <div className="grid grid-4">
          <Link to="/gates" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
            <CheckSquare size={18} />
            תנאי סף
            <ArrowLeft size={16} />
          </Link>
          <Link to="/competitors" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
            <Users size={18} />
            מתחרים
            <ArrowLeft size={16} />
          </Link>
          <Link to="/analysis" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
            <Target size={18} />
            ניתוח
            <ArrowLeft size={16} />
          </Link>
          <Link to="/decision" className="btn btn-primary" style={{ justifyContent: 'center' }}>
            <Target size={18} />
            דוח החלטה
            <ArrowLeft size={16} />
          </Link>
        </div>
      </div>

      {/* Recent Gate Conditions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">תנאי סף אחרונים</h3>
          <Link to="/gates" className="btn btn-secondary">
            צפה בכל
            <ArrowLeft size={16} />
          </Link>
        </div>
        {gates.slice(0, 5).map((gate) => (
          <div key={gate.id} className="gate-item">
            <div className="gate-number">{gate.condition_number}</div>
            <div className="gate-content">
              <div className="gate-text">{gate.condition_text}</div>
              <div className="gate-meta">
                <StatusBadge status={gate.status || 'UNKNOWN'} />
                {gate.is_mandatory && <span className="badge badge-danger">חובה</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
