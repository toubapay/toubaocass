import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { FinancialReportRange, MiniFinancialReport } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { CenteredSpinner } from './Spinner';

const RANGES: FinancialReportRange[] = ['week', 'month', 'year'];

function Bar({ label, amount, max }: { label: string; amount: number; max: number }) {
  const widthPct = max > 0 ? Math.max(4, Math.round((amount / max) * 100)) : 0;

  return (
    <div style={{ marginBottom: spacing.sm }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12.5, color: colors.textMuted }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: colors.text }}>{amount.toLocaleString()} F</span>
      </div>
      <div style={{ height: 6, backgroundColor: colors.background, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${widthPct}%`, backgroundColor: colors.primary, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/**
 * "Mini" financial report card embedded on a rider or driver's profile page
 * — rider-web passes fetchSpendingReport, driver-web passes
 * fetchEarningsReport, both mapped to the same MiniFinancialReport shape so
 * this one component covers both "Mes dépenses" and "Mes revenus".
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

  const cardStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    border: `1px solid ${colors.border}`,
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <p style={{ fontSize: 17, fontWeight: 700, color: colors.text, margin: 0 }}>{title}</p>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                border: 'none',
                borderRadius: radius.sm,
                padding: '4px 10px',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: range === r ? colors.primary : colors.background,
                color: range === r ? '#fff' : colors.textMuted,
              }}
            >
              {t(`financialReport.range.${r}`)}
            </button>
          ))}
        </div>
      </div>

      {loading || !report ? (
        <CenteredSpinner />
      ) : (
        <>
          <p style={{ fontSize: 13, color: colors.textMuted, margin: `0 0 ${spacing.xs}px` }}>{totalLabel}</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: colors.primary, margin: `0 0 ${spacing.md}px` }}>
            {report.total.toLocaleString()} FCFA
          </p>

          {report.by_period.length > 0 && (
            <div style={{ marginBottom: spacing.md }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', margin: `0 0 ${spacing.sm}px` }}>
                {t('financialReport.byPeriod')}
              </p>
              {report.by_period.map((row) => (
                <Bar key={row.label} label={row.label} amount={row.amount} max={Math.max(...report.by_period.map((r) => r.amount), 1)} />
              ))}
            </div>
          )}

          {report.by_service.some((s) => s.count > 0) && (
            <div style={{ marginBottom: report.by_vehicle ? spacing.md : 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', margin: `0 0 ${spacing.sm}px` }}>
                {t('financialReport.byService')}
              </p>
              {report.by_service
                .filter((s) => s.count > 0)
                .map((s) => (
                  <div key={s.service} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13.5 }}>
                    <span style={{ color: colors.text }}>
                      {s.label} <span style={{ color: colors.textMuted }}>({s.count})</span>
                    </span>
                    <span style={{ fontWeight: 700, color: colors.text }}>{s.amount.toLocaleString()} F</span>
                  </div>
                ))}
            </div>
          )}

          {report.by_vehicle && report.by_vehicle.some((v) => v.count > 0) && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', margin: `0 0 ${spacing.sm}px` }}>
                {t('financialReport.byVehicle')}
              </p>
              {report.by_vehicle
                .filter((v) => v.count > 0)
                .map((v) => (
                  <div key={v.car_id ?? 'none'} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13.5 }}>
                    <span style={{ color: colors.text }}>
                      {v.label} <span style={{ color: colors.textMuted }}>({v.count})</span>
                    </span>
                    <span style={{ fontWeight: 700, color: colors.text }}>{v.earnings.toLocaleString()} F</span>
                  </div>
                ))}
            </div>
          )}

          {report.items.length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', margin: `0 0 ${spacing.sm}px` }}>
                {t('financialReport.details')}
              </p>
              {report.items.map((item) => {
                const at = new Date(item.completed_at);
                const date = at.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                const time = at.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderTop: `1px solid ${colors.background}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 700, color: colors.text, margin: 0 }}>
                        {item.destination ? t('financialReport.itemWithDestination', { type: item.type_label, destination: item.destination }) : item.type_label}
                      </p>
                      <p style={{ fontSize: 12, color: colors.textMuted, margin: '2px 0 0' }}>
                        {item.counterparty_name
                          ? t('financialReport.itemMetaWithName', { name: item.counterparty_name, date, time })
                          : t('financialReport.itemMeta', { date, time })}
                      </p>
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: colors.text, whiteSpace: 'nowrap', marginLeft: spacing.sm }}>
                      {item.amount.toLocaleString()} F
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {report.items_count === 0 && (
            <p style={{ fontSize: 13.5, color: colors.textMuted, margin: 0 }}>{t('financialReport.empty')}</p>
          )}
        </>
      )}
    </div>
  );
}
