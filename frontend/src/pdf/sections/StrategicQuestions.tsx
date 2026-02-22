import { View, Text } from '@react-pdf/renderer';
import type { StrategicQuestionsData } from '../types';
import { pdfStyles, colors } from '../styles';

function QuestionGroup({ title, titleColor, borderColor, questions }: {
  title: string;
  titleColor: string;
  borderColor: string;
  questions: Array<{ question: string; rationale?: string; expected_impact?: string; from_analysis?: string }>;
}) {
  if (!questions?.length) return null;
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[pdfStyles.subTitle, { color: titleColor }]}>{title} ({questions.length})</Text>
      {questions.map((q, i) => (
        <View key={i} style={[pdfStyles.card, { borderRightWidth: 3, borderRightColor: borderColor }]}>
          <Text style={[pdfStyles.text, { fontWeight: 500 }]}>{q.question}</Text>
          {q.rationale && (
            <Text style={[pdfStyles.text, { fontSize: 9, color: colors.gray500, marginTop: 2 }]}>
              נימוק: {q.rationale}
            </Text>
          )}
          {q.expected_impact && (
            <Text style={[pdfStyles.text, { fontSize: 9, color: colors.gray500 }]}>
              השפעה צפויה: {q.expected_impact}
            </Text>
          )}
          {q.from_analysis && (
            <Text style={[pdfStyles.text, { fontSize: 9, color: colors.gray500 }]}>
              מקור: {q.from_analysis}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

export function StrategicQuestions({ data }: { data: StrategicQuestionsData }) {
  if (!data) return null;
  const hasQuestions = (data.safe_questions?.length || 0) + (data.strategic_questions?.length || 0) + (data.optimization_questions?.length || 0) > 0;
  if (!hasQuestions) return null;

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>שאלות אסטרטגיות ({data.total_questions || 0})</Text>

      <QuestionGroup
        title="שאלות בטוחות"
        titleColor={colors.success}
        borderColor={colors.success}
        questions={data.safe_questions}
      />

      <QuestionGroup
        title="שאלות אסטרטגיות"
        titleColor={colors.warning}
        borderColor={colors.warning}
        questions={data.strategic_questions}
      />

      <QuestionGroup
        title="שאלות אופטימיזציה"
        titleColor={colors.primary}
        borderColor={colors.primary}
        questions={data.optimization_questions}
      />
    </View>
  );
}
