import { Document, Page, View, Text } from '@react-pdf/renderer';
import type { TenderReportData } from './types';
import { pdfStyles, colors } from './styles';
import { BOQAnalysis } from './sections/BOQAnalysis';
import { SOWAnalysis } from './sections/SOWAnalysis';
import { ClarificationQuestions } from './sections/ClarificationQuestions';
import { StrategicQuestions } from './sections/StrategicQuestions';
import { RequiredDocuments } from './sections/RequiredDocuments';
import { PricingIntelligence } from './sections/PricingIntelligence';
import { CompetitiveIntelligence } from './sections/CompetitiveIntelligence';

function CoverPage({ data }: { data: TenderReportData }) {
  const decisionColor = data.decision?.decision === 'GO' ? colors.success
    : data.decision?.decision === 'NO-GO' ? colors.danger
    : colors.warning;

  return (
    <Page size="A4" style={[pdfStyles.page, { justifyContent: 'center', alignItems: 'center' }]}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: 700, color: colors.primary, marginBottom: 8, textAlign: 'center' }}>
          Tenderix
        </Text>
        <Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 40, textAlign: 'center' }}>
          דוח מכרז מקיף
        </Text>

        <Text style={{ fontSize: 22, fontWeight: 700, color: colors.gray800, marginBottom: 12, textAlign: 'center' }}>
          {data.tenderName}
        </Text>
        {data.tenderNumber && (
          <Text style={{ fontSize: 14, color: colors.gray500, marginBottom: 6, textAlign: 'center' }}>
            מכרז מס' {data.tenderNumber}
          </Text>
        )}
        {data.issuingBody && (
          <Text style={{ fontSize: 12, color: colors.gray500, marginBottom: 30, textAlign: 'center' }}>
            {data.issuingBody}
          </Text>
        )}

        {data.decision && (
          <View style={{
            backgroundColor: decisionColor,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 40,
            marginBottom: 30,
          }}>
            <Text style={{ fontSize: 28, fontWeight: 700, color: colors.white, textAlign: 'center' }}>
              {data.decision.decision}
            </Text>
            <Text style={{ fontSize: 11, color: colors.white, textAlign: 'center', marginTop: 4 }}>
              רמת ביטחון: {data.decision.confidence}%
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row-reverse', gap: 20, marginTop: 10 }}>
          {data.submissionDeadline && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 9, color: colors.gray500 }}>מועד הגשה</Text>
              <Text style={{ fontSize: 11, fontWeight: 600 }}>{data.submissionDeadline}</Text>
            </View>
          )}
          {data.estimatedValue && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 9, color: colors.gray500 }}>ערך משוער</Text>
              <Text style={{ fontSize: 11, fontWeight: 600 }}>{data.estimatedValue.toLocaleString('he-IL')} ש"ח</Text>
            </View>
          )}
        </View>

        <Text style={{ fontSize: 9, color: colors.gray500, marginTop: 50, textAlign: 'center' }}>
          הופק ב-{data.generatedAt}
        </Text>
      </View>
    </Page>
  );
}

function ExecutiveSummaryPage({ data }: { data: TenderReportData }) {
  if (!data.decision) return null;
  const d = data.decision;

  return (
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.sectionTitle}>סיכום מנהלים</Text>
      <Text style={[pdfStyles.text, { fontSize: 11, lineHeight: 1.8, marginBottom: 16 }]}>
        {d.executive_summary}
      </Text>

      {/* Gate stats */}
      {d.gate_analysis && (
        <View style={{ flexDirection: 'row-reverse', marginBottom: 16 }}>
          <View style={pdfStyles.statCard}>
            <Text style={[pdfStyles.statValue, { color: colors.primary }]}>{d.gate_analysis.total}</Text>
            <Text style={pdfStyles.statLabel}>תנאי סף</Text>
          </View>
          <View style={pdfStyles.statCard}>
            <Text style={[pdfStyles.statValue, { color: colors.success }]}>{d.gate_analysis.meets}</Text>
            <Text style={pdfStyles.statLabel}>עומדים</Text>
          </View>
          <View style={pdfStyles.statCard}>
            <Text style={[pdfStyles.statValue, { color: colors.warning }]}>{d.gate_analysis.partial}</Text>
            <Text style={pdfStyles.statLabel}>חלקי</Text>
          </View>
          <View style={pdfStyles.statCard}>
            <Text style={[pdfStyles.statValue, { color: colors.danger }]}>{d.gate_analysis.fails}</Text>
            <Text style={pdfStyles.statLabel}>לא עומדים</Text>
          </View>
        </View>
      )}

      {/* Blocking Issues */}
      {d.blocking_issues?.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={[pdfStyles.subTitle, { color: colors.danger }]}>
            בעיות חוסמות ({d.blocking_issues.length})
          </Text>
          {d.blocking_issues.map((issue, i) => (
            <View key={i} style={[pdfStyles.card, { borderRightWidth: 3, borderRightColor: colors.danger }]}>
              <Text style={[pdfStyles.text, { fontWeight: 500 }]}>{issue.issue}</Text>
              <Text style={[pdfStyles.text, { fontSize: 9, color: colors.gray500, marginTop: 2 }]}>
                חומרה: {issue.severity} | פתרון: {issue.resolution}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Strengths / Weaknesses */}
      <View style={{ flexDirection: 'row-reverse', marginBottom: 12 }}>
        <View style={{ flex: 1, marginLeft: 6 }}>
          <View style={[pdfStyles.card, { borderTopWidth: 3, borderTopColor: colors.success }]}>
            <Text style={[pdfStyles.subTitle, { color: colors.successDark, fontSize: 11 }]}>חוזקות</Text>
            {d.strengths?.map((s, i) => (
              <View key={i} style={pdfStyles.listItem}>
                <Text style={[pdfStyles.bullet, { color: colors.success }]}>•</Text>
                <Text style={[pdfStyles.text, { fontSize: 9 }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flex: 1, marginRight: 6 }}>
          <View style={[pdfStyles.card, { borderTopWidth: 3, borderTopColor: colors.warning }]}>
            <Text style={[pdfStyles.subTitle, { color: colors.warningDark, fontSize: 11 }]}>חולשות</Text>
            {d.weaknesses?.map((w, i) => (
              <View key={i} style={pdfStyles.listItem}>
                <Text style={[pdfStyles.bullet, { color: colors.warning }]}>•</Text>
                <Text style={[pdfStyles.text, { fontSize: 9 }]}>{w}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Page>
  );
}

function RisksActionsPage({ data }: { data: TenderReportData }) {
  if (!data.decision) return null;
  const d = data.decision;
  const hasRisks = d.risks?.length > 0;
  const hasActions = d.recommended_actions?.length > 0;
  const hasResources = d.resource_estimate;
  if (!hasRisks && !hasActions && !hasResources) return null;

  return (
    <Page size="A4" style={pdfStyles.page}>
      {/* Risks table */}
      {hasRisks && (
        <View style={{ marginBottom: 16 }}>
          <Text style={pdfStyles.sectionTitle}>סיכונים</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderCell, { width: '30%' }]}>סיכון</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '15%' }]}>הסתברות</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '15%' }]}>השפעה</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '40%' }]}>מענה</Text>
            </View>
            {d.risks.map((r, i) => (
              <View key={i} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableCell, { width: '30%' }]}>{r.risk}</Text>
                <Text style={[pdfStyles.tableCell, { width: '15%' }]}>{r.probability}</Text>
                <Text style={[pdfStyles.tableCell, { width: '15%' }]}>{r.impact}</Text>
                <Text style={[pdfStyles.tableCell, { width: '40%' }]}>{r.mitigation}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recommended actions */}
      {hasActions && (
        <View style={{ marginBottom: 16 }}>
          <Text style={pdfStyles.sectionTitle}>פעולות נדרשות</Text>
          {d.recommended_actions.map((a, i) => (
            <View key={i} style={[pdfStyles.card, { flexDirection: 'row-reverse', alignItems: 'center' }]}>
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
              <View style={{ flex: 1 }}>
                <Text style={[pdfStyles.text, { fontWeight: 500 }]}>{a.action}</Text>
                <Text style={[pdfStyles.text, { fontSize: 9, color: colors.gray500 }]}>
                  עדיפות: {a.priority}{a.deadline ? ` | עד: ${a.deadline}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Resource estimate */}
      {hasResources && (
        <View>
          <Text style={pdfStyles.sectionTitle}>הערכת משאבים</Text>
          <View style={{ flexDirection: 'row-reverse' }}>
            <View style={pdfStyles.statCard}>
              <Text style={[pdfStyles.statValue, { color: colors.primary }]}>{d.resource_estimate.bd_hours || 0}</Text>
              <Text style={pdfStyles.statLabel}>שעות BD</Text>
            </View>
            <View style={pdfStyles.statCard}>
              <Text style={[pdfStyles.statValue, { color: colors.primary }]}>{d.resource_estimate.tech_hours || 0}</Text>
              <Text style={pdfStyles.statLabel}>שעות טכניות</Text>
            </View>
            <View style={pdfStyles.statCard}>
              <Text style={[pdfStyles.statValue, { color: colors.success, fontSize: 14 }]}>
                {d.resource_estimate.estimated_cost?.toLocaleString('he-IL') || 0} ש"ח
              </Text>
              <Text style={pdfStyles.statLabel}>עלות משוערת</Text>
            </View>
          </View>
        </View>
      )}
    </Page>
  );
}

export function TenderReportPDF({ data }: { data: TenderReportData }) {
  return (
    <Document title={`דוח מכרז מקיף - ${data.tenderName}`} author="Tenderix" language="he">
      {/* 1. Cover */}
      <CoverPage data={data} />

      {/* 2. Executive Summary + Gates */}
      <ExecutiveSummaryPage data={data} />

      {/* 3. Risks / Actions / Resources */}
      <RisksActionsPage data={data} />

      {/* 4. BOQ Analysis */}
      {data.boq && (
        <Page size="A4" style={pdfStyles.page}>
          <BOQAnalysis data={data.boq} />
        </Page>
      )}

      {/* 5. SOW Analysis */}
      {data.sow && (
        <Page size="A4" style={pdfStyles.page}>
          <SOWAnalysis data={data.sow} />
        </Page>
      )}

      {/* 6. Clarifications */}
      {data.clarifications && (
        <Page size="A4" style={pdfStyles.page}>
          <ClarificationQuestions data={data.clarifications} />
        </Page>
      )}

      {/* 7. Strategic Questions */}
      {data.strategic && (
        <Page size="A4" style={pdfStyles.page}>
          <StrategicQuestions data={data.strategic} />
        </Page>
      )}

      {/* 8. Required Documents */}
      {data.requiredDocs && (
        <Page size="A4" style={pdfStyles.page}>
          <RequiredDocuments data={data.requiredDocs} />
        </Page>
      )}

      {/* 9. Competitors */}
      {data.competitorMapping && (
        <Page size="A4" style={pdfStyles.page}>
          <Text style={pdfStyles.sectionTitle}>מיפוי מתחרים</Text>
          {data.competitorMapping.market_analysis && (
            <View style={[pdfStyles.card, { marginBottom: 10 }]}>
              <Text style={pdfStyles.subTitle}>ניתוח שוק</Text>
              <Text style={pdfStyles.text}>{data.competitorMapping.market_analysis}</Text>
            </View>
          )}
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderCell, { width: '20%' }]}>מתחרה</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '15%' }]}>סבירות</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '15%' }]}>איום</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '25%' }]}>חוזקות</Text>
              <Text style={[pdfStyles.tableHeaderCell, { width: '25%' }]}>חולשות</Text>
            </View>
            {data.competitorMapping.competitors?.map((c, i) => (
              <View key={i} style={pdfStyles.tableRow}>
                <Text style={[pdfStyles.tableCell, { width: '20%', fontWeight: 500 }]}>{c.name}</Text>
                <Text style={[pdfStyles.tableCell, { width: '15%' }]}>{c.likelihood}</Text>
                <Text style={[pdfStyles.tableCell, { width: '15%', color: c.threat_level === 'HIGH' ? colors.danger : c.threat_level === 'MEDIUM' ? colors.warning : colors.success }]}>
                  {c.threat_level}
                </Text>
                <Text style={[pdfStyles.tableCell, { width: '25%', fontSize: 8 }]}>{c.strengths?.join(', ')}</Text>
                <Text style={[pdfStyles.tableCell, { width: '25%', fontSize: 8 }]}>{c.weaknesses?.join(', ')}</Text>
              </View>
            ))}
          </View>
        </Page>
      )}

      {/* 10. Pricing Intelligence */}
      {data.pricingIntel && (
        <Page size="A4" style={pdfStyles.page}>
          <PricingIntelligence data={data.pricingIntel} />
        </Page>
      )}

      {/* 11. Competitive Intelligence */}
      {data.competitiveIntel && (
        <Page size="A4" style={pdfStyles.page}>
          <CompetitiveIntelligence data={data.competitiveIntel} />
        </Page>
      )}
    </Document>
  );
}
