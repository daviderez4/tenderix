import { View, Text } from '@react-pdf/renderer';
import type { GateConditionsData } from '../types';
import { pdfStyles, colors } from '../styles';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  MEETS: { label: 'עומד', color: colors.success, bg: '#ecfdf5' },
  PARTIALLY_MEETS: { label: 'חלקי', color: colors.warning, bg: '#fffbeb' },
  DOES_NOT_MEET: { label: 'לא עומד', color: colors.danger, bg: '#fef2f2' },
  UNKNOWN: { label: 'לא נבדק', color: colors.gray500, bg: colors.gray50 },
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

const legalLabels: Record<string, string> = {
  strict: 'קשיח',
  open: 'פתוח לפרשנות',
  proof_dependent: 'תלוי הוכחות',
};

export function GateConditionsAnalysis({ data }: { data: GateConditionsData }) {
  const { conditions, summary } = data;

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>ניתוח תנאי סף</Text>

      {/* Summary Stats Row */}
      <View style={{ flexDirection: 'row-reverse', marginBottom: 14 }}>
        <View style={pdfStyles.statCard}>
          <Text style={[pdfStyles.statValue, { color: colors.primary }]}>{summary.total}</Text>
          <Text style={pdfStyles.statLabel}>סה"כ תנאים</Text>
        </View>
        <View style={pdfStyles.statCard}>
          <Text style={[pdfStyles.statValue, { color: colors.success }]}>{summary.meets}</Text>
          <Text style={pdfStyles.statLabel}>עומדים</Text>
        </View>
        <View style={pdfStyles.statCard}>
          <Text style={[pdfStyles.statValue, { color: colors.warning }]}>{summary.partial}</Text>
          <Text style={pdfStyles.statLabel}>חלקי</Text>
        </View>
        <View style={pdfStyles.statCard}>
          <Text style={[pdfStyles.statValue, { color: colors.danger }]}>{summary.fails}</Text>
          <Text style={pdfStyles.statLabel}>לא עומדים</Text>
        </View>
        <View style={pdfStyles.statCard}>
          <Text style={[pdfStyles.statValue, { color: colors.gray500 }]}>{summary.mandatory}</Text>
          <Text style={pdfStyles.statLabel}>חובה</Text>
        </View>
      </View>

      {/* Individual Gate Conditions */}
      {conditions.map((gate, idx) => {
        const cfg = statusConfig[gate.status] || statusConfig.UNKNOWN;

        return (
          <View
            key={idx}
            style={{
              marginBottom: 8,
              borderRadius: 6,
              backgroundColor: cfg.bg,
              borderRightWidth: 4,
              borderRightColor: cfg.color,
              padding: 10,
            }}
            wrap={false}
          >
            {/* Header row: number + text + status */}
            <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', marginBottom: 4 }}>
              <View style={{
                backgroundColor: colors.primary,
                borderRadius: 4,
                paddingVertical: 2,
                paddingHorizontal: 6,
                marginLeft: 8,
              }}>
                <Text style={{ color: colors.white, fontSize: 9, fontWeight: 700 }}>
                  #{gate.condition_number}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[pdfStyles.text, { fontWeight: 500, fontSize: 10 }]}>
                  {gate.condition_text}
                </Text>
              </View>
              <View style={{
                backgroundColor: cfg.color,
                borderRadius: 4,
                paddingVertical: 2,
                paddingHorizontal: 8,
                marginRight: 6,
              }}>
                <Text style={{ color: colors.white, fontSize: 8, fontWeight: 600 }}>
                  {cfg.label}
                </Text>
              </View>
            </View>

            {/* Meta badges row */}
            <View style={{ flexDirection: 'row-reverse', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
              {gate.is_mandatory && (
                <View style={{ backgroundColor: colors.danger, borderRadius: 3, paddingVertical: 1, paddingHorizontal: 5 }}>
                  <Text style={{ color: colors.white, fontSize: 7 }}>חובה</Text>
                </View>
              )}
              {gate.requirement_type && (
                <View style={{ backgroundColor: colors.gray500, borderRadius: 3, paddingVertical: 1, paddingHorizontal: 5 }}>
                  <Text style={{ color: colors.white, fontSize: 7 }}>{categoryLabels[gate.requirement_type] || gate.requirement_type}</Text>
                </View>
              )}
              {gate.legal_classification && (
                <View style={{ backgroundColor: colors.primaryDark, borderRadius: 3, paddingVertical: 1, paddingHorizontal: 5 }}>
                  <Text style={{ color: colors.white, fontSize: 7 }}>{legalLabels[gate.legal_classification] || gate.legal_classification}</Text>
                </View>
              )}
              {gate.required_years != null && (
                <View style={{ backgroundColor: colors.gray700, borderRadius: 3, paddingVertical: 1, paddingHorizontal: 5 }}>
                  <Text style={{ color: colors.white, fontSize: 7 }}>{gate.required_years} שנים</Text>
                </View>
              )}
              {gate.required_amount != null && (
                <View style={{ backgroundColor: colors.gray700, borderRadius: 3, paddingVertical: 1, paddingHorizontal: 5 }}>
                  <Text style={{ color: colors.white, fontSize: 7 }}>{(gate.required_amount / 1000000).toFixed(1)}M</Text>
                </View>
              )}
              {gate.required_count != null && (
                <View style={{ backgroundColor: colors.gray700, borderRadius: 3, paddingVertical: 1, paddingHorizontal: 5 }}>
                  <Text style={{ color: colors.white, fontSize: 7 }}>{gate.required_count} פרויקטים</Text>
                </View>
              )}
              {gate.ai_confidence != null && (
                <View style={{ backgroundColor: gate.ai_confidence > 0.7 ? colors.successDark : gate.ai_confidence > 0.4 ? colors.warningDark : colors.dangerDark, borderRadius: 3, paddingVertical: 1, paddingHorizontal: 5 }}>
                  <Text style={{ color: colors.white, fontSize: 7 }}>ביטחון {Math.round(gate.ai_confidence * 100)}%</Text>
                </View>
              )}
              {gate.source_section && (
                <Text style={{ fontSize: 7, color: colors.gray500 }}>
                  סעיף {gate.source_section}{gate.source_page ? ` | עמ' ${gate.source_page}` : ''}
                </Text>
              )}
            </View>

            {/* AI Summary */}
            {gate.ai_summary && (
              <View style={{ marginTop: 4, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: colors.gray200 }}>
                <Text style={[pdfStyles.text, { fontSize: 9, fontWeight: 500, color: colors.gray700 }]}>
                  {gate.ai_summary}
                </Text>
              </View>
            )}

            {/* Evidence */}
            {gate.evidence && (
              <View style={{ marginTop: 3 }}>
                <Text style={[pdfStyles.text, { fontSize: 8, color: colors.successDark }]}>
                  ראיה: {gate.evidence}
                </Text>
              </View>
            )}

            {/* Gap */}
            {gate.gap_description && (
              <View style={{ marginTop: 3, backgroundColor: '#fef2f2', borderRadius: 4, padding: 4 }}>
                <Text style={[pdfStyles.text, { fontSize: 8, color: colors.dangerDark }]}>
                  פער: {gate.gap_description}
                </Text>
              </View>
            )}

            {/* Closure Options / Recommendations */}
            {((gate.closure_options && gate.closure_options.length > 0) || (gate.equivalent_options && gate.equivalent_options.length > 0)) && (
              <View style={{ marginTop: 3, backgroundColor: '#eff6ff', borderRadius: 4, padding: 4 }}>
                <Text style={[pdfStyles.text, { fontSize: 8, fontWeight: 600, color: colors.primary, marginBottom: 2 }]}>
                  המלצות לסגירת הפער:
                </Text>
                {(gate.equivalent_options || gate.closure_options || []).map((opt, oi) => (
                  <View key={oi} style={pdfStyles.listItem}>
                    <Text style={[pdfStyles.bullet, { color: colors.primary, fontSize: 8 }]}>&#8226;</Text>
                    <Text style={[pdfStyles.text, { fontSize: 8 }]}>{opt}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Legal reasoning */}
            {gate.legal_reasoning && (
              <View style={{ marginTop: 3 }}>
                <Text style={[pdfStyles.text, { fontSize: 7, color: colors.gray500, fontStyle: 'italic' }]}>
                  פרשנות: {gate.legal_reasoning}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
