import { View, Text } from '@react-pdf/renderer';
import type { PricingIntelData } from '../types';
import { pdfStyles, colors } from '../styles';
import { PriceRangeChart } from '../charts/PDFCharts';

function formatCurrency(n: number): string {
  return n?.toLocaleString('he-IL') || '0';
}

export function PricingIntelligence({ data }: { data: PricingIntelData }) {
  if (!data?.pricing_analysis) return null;

  const { pricing_analysis, competitor_pricing } = data;

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>מודיעין תמחור</Text>

      {/* Price cards */}
      <View style={{ flexDirection: 'row-reverse', marginBottom: 12 }}>
        <View style={[pdfStyles.statCard, { borderTopWidth: 3, borderTopColor: colors.success }]}>
          <Text style={[pdfStyles.statLabel, { marginBottom: 4 }]}>מינימום</Text>
          <Text style={[pdfStyles.statValue, { fontSize: 14, color: colors.success }]}>
            {formatCurrency(pricing_analysis.estimated_range?.min)} ש"ח
          </Text>
        </View>
        <View style={[pdfStyles.statCard, { borderTopWidth: 3, borderTopColor: colors.primary }]}>
          <Text style={[pdfStyles.statLabel, { marginBottom: 4 }]}>מומלץ</Text>
          <Text style={[pdfStyles.statValue, { fontSize: 14, color: colors.primary }]}>
            {formatCurrency(pricing_analysis.recommended_price)} ש"ח
          </Text>
        </View>
        <View style={[pdfStyles.statCard, { borderTopWidth: 3, borderTopColor: colors.warning }]}>
          <Text style={[pdfStyles.statLabel, { marginBottom: 4 }]}>מקסימום</Text>
          <Text style={[pdfStyles.statValue, { fontSize: 14, color: colors.warning }]}>
            {formatCurrency(pricing_analysis.estimated_range?.max)} ש"ח
          </Text>
        </View>
      </View>

      {/* Visual price range chart */}
      {pricing_analysis.estimated_range && (
        <View style={{ marginBottom: 8 }}>
          <PriceRangeChart
            min={pricing_analysis.estimated_range.min}
            max={pricing_analysis.estimated_range.max}
            recommended={pricing_analysis.recommended_price}
            width={340}
          />
        </View>
      )}

      {/* Strategy box */}
      {pricing_analysis.strategy && (
        <View style={[pdfStyles.card, { borderRightWidth: 3, borderRightColor: colors.primary, marginBottom: 12 }]}>
          <Text style={[pdfStyles.subTitle, { color: colors.primary }]}>אסטרטגיית תמחור</Text>
          <Text style={pdfStyles.text}>{pricing_analysis.strategy}</Text>
        </View>
      )}

      {/* Competitor pricing table */}
      {competitor_pricing?.length > 0 && (
        <View>
          <Text style={pdfStyles.subTitle}>תמחור מתחרים</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderCell, { width: '30%' }]}>מתחרה</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '30%' }]}>טווח צפוי</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '40%' }]}>אסטרטגיה</Text>
            </View>
            {competitor_pricing.map((cp, i) => (
              <View key={i} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableCell, { width: '30%', fontWeight: 500 }]}>{cp.competitor}</Text>
                <Text style={[pdfStyles.tableCell, { width: '30%' }]}>{cp.expected_range}</Text>
                <Text style={[pdfStyles.tableCell, { width: '40%' }]}>{cp.strategy}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
