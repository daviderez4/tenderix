/**
 * ProfileTestPage - Profile Testing & QA Page
 *
 * Allows generating test company profiles (passing/failing/adversarial)
 * and running them against the semantic matching engine to validate quality
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FlaskConical, Play, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, ChevronDown, ChevronUp, ArrowRight,
  Users, Building, FileText, Trophy, Skull
} from 'lucide-react';
import { api, type Tender, type GateCondition } from '../api/tenderix';

interface GeneratedProfile {
  id?: string;
  profile_type: string;
  profile_name: string;
  company_data: Record<string, unknown>;
  generated_projects: Array<{
    project_name: string;
    client_name: string;
    total_value: number;
    domain_classification: string;
    expected_match: boolean;
    why_matches_or_not: string;
  }>;
  generated_financials: Array<Record<string, unknown>>;
  generated_certifications: Array<Record<string, unknown>>;
  generated_personnel: Array<Record<string, unknown>>;
  expected_result: {
    overall_eligibility: string;
    per_condition: Array<{
      condition_text: string;
      expected_status: string;
      expected_reasoning: string;
    }>;
  };
  adversarial_tricks?: Array<{
    trick_type: string;
    description: string;
    target_condition: string;
    expected_detection: string;
  }>;
  test_result?: Record<string, unknown>;
  test_passed?: boolean;
  test_run_at?: string;
}

const profileTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  PASSING: {
    label: 'פרופיל עובר',
    icon: <Trophy size={20} />,
    color: '#22c55e',
    description: 'פרויקטים שעומדים בדיוק בתנאי הסף לפי ההגדרות'
  },
  FAILING: {
    label: 'פרופיל נכשל',
    icon: <XCircle size={20} />,
    color: '#ef4444',
    description: 'פרויקטים שלא עומדים בתנאי הסף - כל אחד מסיבה אחרת'
  },
  ADVERSARIAL: {
    label: 'פרופיל מטעה',
    icon: <Skull size={20} />,
    color: '#f59e0b',
    description: 'פרויקטים שנראים כאילו עומדים אבל לא באמת - לבדיקת חוסן המערכת'
  }
};

export default function ProfileTestPage() {
  const { tenderId: paramTenderId } = useParams<{ tenderId: string }>();
  const tenderId = paramTenderId || localStorage.getItem('currentTenderId') || '';
  const [tender, setTender] = useState<Tender | null>(null);
  const [gates, setGates] = useState<GateCondition[]>([]);
  const [profiles, setProfiles] = useState<GeneratedProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenderId) {
      loadData();
    }
  }, [tenderId]);

  async function loadData() {
    setLoading(true);
    try {
      const [tenderData, gatesData, profilesData] = await Promise.all([
        api.tenders.get(tenderId!),
        api.getGateConditions(tenderId!),
        api.profileTest.getProfiles(tenderId!).catch(() => []),
      ]);
      setTender(tenderData);
      setGates(gatesData || []);
      setProfiles(profilesData || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'שגיאה בטעינת נתונים';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function generateProfile(profileType: string) {
    setGenerating(profileType);
    setError(null);
    try {
      const result = await api.profileTest.generate(tenderId!, profileType);
      setProfiles(prev => [...prev, result]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'שגיאה ביצירת פרופיל';
      setError(errorMessage);
    } finally {
      setGenerating(null);
    }
  }

  async function testProfile(profileId: string) {
    setTesting(profileId);
    setError(null);
    try {
      const result = await api.profileTest.test(tenderId!, profileId);
      setProfiles(prev => prev.map(p =>
        p.id === profileId ? { ...p, test_result: result, test_passed: result.test_passed, test_run_at: new Date().toISOString() } : p
      ));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'שגיאה בהרצת בדיקה';
      setError(errorMessage);
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <RefreshCw size={32} className="spin" style={{ color: '#6366f1' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', direction: 'rtl', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
          <Link to="/" style={{ color: '#6366f1', textDecoration: 'none' }}>דשבורד</Link>
          <ArrowRight size={14} />
          <Link to={`/gates/${tenderId}`} style={{ color: '#6366f1', textDecoration: 'none' }}>תנאי סף</Link>
          <ArrowRight size={14} />
          <span>בדיקת פרופילים</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FlaskConical size={28} color="#6366f1" />
          בדיקת איכות התאמה - {tender?.tender_name || ''}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
          יצירת פרופילי חברה לדוגמה ובדיקה שהמערכת מזהה נכון עמידה / אי-עמידה בתנאי הסף
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {/* Gate conditions summary */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>
          תנאי סף למכרז ({gates.length} תנאים):
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {gates.map((g, i) => (
            <span key={i} style={{
              background: g.is_mandatory ? '#fef2f2' : '#f0fdf4',
              color: g.is_mandatory ? '#991b1b' : '#166534',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              border: `1px solid ${g.is_mandatory ? '#fecaca' : '#bbf7d0'}`
            }}>
              #{g.condition_number}: {g.condition_text?.substring(0, 50)}...
            </span>
          ))}
        </div>
      </div>

      {/* Generate buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {Object.entries(profileTypeConfig).map(([type, config]) => (
          <button
            key={type}
            onClick={() => generateProfile(type)}
            disabled={generating !== null}
            style={{
              background: '#fff',
              border: `2px solid ${config.color}40`,
              borderRadius: '12px',
              padding: '20px',
              cursor: generating ? 'not-allowed' : 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
              opacity: generating && generating !== type ? 0.5 : 1
            }}
          >
            <div style={{ color: config.color, display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              {generating === type ? <RefreshCw size={24} className="spin" /> : config.icon}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
              {generating === type ? 'מייצר...' : `צור ${config.label}`}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {config.description}
            </div>
          </button>
        ))}
      </div>

      {/* Generated profiles list */}
      {profiles.length > 0 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} />
            פרופילים שנוצרו ({profiles.length})
          </h2>

          {profiles.map((profile, idx) => {
            const config = profileTypeConfig[profile.profile_type] || profileTypeConfig.PASSING;
            const isExpanded = expandedProfile === (profile.id || String(idx));

            return (
              <div key={profile.id || idx} style={{
                border: `2px solid ${config.color}30`,
                borderRadius: '12px',
                marginBottom: '16px',
                overflow: 'hidden'
              }}>
                {/* Profile header */}
                <div
                  onClick={() => setExpandedProfile(isExpanded ? null : (profile.id || String(idx)))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    background: `${config.color}08`
                  }}
                >
                  <div style={{ color: config.color }}>{config.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{profile.profile_name}</span>
                      <span style={{
                        background: `${config.color}15`,
                        color: config.color,
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {config.label}
                      </span>
                      {profile.test_passed !== undefined && (
                        <span style={{
                          background: profile.test_passed ? '#dcfce7' : '#fee2e2',
                          color: profile.test_passed ? '#166534' : '#991b1b',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {profile.test_passed ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {profile.test_passed ? 'בדיקה עברה' : 'בדיקה נכשלה'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      {profile.generated_projects?.length || 0} פרויקטים |
                      צפי: {profile.expected_result?.overall_eligibility || '?'}
                      {profile.adversarial_tricks?.length ? ` | ${profile.adversarial_tricks.length} טריקים` : ''}
                    </div>
                  </div>

                  {/* Test button */}
                  {profile.id && !profile.test_run_at && (
                    <button
                      onClick={(e) => { e.stopPropagation(); testProfile(profile.id!); }}
                      disabled={testing !== null}
                      style={{
                        background: '#6366f1',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        cursor: testing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px'
                      }}
                    >
                      {testing === profile.id ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
                      הרץ בדיקה
                    </button>
                  )}

                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: '20px', borderTop: `1px solid ${config.color}20` }}>
                    {/* Projects */}
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building size={14} /> פרויקטים ({profile.generated_projects?.length || 0}):
                    </h4>
                    <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                      {profile.generated_projects?.map((proj, pi) => (
                        <div key={pi} style={{
                          border: `1px solid ${proj.expected_match ? '#bbf7d0' : '#fecaca'}`,
                          borderRadius: '8px',
                          padding: '10px 14px',
                          background: proj.expected_match ? '#f0fdf405' : '#fef2f205'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
                              {proj.expected_match ? '✅' : '❌'} {proj.project_name}
                            </span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              {proj.domain_classification} | {((proj.total_value || 0) / 1000000).toFixed(1)}M ₪
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>
                            {proj.why_matches_or_not}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Adversarial tricks */}
                    {profile.adversarial_tricks && profile.adversarial_tricks.length > 0 && (
                      <>
                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={14} /> טריקים ({profile.adversarial_tricks.length}):
                        </h4>
                        <div style={{ display: 'grid', gap: '6px', marginBottom: '16px' }}>
                          {profile.adversarial_tricks.map((trick, ti) => (
                            <div key={ti} style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              fontSize: '12px'
                            }}>
                              <span style={{ fontWeight: 'bold', color: '#991b1b' }}>🎭 {trick.trick_type}: </span>
                              <span style={{ color: '#7f1d1d' }}>{trick.description}</span>
                              <div style={{ color: '#9ca3af', marginTop: '2px' }}>
                                צפי זיהוי: {trick.expected_detection}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Expected results */}
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} /> תוצאות צפויות:
                    </h4>
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        כשירות צפויה: <span style={{
                          color: profile.expected_result?.overall_eligibility === 'ELIGIBLE' ? '#16a34a' : '#dc2626'
                        }}>
                          {profile.expected_result?.overall_eligibility || '?'}
                        </span>
                      </div>
                      {profile.expected_result?.per_condition?.map((cond, ci) => (
                        <div key={ci} style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>
                          <span style={{
                            color: cond.expected_status === 'MEETS' ? '#16a34a' : '#dc2626',
                            fontWeight: 'bold'
                          }}>
                            {cond.expected_status === 'MEETS' ? '✅' : '❌'} {cond.expected_status}
                          </span>
                          {' - '}{cond.condition_text?.substring(0, 60)}...
                        </div>
                      ))}
                    </div>

                    {/* Test results (if ran) */}
                    {profile.test_result && (
                      <div style={{
                        background: profile.test_passed ? '#f0fdf4' : '#fef2f2',
                        border: `2px solid ${profile.test_passed ? '#86efac' : '#fca5a5'}`,
                        borderRadius: '12px',
                        padding: '16px'
                      }}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: profile.test_passed ? '#166534' : '#991b1b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px'
                        }}>
                          {profile.test_passed ? <CheckCircle size={20} /> : <XCircle size={20} />}
                          {profile.test_passed ? 'בדיקה עברה בהצלחה!' : 'בדיקה נכשלה'}
                        </h4>
                        <pre style={{ fontSize: '12px', color: '#374151', overflow: 'auto', maxHeight: '300px' }}>
                          {JSON.stringify(profile.test_result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
