/**
 * GateMatchExplanation Component
 *
 * Displays detailed semantic matching explanation for a single gate condition
 * Shows: definition used, per-project analysis, gap analysis, dual interpretation
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle, Info, Lightbulb, Scale } from 'lucide-react';

interface ProjectAnalysis {
  project_name: string;
  project_value?: number;
  project_year?: number;
  domain_classification?: string;
  classification?: string;
  matches_definition?: boolean;
  matches_value?: boolean;
  matches_timeframe?: boolean;
  overall_match?: boolean;
  match_status?: string;
  reasoning?: string;
  overall_reasoning?: string;
  adversarial_flags?: Array<{
    flag_type: string;
    description: string;
    severity: string;
  }>;
  criteria_checks?: Array<{
    criterion: string;
    required: string;
    actual: string;
    passes: boolean;
    reasoning: string;
  }>;
  dual_interpretation?: {
    restrictive: { matches: boolean; reasoning: string };
    expansive: { matches: boolean; reasoning: string };
  };
}

interface GapClosureOption {
  option: string;
  description: string;
  feasibility: string;
  action_items?: string[];
}

interface MatchExplanationData {
  overall_status: string;
  required_count?: number;
  matching_count?: number;
  definition_term?: string;
  definition_text?: string;
  project_analyses: ProjectAnalysis[];
  gap_description?: string;
  gap_closure_options?: GapClosureOption[];
  restrictive_result?: { status: string; matching_count?: number; reasoning: string };
  expansive_result?: { status: string; matching_count?: number; reasoning: string };
  recommended_interpretation?: string;
  explanation_markdown?: string;
}

interface GateMatchExplanationProps {
  conditionNumber: string;
  conditionText: string;
  explanation: MatchExplanationData;
  isExpanded?: boolean;
}

const statusColors: Record<string, string> = {
  MEETS: '#22c55e',
  PARTIALLY_MEETS: '#f59e0b',
  DOES_NOT_MEET: '#ef4444',
  UNKNOWN: '#6b7280',
  FULL: '#22c55e',
  PARTIAL: '#f59e0b',
  NONE: '#ef4444'
};

const statusLabels: Record<string, string> = {
  MEETS: 'עומד',
  PARTIALLY_MEETS: 'עומד חלקית',
  DOES_NOT_MEET: 'לא עומד',
  UNKNOWN: 'לא נבדק'
};

const feasibilityLabels: Record<string, string> = {
  HIGH: 'ישימות גבוהה',
  MEDIUM: 'ישימות בינונית',
  LOW: 'ישימות נמוכה'
};

const closureLabels: Record<string, string> = {
  SUBCONTRACTOR: 'קבלן משנה',
  PARTNERSHIP: 'שותפות',
  CLARIFICATION: 'שאלת הבהרה',
  DEVELOPMENT: 'פיתוח יכולת',
  ALTERNATE_PRESENTATION: 'הצגה חלופית',
  BLOCKING: 'חוסם - אין פתרון'
};

export function GateMatchExplanation({ conditionNumber, conditionText, explanation, isExpanded: defaultExpanded = false }: GateMatchExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const status = explanation.overall_status || 'UNKNOWN';
  const statusColor = statusColors[status] || '#6b7280';
  const hasAdversarialFlags = explanation.project_analyses?.some(p =>
    (p.adversarial_flags?.length || 0) > 0
  );

  return (
    <div style={{
      border: `2px solid ${statusColor}20`,
      borderRadius: '12px',
      marginBottom: '16px',
      background: '#fff',
      overflow: 'hidden',
      direction: 'rtl'
    }}>
      {/* Header - Always visible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          cursor: 'pointer',
          background: `${statusColor}08`,
          borderBottom: isExpanded ? `1px solid ${statusColor}20` : 'none'
        }}
      >
        {/* Status icon */}
        {status === 'MEETS' && <CheckCircle size={24} color={statusColor} />}
        {status === 'DOES_NOT_MEET' && <XCircle size={24} color={statusColor} />}
        {status === 'PARTIALLY_MEETS' && <AlertTriangle size={24} color={statusColor} />}
        {status === 'UNKNOWN' && <Info size={24} color={statusColor} />}

        {/* Condition info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: statusColor,
              color: '#fff',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              #{conditionNumber}
            </span>
            <span style={{
              background: `${statusColor}15`,
              color: statusColor,
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {statusLabels[status] || status}
              {explanation.matching_count !== undefined && explanation.required_count !== undefined &&
                ` (${explanation.matching_count}/${explanation.required_count})`
              }
            </span>
            {hasAdversarialFlags && (
              <span style={{
                background: '#fef2f2',
                color: '#dc2626',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <AlertTriangle size={12} /> דגל אדום
              </span>
            )}
          </div>
          <div style={{ fontSize: '14px', color: '#374151', marginTop: '4px' }}>
            {conditionText.substring(0, 120)}{conditionText.length > 120 ? '...' : ''}
          </div>
        </div>

        {/* Expand/collapse */}
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: '20px' }}>
          {/* Definition used */}
          {explanation.definition_term && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 'bold', marginBottom: '4px' }}>
                📋 הגדרת המכרז:
              </div>
              <div style={{ fontSize: '14px', color: '#0c4a6e' }}>
                <strong>"{explanation.definition_term}"</strong> = {explanation.definition_text}
              </div>
            </div>
          )}

          {/* Per-project analysis */}
          {explanation.project_analyses?.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
                ניתוח פרויקטים:
              </h4>
              {explanation.project_analyses.map((proj, idx) => {
                const projMatches = proj.overall_match || proj.match_status === 'FULL';
                const projColor = projMatches ? '#22c55e' : '#ef4444';

                return (
                  <div key={idx} style={{
                    border: `1px solid ${projColor}30`,
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '8px',
                    background: `${projColor}05`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#1f2937' }}>
                          {projMatches ? '✅' : '❌'} {proj.project_name}
                        </span>
                        {proj.project_value && (
                          <span style={{ color: '#6b7280', marginRight: '8px', fontSize: '13px' }}>
                            ({(proj.project_value / 1000000).toFixed(1)}M ₪{proj.project_year ? `, ${proj.project_year}` : ''})
                          </span>
                        )}
                      </div>
                      {proj.domain_classification && (
                        <span style={{
                          background: projMatches ? '#dcfce7' : '#fee2e2',
                          color: projMatches ? '#166534' : '#991b1b',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontSize: '11px'
                        }}>
                          {proj.domain_classification || proj.classification}
                        </span>
                      )}
                    </div>

                    {/* Reasoning */}
                    <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '6px' }}>
                      {proj.reasoning || proj.overall_reasoning}
                    </div>

                    {/* Criteria checks */}
                    {proj.criteria_checks && proj.criteria_checks.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {proj.criteria_checks.map((check, ci) => (
                          <span key={ci} style={{
                            background: check.passes ? '#dcfce7' : '#fee2e2',
                            color: check.passes ? '#166534' : '#991b1b',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px'
                          }}>
                            {check.passes ? '✓' : '✗'} {check.criterion}: {check.actual}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Adversarial flags */}
                    {proj.adversarial_flags && proj.adversarial_flags.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        {proj.adversarial_flags.map((flag, fi) => (
                          <div key={fi} style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            color: '#991b1b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '4px'
                          }}>
                            <AlertTriangle size={14} />
                            <span><strong>⚠️ {flag.flag_type}:</strong> {flag.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Gap description & closure options */}
          {explanation.gap_description && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Lightbulb size={16} color="#d97706" />
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#92400e' }}>
                  מה אפשר לעשות:
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#78350f', marginBottom: '8px' }}>
                {explanation.gap_description}
              </div>
              {explanation.gap_closure_options && explanation.gap_closure_options.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {explanation.gap_closure_options.map((opt, i) => (
                    <div key={i} style={{
                      background: '#fff',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{closureLabels[opt.option] || opt.option}</strong>
                        <span style={{
                          color: opt.feasibility === 'HIGH' ? '#16a34a' : opt.feasibility === 'MEDIUM' ? '#d97706' : '#dc2626',
                          fontSize: '11px'
                        }}>
                          {feasibilityLabels[opt.feasibility] || opt.feasibility}
                        </span>
                      </div>
                      <div style={{ color: '#6b7280', marginTop: '2px' }}>{opt.description}</div>
                      {opt.action_items && opt.action_items.length > 0 && (
                        <ul style={{ margin: '4px 0 0 0', paddingRight: '16px', color: '#4b5563' }}>
                          {opt.action_items.map((item, j) => <li key={j}>{item}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dual interpretation */}
          {(explanation.restrictive_result?.reasoning || explanation.expansive_result?.reasoning) && (
            <div style={{
              background: '#faf5ff',
              border: '1px solid #d8b4fe',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Scale size={16} color="#7c3aed" />
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#5b21b6' }}>
                  פרשנות כפולה:
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#fff', borderRadius: '6px', padding: '8px', border: '1px solid #e9d5ff' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#7c3aed', marginBottom: '4px' }}>
                    ⚖️ פרשנות מצמצמת (משפטית)
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: explanation.restrictive_result?.status === 'MEETS' ? '#16a34a' : '#dc2626',
                    fontWeight: 'bold'
                  }}>
                    {statusLabels[explanation.restrictive_result?.status || ''] || 'לא נבדק'}
                    {explanation.restrictive_result?.matching_count !== undefined && ` (${explanation.restrictive_result.matching_count})`}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    {explanation.restrictive_result?.reasoning}
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: '6px', padding: '8px', border: '1px solid #e9d5ff' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#7c3aed', marginBottom: '4px' }}>
                    🔧 פרשנות מרחיבה (טכנית)
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: explanation.expansive_result?.status === 'MEETS' ? '#16a34a' : '#dc2626',
                    fontWeight: 'bold'
                  }}>
                    {statusLabels[explanation.expansive_result?.status || ''] || 'לא נבדק'}
                    {explanation.expansive_result?.matching_count !== undefined && ` (${explanation.expansive_result.matching_count})`}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    {explanation.expansive_result?.reasoning}
                  </div>
                </div>
              </div>
              {explanation.recommended_interpretation && (
                <div style={{ fontSize: '12px', color: '#5b21b6', marginTop: '8px', fontWeight: 'bold' }}>
                  💡 המלצה: {explanation.recommended_interpretation === 'RESTRICTIVE' ? 'לפי פרשנות מצמצמת' : 'לפי פרשנות מרחיבה'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
