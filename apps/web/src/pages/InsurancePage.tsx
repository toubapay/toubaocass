import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { purchaseVehicleInsurance, quoteVehicleInsurance, scanVehicleDocument } from '../api/insurance';
import type {
  InsuranceCoverageType,
  InsuranceQuote,
  ScannedVehicleInfo,
  VehicleAgeBracket,
  VehicleCategory,
  VehicleUsageType,
} from '../api/types';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { colors, radius, spacing } from '../theme';

type Step = 'landing' | 'type' | 'scan-front' | 'scan-back' | 'analyzing' | 'vehicle-info' | 'quotes';

const COVERAGE_OPTIONS: InsuranceCoverageType[] = ['tiers_simple', 'tiers_collision', 'tous_risques'];
const AGE_BRACKETS: VehicleAgeBracket[] = ['under_5', 'from_5_to_10', 'over_10'];

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  padding: spacing.md,
  marginBottom: spacing.md,
};

export function InsurancePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('landing');
  const [category, setCategory] = useState<VehicleCategory>('car');
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [powerCv, setPowerCv] = useState('');
  const [seats, setSeats] = useState('');
  const [ageBracket, setAgeBracket] = useState<VehicleAgeBracket>('under_5');
  const [usageType, setUsageType] = useState<VehicleUsageType>('personal');
  const [cartePaths, setCartePaths] = useState<{ front: string | null; back: string | null }>({ front: null, back: null });

  const [coverageType, setCoverageType] = useState<InsuranceCoverageType>('tiers_simple');
  const [quotes, setQuotes] = useState<InsuranceQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [purchasingIndex, setPurchasingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [purchasedPolicyNumber, setPurchasedPolicyNumber] = useState<string | null>(null);

  const applyScanResult = (info: ScannedVehicleInfo) => {
    setMake(info.make ?? '');
    setModel(info.model ?? '');
    setPlateNumber(info.plate_number ?? '');
    setPowerCv(info.power_cv != null ? String(info.power_cv) : '');
    setSeats(info.seats != null ? String(info.seats) : '');
    setAgeBracket(info.vehicle_age_bracket ?? 'under_5');
    setCartePaths({ front: info.carte_grise_front_path, back: info.carte_grise_back_path });
  };

  const runScan = (front: File, back: File | null) => {
    setStep('analyzing');
    setScanError(null);
    scanVehicleDocument(front, back)
      .then((info) => {
        applyScanResult(info);
        setStep('vehicle-info');
      })
      .catch((err) => {
        setScanError(extractErrorMessage(err));
        setStep('vehicle-info');
      });
  };

  const loadQuotes = (coverage: InsuranceCoverageType) => {
    setLoadingQuotes(true);
    setQuotes([]);
    quoteVehicleInsurance(
      {
        vehicle_category: category,
        vehicle_power_cv: powerCv ? Number(powerCv) : null,
        vehicle_seats: seats ? Number(seats) : null,
        vehicle_age_bracket: ageBracket,
        vehicle_usage_type: usageType,
      },
      coverage,
    )
      .then(setQuotes)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoadingQuotes(false));
  };

  const handleVehicleInfoNext = () => {
    setError(null);
    setStep('quotes');
    loadQuotes(coverageType);
  };

  const handleCoverageChange = (coverage: InsuranceCoverageType) => {
    setCoverageType(coverage);
    loadQuotes(coverage);
  };

  const handlePurchase = (quote: InsuranceQuote, index: number) => {
    if (!window.confirm(`${quote.provider_name} — ${quote.plan_name}\n${t('insurance.perYear', { amount: quote.annual_premium.toLocaleString() })}`)) return;

    setPurchasingIndex(index);
    setError(null);
    purchaseVehicleInsurance(
      {
        vehicle_category: category,
        make: make || null,
        model: model || null,
        plate_number: plateNumber || null,
        vehicle_power_cv: powerCv ? Number(powerCv) : null,
        vehicle_seats: seats ? Number(seats) : null,
        vehicle_age_bracket: ageBracket,
        vehicle_usage_type: usageType,
        carte_grise_front_path: cartePaths.front,
        carte_grise_back_path: cartePaths.back,
      },
      quote,
    )
      .then((policy) => setPurchasedPolicyNumber(policy.policy_number))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setPurchasingIndex(null));
  };

  const backButton = (onClick: () => void) => (
    <button
      onClick={onClick}
      style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.md }}
    >
      ←
    </button>
  );

  if (purchasedPolicyNumber) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.sm }}>{t('insurance.purchaseSuccessTitle')}</h1>
        <p style={{ fontSize: 15, color: colors.textMuted, marginBottom: spacing.lg }}>
          {t('insurance.policyNumber', { number: purchasedPolicyNumber })}
        </p>
        <Button label={t('insurance.myPoliciesTitle')} onClick={() => navigate('/insurance/my-policies')} />
      </div>
    );
  }

  if (step === 'landing') {
    return (
      <div>
        {backButton(() => navigate('/profile'))}
        <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
          <div style={{ fontSize: 64, marginBottom: spacing.md }}>🛡️</div>
          <h1 style={{ fontSize: 25, fontWeight: 800, color: colors.text, marginBottom: spacing.xs }}>{t('insurance.landingTitle')}</h1>
          <p style={{ fontSize: 15, color: colors.textMuted }}>{t('insurance.landingSubtitle')}</p>
        </div>
        <Button label={t('insurance.getQuote')} onClick={() => setStep('type')} />
      </div>
    );
  }

  if (step === 'type') {
    return (
      <div>
        {backButton(() => setStep('landing'))}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text, marginBottom: spacing.lg }}>{t('insurance.selectTypeTitle')}</h1>
        <div style={{ display: 'flex', gap: spacing.md }}>
          {(['car', 'motorcycle'] as VehicleCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c);
                setStep('scan-front');
              }}
              style={{
                flex: 1,
                border: `1.5px solid ${colors.border}`,
                borderRadius: radius.md,
                padding: spacing.lg,
                backgroundColor: colors.surface,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: spacing.sm }}>{c === 'car' ? '🚗' : '🏍️'}</div>
              <span style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{t(`insurance.vehicleCategory.${c}`)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'scan-front' || step === 'scan-back') {
    const isFront = step === 'scan-front';
    return (
      <div>
        {backButton(() => setStep(isFront ? 'type' : 'scan-front'))}
        <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: spacing.xs }}>
          {t(isFront ? 'insurance.scanFrontTitle' : 'insurance.scanBackTitle')}
        </h1>
        <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl }}>{t('insurance.scanHint')}</p>

        <div style={{ fontSize: 72, textAlign: 'center', marginBottom: spacing.xl }}>🪪</div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (isFront) {
              setFrontFile(file);
              setStep('scan-back');
            } else {
              runScan(frontFile as File, file);
            }
          }}
        />
        <div style={{ marginBottom: spacing.sm }}>
          <Button label={`📷 ${t('insurance.takePhoto')}`} onClick={() => fileInputRef.current?.click()} />
        </div>
        <Button
          label={t(isFront ? 'insurance.enterManually' : 'insurance.skipOldCard')}
          variant="outline"
          onClick={() => (isFront ? setStep('vehicle-info') : runScan(frontFile as File, null))}
        />
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('insurance.analyzingTitle')}</h1>
        <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl }}>{t('insurance.analyzingHint')}</p>
        <CenteredSpinner />
      </div>
    );
  }

  if (step === 'vehicle-info') {
    return (
      <div>
        {backButton(() => setStep('type'))}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text, marginBottom: spacing.lg }}>{t('insurance.vehicleInfoTitle')}</h1>

        {scanError && <p style={{ color: colors.danger, fontSize: 13.5, marginBottom: spacing.md }}>{scanError}</p>}

        <TextField label={t('insurance.make')} value={make} onChange={(e) => setMake(e.target.value)} />
        <TextField label={t('insurance.model')} value={model} onChange={(e) => setModel(e.target.value)} />
        <TextField label={t('insurance.plateNumber')} value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
        <TextField
          label={t('insurance.powerCv')}
          type="number"
          value={powerCv}
          onChange={(e) => setPowerCv(e.target.value)}
        />
        {category === 'car' && (
          <TextField label={t('insurance.seats')} type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
        )}

        <p style={{ fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>{t('insurance.vehicleAge')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {AGE_BRACKETS.map((bracket) => (
            <button
              key={bracket}
              onClick={() => setAgeBracket(bracket)}
              style={{
                border: `1.5px solid ${ageBracket === bracket ? colors.primary : colors.border}`,
                borderRadius: radius.md,
                padding: `${spacing.sm}px ${spacing.md}px`,
                backgroundColor: ageBracket === bracket ? colors.accentSoft : colors.surface,
                color: ageBracket === bracket ? colors.primary : colors.textMuted,
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              {t(`insurance.ageBracket.${bracket}`)}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>{t('insurance.vehicleUsage')}</p>
        <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xl }}>
          {(['personal', 'professional'] as VehicleUsageType[]).map((usage) => (
            <button
              key={usage}
              onClick={() => setUsageType(usage)}
              style={{
                flex: 1,
                border: `1.5px solid ${usageType === usage ? colors.primary : colors.border}`,
                borderRadius: radius.md,
                padding: spacing.sm,
                backgroundColor: usageType === usage ? colors.accentSoft : colors.surface,
                color: usageType === usage ? colors.primary : colors.textMuted,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {t(`insurance.usageType.${usage}`)}
            </button>
          ))}
        </div>

        <Button label={t('insurance.next')} onClick={handleVehicleInfoNext} />
      </div>
    );
  }

  // step === 'quotes'
  return (
    <div>
      {backButton(() => setStep('vehicle-info'))}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('insurance.compareTitle')}</h1>

      <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, marginBottom: spacing.lg }}>
        {COVERAGE_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => handleCoverageChange(option)}
            style={{
              flex: 1,
              border: 'none',
              borderBottom: `2.5px solid ${coverageType === option ? colors.primary : 'transparent'}`,
              padding: `${spacing.sm}px 0`,
              backgroundColor: 'transparent',
              color: coverageType === option ? colors.primary : colors.textMuted,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            {t(`insurance.coverage.${option}`)}
          </button>
        ))}
      </div>

      {error && <p style={{ color: colors.danger, fontSize: 14, marginBottom: spacing.md }}>{error}</p>}

      {loadingQuotes ? (
        <CenteredSpinner />
      ) : quotes.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: spacing.xl }}>{t('insurance.emptyQuotes')}</p>
      ) : (
        quotes.map((quote, index) => (
          <div key={`${quote.provider_id}-${index}`} style={cardStyle}>
            <p style={{ fontSize: 17, fontWeight: 700, color: colors.text, margin: 0 }}>{quote.provider_name}</p>
            <p style={{ fontSize: 14, color: colors.textMuted, margin: '2px 0 0' }}>{quote.plan_name}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: colors.primary, margin: `${spacing.sm}px 0 2px` }}>
              {t('insurance.perYear', { amount: quote.annual_premium.toLocaleString() })}
            </p>
            <p style={{ fontSize: 13, color: colors.textMuted, margin: '0 0 8px' }}>
              {t('insurance.perMonthApprox', { amount: quote.monthly_premium.toLocaleString() })}
            </p>
            <ul style={{ margin: '0 0 12px', paddingLeft: 18, color: colors.textMuted, fontSize: 13.5 }}>
              {quote.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <Button
              label={t('insurance.chooseOffer')}
              onClick={() => handlePurchase(quote, index)}
              loading={purchasingIndex === index}
              disabled={purchasingIndex !== null}
            />
          </div>
        ))
      )}
    </div>
  );
}
