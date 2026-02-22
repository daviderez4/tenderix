import { View, Text } from '@react-pdf/renderer';
import type { SOWAnalysisData } from '../types';
import { pdfStyles, colors } from '../styles';

export function SOWAnalysis({ data }: { data: SOWAnalysisData }) {
  if (!data?.scope) return null;

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>ניתוח היקף עבודה (SOW)</Text>

      {/* Deliverables */}
      {data.scope.main_deliverables?.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={[pdfStyles.subTitle, { color: colors.success }]}>תוצרים עיקריים</Text>
          {data.scope.main_deliverables.map((d, i) => (
            <View key={i} style={pdfStyles.listItem}>
              <Text style={pdfStyles.bullet}>•</Text>
              <Text style={pdfStyles.text}>{d}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Phases */}
      {data.scope.work_phases?.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={[pdfStyles.subTitle, { color: colors.primary }]}>שלבי עבודה</Text>
          {data.scope.work_phases.map((p, i) => (
            <View key={i} style={pdfStyles.listItem}>
              <Text style={{ fontSize: 10, marginLeft: 6, color: colors.primary, fontWeight: 600 }}>{i + 1}.</Text>
              <Text style={pdfStyles.text}>{p}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Exclusions */}
      {data.scope.exclusions?.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={[pdfStyles.subTitle, { color: colors.warning }]}>החרגות</Text>
          {data.scope.exclusions.map((e, i) => (
            <View key={i} style={pdfStyles.listItem}>
              <Text style={pdfStyles.bullet}>•</Text>
              <Text style={pdfStyles.text}>{e}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Risks table */}
      {data.risks?.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={[pdfStyles.subTitle, { color: colors.danger }]}>סיכונים</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderCell, { width: '35%' }]}>תיאור</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '15%' }]}>חומרה</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '50%' }]}>מענה</Text>
            </View>
            {data.risks.map((r, i) => (
              <View key={i} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableCell, { width: '35%' }]}>{r.description}</Text>
                <Text style={[pdfStyles.tableCell, { width: '15%', color: r.severity === 'HIGH' ? colors.danger : r.severity === 'MEDIUM' ? colors.warning : colors.success }]}>
                  {r.severity}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: '50%' }]}>{r.mitigation}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recommendations */}
      {data.recommendations?.length > 0 && (
        <View style={[pdfStyles.card, { borderRightWidth: 3, borderRightColor: colors.success }]}>
          <Text style={[pdfStyles.subTitle, { color: colors.success }]}>המלצות</Text>
          {data.recommendations.map((rec, i) => (
            <View key={i} style={pdfStyles.listItem}>
              <Text style={pdfStyles.bullet}>•</Text>
              <Text style={pdfStyles.text}>{rec}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
