import { View, Text } from '@react-pdf/renderer';
import type { ClarificationData } from '../types';
import { pdfStyles, colors } from '../styles';

const priorityColors: Record<string, string> = {
  P1: colors.danger,
  P2: colors.warning,
  P3: colors.gray500,
};

export function ClarificationQuestions({ data }: { data: ClarificationData }) {
  if (!data?.questions?.length) return null;

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>שאלות הבהרה ({data.questions.length})</Text>

      {data.questions.map((q, i) => (
        <View key={i} style={[pdfStyles.card, { marginBottom: 6 }]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 4 }}>
            <View style={{
              backgroundColor: colors.primary,
              borderRadius: 10,
              width: 22,
              height: 22,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}>
              <Text style={{ color: colors.white, fontSize: 9, fontWeight: 700 }}>{i + 1}</Text>
            </View>
            {q.priority && (
              <View style={{
                backgroundColor: priorityColors[q.priority] || colors.gray500,
                borderRadius: 4,
                paddingVertical: 1,
                paddingHorizontal: 6,
                marginLeft: 6,
              }}>
                <Text style={{ color: colors.white, fontSize: 8, fontWeight: 600 }}>{q.priority}</Text>
              </View>
            )}
            {q.category && (
              <View style={{
                backgroundColor: colors.gray200,
                borderRadius: 4,
                paddingVertical: 1,
                paddingHorizontal: 6,
              }}>
                <Text style={{ color: colors.gray700, fontSize: 8 }}>{q.category}</Text>
              </View>
            )}
          </View>
          <Text style={[pdfStyles.text, { fontWeight: 500 }]}>{q.question}</Text>
          {q.rationale && (
            <Text style={[pdfStyles.text, { fontSize: 9, color: colors.gray500, marginTop: 2 }]}>
              סיבה: {q.rationale}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
