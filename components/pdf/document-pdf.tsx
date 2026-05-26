import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { formatCurrency, formatDate } from '@/lib/currency';

const COLORS = {
  primaryDark: '#2C5282',
  primaryMedium: '#4A7BB7',
  positiveGreen: '#38A169',
  negativeRed: '#C53030',
  textPrimary: '#1A202C',
  textMuted: '#718096',
  borderLight: '#E2E8F0',
  rowAlt: '#F7FAFC',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  logo: { width: 120, height: 'auto' },
  businessName: { fontSize: 14, fontWeight: 'bold', color: COLORS.primaryDark },
  docLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    textAlign: 'right',
  },
  docMeta: { fontSize: 10, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },
  fromToRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  box: { flex: 1, padding: 12, backgroundColor: COLORS.rowAlt, borderRadius: 4 },
  boxLabel: {
    fontSize: 9,
    color: COLORS.primaryMedium,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  boxName: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  boxText: { fontSize: 10, lineHeight: 1.4, color: COLORS.textPrimary },
  itemsTable: { marginBottom: 16 },
  itemsHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryDark,
    color: COLORS.white,
    padding: 8,
    fontWeight: 'bold',
    fontSize: 10,
  },
  itemRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  itemRowAlt: { backgroundColor: COLORS.rowAlt },
  colQty: { width: '12%' },
  colService: { width: '52%' },
  colRate: { width: '18%', textAlign: 'right' },
  colAmount: { width: '18%', textAlign: 'right' },
  serviceTitle: { fontWeight: 'bold', fontSize: 10 },
  serviceDesc: { color: COLORS.textMuted, fontSize: 9, marginTop: 2 },
  bottomRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  paymentBox: { flex: 1.4, padding: 12, backgroundColor: COLORS.rowAlt, borderRadius: 4 },
  totalsBox: { flex: 1 },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 4,
    fontSize: 10,
  },
  totalLineLabel: { color: COLORS.textMuted },
  totalLineValue: { fontWeight: 'bold' },
  totalDueLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: COLORS.primaryDark,
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 4,
  },
  termsBox: { marginTop: 20, padding: 12, fontSize: 9, color: COLORS.textMuted },
  termsLabel: { fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  footer: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 8,
    color: COLORS.textMuted,
  },
  watermark: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 80,
    opacity: 0.12,
    fontWeight: 'bold',
    transform: 'rotate(-20deg)',
  },
});

interface PdfProps {
  kind: 'quote' | 'invoice';
  dto: any;
}

export function DocumentPdf({ kind, dto }: PdfProps) {
  const isQuote = kind === 'quote';
  const showPaidWatermark = !isQuote && dto.status === 'PAID';
  const showAcceptedWatermark = isQuote && (dto.status === 'ACCEPTED' || dto.status === 'CONVERTED');
  const showDeclinedWatermark = isQuote && dto.status === 'DECLINED';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermarks */}
        {showPaidWatermark && (
          <Text style={[styles.watermark, { color: COLORS.positiveGreen }]} fixed>PAID</Text>
        )}
        {showAcceptedWatermark && (
          <Text style={[styles.watermark, { color: COLORS.positiveGreen }]} fixed>ACCEPTED</Text>
        )}
        {showDeclinedWatermark && (
          <Text style={[styles.watermark, { color: COLORS.negativeRed }]} fixed>DECLINED</Text>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            {dto.business.logoUrl ? (
              <Image src={dto.business.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.businessName}>{dto.business.name}</Text>
            )}
          </View>
          <View>
            <Text style={styles.docLabel}>{isQuote ? 'QUOTE' : 'INVOICE'}</Text>
            <Text style={styles.docMeta}>
              {dto.number}{'\n'}
              Created: {formatDate(dto.createdDate)}{'\n'}
              {isQuote ? `Valid Until: ${formatDate(dto.validUntil)}` : `Due: ${formatDate(dto.dueDate)}`}
            </Text>
          </View>
        </View>

        {/* From / To */}
        <View style={styles.fromToRow}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>From</Text>
            <Text style={styles.boxName}>{dto.business.name}</Text>
            <Text style={styles.boxText}>{stripHtml(dto.business.address)}</Text>
            <Text style={styles.boxText}>{stripHtml(dto.business.extraInfo)}</Text>
            {dto.business.website ? <Text style={styles.boxText}>{dto.business.website}</Text> : null}
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>To</Text>
            <Text style={styles.boxName}>{dto.client.businessName}</Text>
            {(dto.client.firstName || dto.client.lastName) && (
              <Text style={styles.boxText}>
                {[dto.client.firstName, dto.client.lastName].filter(Boolean).join(' ')}
              </Text>
            )}
            <Text style={styles.boxText}>{dto.client.email}</Text>
            {dto.client.address ? <Text style={styles.boxText}>{stripHtml(dto.client.address)}</Text> : null}
            {dto.client.extraInfo ? <Text style={styles.boxText}>{stripHtml(dto.client.extraInfo)}</Text> : null}
          </View>
        </View>

        {/* Title & description */}
        {dto.title ? (
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>{dto.title}</Text>
        ) : null}
        {dto.description ? (
          <Text style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 12 }}>
            {stripHtml(dto.description)}
          </Text>
        ) : null}

        {/* Line items table */}
        <View style={styles.itemsTable}>
          <View style={styles.itemsHeader}>
            <Text style={styles.colQty}>{dto.labels.hrsQtyLabel}</Text>
            <Text style={styles.colService}>{dto.labels.serviceLabel}</Text>
            <Text style={styles.colRate}>{dto.labels.ratePriceLabel}</Text>
            <Text style={styles.colAmount}>{dto.labels.subTotalLabel}</Text>
          </View>
          {dto.lineItems.map((li: any, idx: number) => (
            <View key={idx} style={[styles.itemRow, idx % 2 === 0 ? styles.itemRowAlt : {}]}>
              <Text style={styles.colQty}>{li.qty}</Text>
              <View style={styles.colService}>
                <Text style={styles.serviceTitle}>{li.title}</Text>
                {li.description ? <Text style={styles.serviceDesc}>{li.description}</Text> : null}
              </View>
              <Text style={styles.colRate}>{formatCurrency(li.rate)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(li.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Payment Info + Totals */}
        <View style={styles.bottomRow}>
          <View style={styles.paymentBox}>
            <Text style={styles.boxLabel}>Payment Methods</Text>
            <Text style={styles.boxText}>{stripHtml(dto.paymentInfo)}</Text>
          </View>
          <View style={styles.totalsBox}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLineLabel}>{dto.labels.subTotalLabel}</Text>
              <Text style={styles.totalLineValue}>{formatCurrency(dto.subtotal)}</Text>
            </View>
            {dto.discount > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLineLabel}>{dto.labels.discountLabel}</Text>
                <Text style={styles.totalLineValue}>− {formatCurrency(dto.discount)}</Text>
              </View>
            )}
            {dto.taxAmount > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLineLabel}>{dto.taxName}</Text>
                <Text style={styles.totalLineValue}>{formatCurrency(dto.taxAmount)}</Text>
              </View>
            )}
            {!isQuote && dto.paid > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLineLabel}>Paid</Text>
                <Text style={styles.totalLineValue}>− {formatCurrency(dto.paid)}</Text>
              </View>
            )}
            <View style={styles.totalDueLine}>
              <Text>{isQuote ? dto.labels.totalLabel : dto.labels.totalDueLabel}</Text>
              <Text>{formatCurrency(isQuote ? dto.total : dto.totalDue)}</Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        {dto.terms ? (
          <View style={styles.termsBox}>
            <Text style={styles.termsLabel}>Terms & Conditions</Text>
            <Text>{stripHtml(dto.terms)}</Text>
          </View>
        ) : null}

        {/* Footer */}
        {dto.footer ? (
          <Text style={styles.footer}>{stripHtml(dto.footer)}</Text>
        ) : null}
      </Page>
    </Document>
  );
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}
