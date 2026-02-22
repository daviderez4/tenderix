import { View, Text } from '@react-pdf/renderer';
import type { RequiredDocsData } from '../types';
import { pdfStyles, colors } from '../styles';

export function RequiredDocuments({ data }: { data: RequiredDocsData }) {
  if (!data?.required_documents?.length) return null;

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>מסמכים נדרשים ({data.required_documents.length})</Text>

      <View style={pdfStyles.table}>
        <View style={pdfStyles.tableHeader}>
          <Text style={[pdfStyles.tableHeaderCell, { width: '5%' }]}>#</Text>
          <Text style={[pdfStyles.tableHeaderCell, { width: '22%' }]}>שם המסמך</Text>
          <Text style={[pdfStyles.tableHeaderCell, { width: '28%' }]}>תיאור</Text>
          <Text style={[pdfStyles.tableHeaderCell, { width: '15%' }]}>קטגוריה</Text>
          <Text style={[pdfStyles.tableHeaderCell, { width: '15%' }]}>מקור</Text>
          <Text style={[pdfStyles.tableHeaderCell, { width: '15%' }]}>זמן הכנה</Text>
        </View>
        {data.required_documents.map((doc, i) => (
          <View key={i} style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.tableCell, { width: '5%' }]}>{i + 1}</Text>
            <Text style={[pdfStyles.tableCell, { width: '22%', fontWeight: 500 }]}>{doc.document_name}</Text>
            <Text style={[pdfStyles.tableCell, { width: '28%' }]}>{doc.description}</Text>
            <Text style={[pdfStyles.tableCell, { width: '15%' }]}>
              <View style={[pdfStyles.badge as object, { backgroundColor: colors.gray200 }] as never}>
                <Text style={{ fontSize: 8, color: colors.gray700 }}>{doc.category}</Text>
              </View>
            </Text>
            <Text style={[pdfStyles.tableCell, { width: '15%' }]}>{doc.source}</Text>
            <Text style={[pdfStyles.tableCell, { width: '15%' }]}>{doc.prep_time}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
