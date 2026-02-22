import { View, Text } from '@react-pdf/renderer';
import type { CompetitiveIntelData } from '../types';
import { pdfStyles, colors } from '../styles';

export function CompetitiveIntelligence({ data }: { data: CompetitiveIntelData }) {
  if (!data?.our_position) return null;

  const probColor = data.win_probability >= 70 ? colors.success
    : data.win_probability >= 40 ? colors.warning
    : colors.danger;

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>מודיעין תחרותי</Text>

      {/* Win probability banner */}
      <View style={{
        backgroundColor: probColor,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
      }}>
        <Text style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>
          סיכויי זכייה: {data.win_probability}%
        </Text>
      </View>

      {/* 3-column position analysis */}
      <View style={{ flexDirection: 'row-reverse', marginBottom: 12 }}>
        {/* Strengths */}
        <View style={{ flex: 1, marginHorizontal: 3 }}>
          <View style={[pdfStyles.card, { borderTopWidth: 3, borderTopColor: colors.success }]}>
            <Text style={[pdfStyles.subTitle, { color: colors.success, fontSize: 11 }]}>חוזקות</Text>
            {data.our_position.strengths?.map((s, i) => (
              <View key={i} style={pdfStyles.listItem}>
                <Text style={[pdfStyles.bullet, { color: colors.success }]}>•</Text>
                <Text style={[pdfStyles.text, { fontSize: 9 }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Weaknesses */}
        <View style={{ flex: 1, marginHorizontal: 3 }}>
          <View style={[pdfStyles.card, { borderTopWidth: 3, borderTopColor: colors.warning }]}>
            <Text style={[pdfStyles.subTitle, { color: colors.warning, fontSize: 11 }]}>חולשות</Text>
            {data.our_position.weaknesses?.map((w, i) => (
              <View key={i} style={pdfStyles.listItem}>
                <Text style={[pdfStyles.bullet, { color: colors.warning }]}>•</Text>
                <Text style={[pdfStyles.text, { fontSize: 9 }]}>{w}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Unique advantages */}
        <View style={{ flex: 1, marginHorizontal: 3 }}>
          <View style={[pdfStyles.card, { borderTopWidth: 3, borderTopColor: colors.primary }]}>
            <Text style={[pdfStyles.subTitle, { color: colors.primary, fontSize: 11 }]}>יתרונות ייחודיים</Text>
            {data.our_position.unique_advantages?.map((a, i) => (
              <View key={i} style={pdfStyles.listItem}>
                <Text style={[pdfStyles.bullet, { color: colors.primary }]}>•</Text>
                <Text style={[pdfStyles.text, { fontSize: 9 }]}>{a}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Competitive landscape */}
      {data.competitive_landscape && (
        <View style={[pdfStyles.card, { marginBottom: 10 }]}>
          <Text style={pdfStyles.subTitle}>נוף תחרותי</Text>
          <Text style={pdfStyles.text}>{data.competitive_landscape}</Text>
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
