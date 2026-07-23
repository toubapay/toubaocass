import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { purchaseInsurance, quoteInsurance } from '../api/insurance';
import type { InsuranceCoverageType, InsuranceQuote } from '../api/types';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const COVERAGE_OPTIONS: InsuranceCoverageType[] = ['tiers_simple', 'tiers_collision', 'tous_risques'];

export function InsuranceComparePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const carId = Number(searchParams.get('carId'));
  const carLabel = searchParams.get('carLabel') ?? '';

  const [coverageType, setCoverageType] = useState<InsuranceCoverageType>('tiers_simple');
  const [quotes, setQuotes] = useState<InsuranceQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingIndex, setPurchasingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(() => {
    setLoading(true);
    setQuotes([]);
    setError(undefined);
    quoteInsurance(carId, coverageType)
      .then(setQuotes)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [carId, coverageType]);

  useEffect(load, [load]);

  const handlePurchase = async (quote: InsuranceQuote, index: number) => {
    if (
      !confirm(
        `${quote.provider_name} — ${quote.plan_name}\n${t('insurance.perYear', { amount: quote.annual_premium.toLocaleString() })}`,
      )
    )
      return;
    setPurchasingIndex(index);
    setError(undefined);
    try {
      await purchaseInsurance(carId, quote);
      navigate('/fleet/my-policies');
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setPurchasingIndex(null);
    }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: `${spacing.sm}px 0`,
    borderRadius: radius.md,
    border: `1px solid ${colors.border}`,
    backgroundColor: active ? colors.primary : colors.surface,
    color: active ? '#fff' : colors.text,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  });

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text, margin: 0 }}>{t('insurance.compareTitle')}</h1>
      <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: spacing.md }}>{carLabel}</p>

      <div style={{ display: 'flex', gap: spacing.xs, marginBottom: spacing.md }}>
        {COVERAGE_OPTIONS.map((option) => (
          <button key={option} onClick={() => setCoverageType(option)} style={tabStyle(coverageType === option)}>
            {t(`common.insuranceCoverage.${option}`)}
          </button>
        ))}
      </div>

      {error && <p style={{ fontSize: 14, color: colors.danger, marginBottom: spacing.sm }}>{error}</p>}

      {loading ? (
        <CenteredSpinner />
      ) : quotes.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: spacing.lg }}>{t('insurance.emptyQuotes')}</p>
      ) : (
        quotes.map((quote, index) => (
          <div
            key={`${quote.provider_id}-${index}`}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              padding: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            <p style={{ fontSize: 16, fontWeight: 700, color: colors.text, margin: 0 }}>{quote.provider_name}</p>
            <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{quote.plan_name}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: colors.primary, marginTop: spacing.sm }}>
              {t('insurance.perYear', { amount: quote.annual_premium.toLocaleString() })}
            </p>
            <p style={{ fontSize: 13, color: colors.textMuted }}>{t('insurance.perMonthApprox', { amount: quote.monthly_premium.toLocaleString() })}</p>
            {quote.highlights.map((highlight) => (
              <p key={highlight} style={{ fontSize: 13, color: colors.text, marginTop: 4 }}>
                • {highlight}
              </p>
            ))}
            <Button
              label={t('insurance.chooseOffer')}
              onClick={() => handlePurchase(quote, index)}
              loading={purchasingIndex === index}
              disabled={purchasingIndex !== null}
              style={{ marginTop: spacing.sm }}
            />
          </div>
        ))
      )}
    </div>
  );
}
