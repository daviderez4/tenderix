import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, CheckSquare, Users, Target, ArrowRight, Calendar, Building, Plus } from 'lucide-react';
import { api } from '../api/tenderix';
import type { Tender, GateCondition } from '../api/tenderix';
import { getCurrentTenderId, setCurrentTender } from '../api/config';
import { Loading } from '../components/Loading';
import { StatusBadge } from '../components/StatusBadge';

export function Dashboard() {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [gates, setGates] = useState<GateCondition[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all tenders and select the current one
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch only tenders belonging to this session's organization
        const tendersData = await api.tenders.list();
        console.log('Loaded tenders for this session:', tendersData.length);
        setTenders(tendersData || []);

        // Find and select the current tender
        const currentId = getCurrentTenderId();
        const current = currentId && currentId.length > 0
          ? tendersData.find(t => t.id === currentId) || tendersData[0]
          : tendersData[0];

        if (current) {
          setSelectedTender(current);
          // Load gates for selected tender
          const gatesData = await api.getGateConditions(current.id);
          setGates(gatesData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Listen for storage changes (when a new tender is selected)
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Handle tender selection
  const handleSelectTender = async (tender: Tender) => {
    setSelectedTender(tender);
    setCurrentTender(tender.id, tender.tender_name);

    // Load gates for the selected tender
    try {
      const gatesData = await api.getGateConditions(tender.id);
      setGates(gatesData);
    } catch (error) {
      console.error('Error loading gates:', error);
      setGates([]);
    }
  };

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

      {/* Tender List */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">
            <FileText size={20} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
            מכרזים במערכת ({tenders.length})
          </h2>
          <button
            onClick={() => navigate('/intake')}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            מכרז חדש
          </button>
        </div>

        {tenders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>אין מכרזים במערכת</p>
            <button
              onClick={() => navigate('/intake')}
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
            >
              <Plus size={18} />
              הוסף מכרז ראשון
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tenders.map((tender) => (
              <div
                key={tender.id}
                onClick={() => handleSelectTender(tender)}
                style={{
                  padding: '1rem',
                  background: selectedTender?.id === tender.id ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  borderRight: selectedTender?.id === tender.id ? '4px solid var(--primary)' : '4px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      {tender.tender_name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', display: 'flex', gap: '1rem' }}>
                      {tender.tender_number && <span>מס׳ {tender.tender_number}</span>}
                      {tender.issuing_body && <span>{tender.issuing_body}</span>}
                      {tender.submission_deadline && (
                        <span>הגשה: {new Date(tender.submission_deadline).toLocaleDateString('he-IL')}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={tender.status || 'ACTIVE'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Tender Info */}
      {selectedTender && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <FileText size={20} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
              {selectedTender.tender_name}
            </h2>
            <StatusBadge status={selectedTender.status || 'active'} />
          </div>
          <div className="grid grid-3">
            <div>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                <Building size={14} style={{ verticalAlign: 'middle', marginLeft: '0.25rem' }} />
                גוף מזמין
              </div>
              <div style={{ fontWeight: 500 }}>{selectedTender.issuing_body || 'לא צוין'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                <Calendar size={14} style={{ verticalAlign: 'middle', marginLeft: '0.25rem' }} />
                מועד הגשה
              </div>
              <div style={{ fontWeight: 500 }}>
                {selectedTender.submission_deadline
                  ? new Date(selectedTender.submission_deadline).toLocaleDateString('he-IL')
                  : 'לא צוין'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                שווי משוער
              </div>
              <div style={{ fontWeight: 500 }}>
                {selectedTender.estimated_value
                  ? `${(selectedTender.estimated_value / 1000000).toFixed(1)} מיליון ש"ח`
                  : 'לא צוין'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show stats and actions only when a tender is selected */}
      {selectedTender && (
        <>
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
                <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
              </Link>
              <Link to="/competitors" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                <Users size={18} />
                מתחרים
                <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
              </Link>
              <Link to="/analysis" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                <Target size={18} />
                ניתוח
                <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
              </Link>
              <Link to="/decision" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                <Target size={18} />
                דוח החלטה
                <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
              </Link>
            </div>
          </div>

          {/* Recent Gate Conditions */}
          {gates.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">תנאי סף אחרונים</h3>
                <Link to="/gates" className="btn btn-secondary">
                  צפה בכל
                  <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
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
          )}
        </>
      )}
    </div>
  );
}
