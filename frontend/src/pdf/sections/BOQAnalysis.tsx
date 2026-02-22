import { View, Text } from '@react-pdf/renderer';
import type { BOQAnalysisData } from '../types';
import { pdfStyles, colors } from '../styles';

export function BOQAnalysis({ data }: { data: BOQAnalysisData }) {
  if (!data?.items?.length) return null;

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>ניתוח כתב כמויות (BOQ)</Text>

      {/* Summary stat cards */}
      <View style={{ flexDirection: 'row-reverse', marginBottom: 12 }}>
        <View style={pdfStyles.statCard}>
          <Text style={[pdfStyles.statValue, { color: colors.primary }]}>{data.summary?.total_items || data.items.length}</Text>
          <Text style={pdfStyles.statLabel}>סה"כ פריטים</Text>
        </View>
        <View style={pdfStyles.statCard}>
          <Text style={[pdfStyles.statValue, { color: colors.success }]}>{data.summary?.categories?.length || 0}</Text>
          <Text style={pdfStyles.statLabel}>קטגוריות</Text>
        </View>
        <View style={pdfStyles.statCard}>
          <Text style={[pdfStyles.statValue, { color: colors.danger }]}>{data.summary?.risks?.length || 0}</Text>
          <Text style={pdfStyles.statLabel}>סיכונים</Text>
        </View>
      </View>

      {/* Items table */}
      <View style={pdfStyles.table}>
        <View style={pdfStyles.tableHeader}>
          <Text style={[pdfStyles.tableHeaderCell, { width: '8%' }]}>#</Text>
          <Text style={[pdfStyles.tableHeaderCell, { width: '32%' }]}>תיאור</Text>
          <Text style={[pdfStyles.tableHeaderCell, { width: '10%' }]}>יחידה</Text>
          <Text style={[pdfStyles.tableHeaderCell, { width: '10%' }]}>כמות</Text>
          <Text style={[pdfStyles.tableHeaderCell, { width: '15%' }]}>קטגוריה</Text>
          <Text style={[pdfStyles.tableHeaderCell, { width: '25%' }]}>הערות סיכון</Text>
        </View>
        {data.items.map((item, i) => (
          <View key={i} style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.tableCell, { width: '8%' }]}>{item.item_number}</Text>
            <Text style={[pdfStyles.tableCell, { width: '32%' }]}>{item.description}</Text>
            <Text style={[pdfStyles.tableCell, { width: '10%' }]}>{item.unit}</Text>
            <Text style={[pdfStyles.tableCell, { width: '10%' }]}>{item.quantity}</Text>
            <Text style={[pdfStyles.tableCell, { width: '15%' }]}>{item.category}</Text>
            <Text style={[pdfStyles.tableCell, { width: '25%', color: item.risk_notes ? colors.danger : colors.gray500 }]}>
              {item.risk_notes || '-'}
            </Text>
          </View>
        ))}
      </View>

      {/* Risk summary */}
      {data.summary?.risks?.length > 0 && (
        <View style={[pdfStyles.card, { borderRightWidth: 3, borderRightColor: colors.danger }]}>
          <Text style={[pdfStyles.subTitle, { color: colors.danger }]}>סיכונים מזוהים</Text>
          {data.summary.risks.map((risk, i) => (
            <View key={i} style={pdfStyles.listItem}>
              <Text style={pdfStyles.bullet}>•</Text>
              <Text style={pdfStyles.text}>{risk}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
