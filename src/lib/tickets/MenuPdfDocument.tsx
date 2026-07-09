import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Font, Image
} from '@react-pdf/renderer';

// Register elegant fonts
Font.register({
  family: 'Georgia',
  src: 'https://fonts.gstatic.com/s/georgia/v14/uU9eCBsR6Z2vfE9aq3bpd3Y.woff2',
});

const palette = {
  primary: '#283983',
  dark: '#1a1a1a',
  gold: '#E8C042',
  light: '#F9F3E4',
  muted: '#6b6b6b',
  white: '#ffffff',
  green: '#22c55e'
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: palette.light,
    padding: 0,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: palette.primary,
    padding: '40 40 30 40',
    flexDirection: 'column',
    alignItems: 'center',
    borderBottom: '4 solid #E8C042',
  },
  headerTitle: {
    color: palette.white,
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headerSubtitle: {
    color: palette.gold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    padding: '30 40',
    flexDirection: 'column',
    gap: 15,
  },
  tappaCard: {
    backgroundColor: palette.white,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 10,
    border: `1 solid #e5ddd4`,
  },
  tappaStripe: {
    width: 6,
    backgroundColor: palette.primary,
  },
  tappaContent: {
    flex: 1,
    padding: '12 16',
    flexDirection: 'column',
  },
  tappaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  tappaId: {
    fontSize: 10,
    color: palette.primary,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#eef2ff',
    padding: '2 6',
    borderRadius: 4,
  },
  tappaTitle: {
    fontSize: 16,
    color: palette.dark,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
  tappaDescription: {
    fontSize: 10,
    color: palette.muted,
    lineHeight: 1.4,
    marginTop: 4,
    marginBottom: 8,
  },
  tappaMetaRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 4,
  },
  tappaMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tappaMetaText: {
    fontSize: 9,
    color: palette.dark,
  },
  tappaMetaLabel: {
    fontSize: 8,
    color: palette.muted,
    textTransform: 'uppercase',
  },
  allergensBox: {
    marginTop: 8,
    padding: '6 8',
    backgroundColor: '#fff0f0',
    borderRadius: 4,
  },
  allergensText: {
    fontSize: 8,
    color: '#ef4444',
  }
});

function stripMarkdown(text: string) {
  if (!text) return '';
  return text.replace(/\*\*/g, '').replace(/\*/g, '');
}

export const MenuPdfDocument = ({ tappe }: { tappe: any[] }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assaggia & Passeggia</Text>
        <Text style={styles.headerSubtitle}>Il Menù Degustazione</Text>
      </View>
      <View style={styles.body}>
        {tappe.map((tappa, index) => (
          <View key={tappa.id || index} style={styles.tappaCard}>
            <View style={[styles.tappaStripe, { backgroundColor: palette.primary }]} />
            <View style={styles.tappaContent}>
              <View style={styles.tappaHeader}>
                <Text style={styles.tappaId}>Tappa {index + 1}</Text>
                <Text style={styles.tappaMetaText}>{tappa.location}</Text>
              </View>
              <Text style={styles.tappaTitle}>{stripMarkdown(tappa.title)}</Text>
              <Text style={styles.tappaDescription}>{stripMarkdown(tappa.description)}</Text>
              
              <View style={styles.tappaMetaRow}>
                <View style={styles.tappaMetaItem}>
                  <Text style={styles.tappaMetaLabel}>Cantina:</Text>
                  <Text style={styles.tappaMetaText}>{stripMarkdown(tappa.wineryName)}</Text>
                </View>
                <View style={styles.tappaMetaItem}>
                  <Text style={styles.tappaMetaLabel}>Vino:</Text>
                  <Text style={styles.tappaMetaText}>{stripMarkdown(tappa.wineName)}</Text>
                </View>
              </View>

              {tappa.allergens && (
                <View style={styles.allergensBox}>
                  <Text style={styles.allergensText}>Allergeni: {stripMarkdown(tappa.allergens)}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);
