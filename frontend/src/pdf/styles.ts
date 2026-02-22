import { StyleSheet, Font } from '@react-pdf/renderer';

// Register Heebo font for Hebrew RTL support
Font.register({
  family: 'Heebo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/heebo/v26/NGSpv5_NC0k9P_v6ZUCbLRAHxK1EiSysd0mm_00.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/heebo/v26/NGSpv5_NC0k9P_v6ZUCbLRAHxK1ECSysd0mm_00.ttf', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/heebo/v26/NGSpv5_NC0k9P_v6ZUCbLRAHxK1E5Susd0mm_00.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/heebo/v26/NGSpv5_NC0k9P_v6ZUCbLRAHxK1E3Cusd0mm_00.ttf', fontWeight: 700 },
  ],
});

export const colors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  success: '#10b981',
  successDark: '#059669',
  warning: '#f59e0b',
  warningDark: '#d97706',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  white: '#ffffff',
};

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Heebo',
    fontSize: 10,
    direction: 'rtl',
    color: colors.gray800,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 12,
    textAlign: 'right',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 6,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.gray700,
    marginBottom: 8,
    textAlign: 'right',
  },
  text: {
    fontSize: 10,
    lineHeight: 1.6,
    textAlign: 'right',
    color: colors.gray700,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 8,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: 2,
  },
  table: {
    width: '100%',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.gray100,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gray200,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: 9,
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 600,
    textAlign: 'right',
    color: colors.gray700,
    paddingHorizontal: 4,
  },
  badge: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    color: colors.white,
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row-reverse',
    marginBottom: 4,
    paddingRight: 8,
  },
  bullet: {
    fontSize: 10,
    marginLeft: 6,
    color: colors.gray500,
  },
  spacer: {
    height: 12,
  },
});
