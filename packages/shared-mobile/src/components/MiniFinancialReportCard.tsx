import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { FinancialReportRange, MiniFinancialReport } from '../api/types';
import { colors, radius, spacing } from '../theme';

const RANGES: FinancialReportRange[] = ['week', 'month', 'year'];

function Bar({ label, amount, max }: { label: string; amount: number; max: number }) {
  const widthPct = max > 0 ? Math.max(4, Math.round((amount / max) * 100)) : 0;

  return (
    <View style={styles.barRow}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barAmount}>{amount.toLocaleString()} F</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${widthPct}%` }]} />
      </View>
    </View>
  );
}

/**
 * "Mini" financial report card embedded on a rider's or driver's own
 * profile screen — rider passes fetchSpendingReport, driver passes
 * fetchEarningsReport, both mapped to the same MiniFinancialReport shape,
 * mirroring the web version of this component so both platforms show the
 * same breakdown (total, by period, by service, by vehicle for drivers)
 * plus a per-trip itemized list with date, time, amount, and who the
 * other party was.
 */
export function MiniFinancialReportCard({
  title,
  totalLabel,
  fetchReport,
}: {
  title: string;
  totalLabel: string;
  fetchReport: (range: FinancialReportRange) => Promise<MiniFinancialReport>;
}) {
  const { t } = useTranslation();
  const [range, setRange] = useState<FinancialReportRange>('month');
  const [report, setReport] = useState<MiniFinancialReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchReport(range)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [range, fetchReport]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <Pressable key={r} onPress={() => setRange(r)} style={[styles.rangeButton, range === r && styles.rangeButtonActive]}>
              <Text style={[styles.rangeButtonText, range === r && styles.rangeButtonTextActive]}>
                {t(`financialReport.range.${r}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading || !report ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : (
        <>
          <Text style={styles.totalLabel}>{totalLabel}</Text>
          <Text style={styles.totalValue}>{report.total.toLocaleString()} FCFA</Text>

          {report.by_period.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('financialReport.byPeriod')}</Text>
              {report.by_period.map((row) => (
                <Bar key={row.label} label={row.label} amount={row.amount} max={Math.max(...report.by_period.map((r) => r.amount), 1)} />
              ))}
            </View>
          )}

          {report.by_service.some((s) => s.count > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('financialReport.byService')}</Text>
              {report.by_service
                .filter((s) => s.count > 0)
                .map((s) => (
                  <View key={s.service} style={styles.rowBetween}>
                    <Text style={styles.rowLabel}>
                      {s.label} <Text style={styles.rowMuted}>({s.count})</Text>
                    </Text>
                    <Text style={styles.rowAmount}>{s.amount.toLocaleString()} F</Text>
                  </View>
                ))}
            </View>
          )}

          {report.by_vehicle && report.by_vehicle.some((v) => v.count > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('financialReport.byVehicle')}</Text>
              {report.by_vehicle
                .filter((v) => v.count > 0)
                .map((v) => (
                  <View key={v.car_id ?? 'none'} style={styles.rowBetween}>
                    <Text style={styles.rowLabel}>
                      {v.label} <Text style={styles.rowMuted}>({v.count})</Text>
                    </Text>
                    <Text style={styles.rowAmount}>{v.earnings.toLocaleString()} F</Text>
                  </View>
                ))}
            </View>
          )}

          {report.items.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('financialReport.details')}</Text>
              {report.items.map((item) => {
                const at = new Date(item.completed_at);
                const date = at.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                const time = at.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemText}>
                      <Text style={styles.itemTitle}>
                        {item.destination
                          ? t('financialReport.itemWithDestination', { type: item.type_label, destination: item.destination })
                          : item.type_label}
                      </Text>
                      <Text style={styles.itemMeta}>
                        {item.counterparty_name
                          ? t('financialReport.itemMetaWithName', { name: item.counterparty_name, date, time })
                          : t('financialReport.itemMeta', { date, time })}
                      </Text>
                    </View>
                    <Text style={styles.itemAmount}>{item.amount.toLocaleString()} F</Text>
                  </View>
                );
              })}
            </View>
          )}

          {report.items_count === 0 && <Text style={styles.empty}>{t('financialReport.empty')}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  rangeRow: { flexDirection: 'row', gap: 4 },
  rangeButton: { borderRadius: radius.sm, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: colors.background },
  rangeButtonActive: { backgroundColor: colors.primary },
  rangeButtonText: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted },
  rangeButtonTextActive: { color: '#fff' },
  spinner: { paddingVertical: spacing.lg },
  totalLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  totalValue: { fontSize: 26, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm },
  barRow: { marginBottom: spacing.sm },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  barLabel: { fontSize: 12.5, color: colors.textMuted },
  barAmount: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  barTrack: { height: 6, backgroundColor: colors.background, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 999 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 13.5, color: colors.text },
  rowMuted: { color: colors.textMuted },
  rowAmount: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  itemText: { flex: 1, marginRight: spacing.sm },
  itemTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemAmount: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  empty: { fontSize: 13.5, color: colors.textMuted },
});
