import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { scanLicense, submitKyc } from '../api/kyc';
import { Button } from '../components/Button';
import { CenteredSpinner } from '../components/Spinner';
import { TextField } from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

type Step = 'scan' | 'analyzing' | 'confirm';

export function KycFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('scan');
  const [scanError, setScanError] = useState<string | undefined>();
  const [licenseDocumentPath, setLicenseDocumentPath] = useState<string | null>(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const runScan = (file: File) => {
    setStep('analyzing');
    setScanError(undefined);
    scanLicense(file)
      .then((info) => {
        setLicenseDocumentPath(info.license_document_path);
        setLicenseNumber(info.license_number ?? '');
        setLicenseExpiry(info.license_expiry ?? '');
        setStep('confirm');
      })
      .catch((err) => {
        setScanError(extractErrorMessage(err));
        setStep('scan');
      });
  };

  const canSubmit = licenseNumber.trim().length > 0 && licenseExpiry.length > 0 && licenseDocumentPath != null;

  const handleSubmit = async () => {
    if (!canSubmit || !licenseDocumentPath) return;

    setError(undefined);
    setLoading(true);
    try {
      const profile = await submitKyc({
        license_number: licenseNumber.trim(),
        license_expiry: licenseExpiry,
        license_document_path: licenseDocumentPath,
      });
      if (user) setUser({ ...user, driver_profile: profile });
      navigate('/kyc');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const backButton = (onClick: () => void) => (
    <button
      onClick={onClick}
      style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.md }}
    >
      ←
    </button>
  );

  if (step === 'analyzing') {
    return (
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('kyc.form.analyzingTitle')}</h1>
        <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl }}>{t('kyc.form.analyzingHint')}</p>
        <CenteredSpinner />
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div>
        {backButton(() => setStep('scan'))}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('kyc.form.title')}</h1>

        <TextField label={t('kyc.form.licenseNumberLabel')} value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
        <div style={{ marginBottom: spacing.md }}>
          <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
            {t('kyc.form.licenseExpiryLabel')}
          </label>
          <input
            type="date"
            value={licenseExpiry}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setLicenseExpiry(e.target.value)}
            style={{
              width: '100%',
              height: 46,
              boxSizing: 'border-box',
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              padding: '0 10px',
              fontSize: 15,
              color: colors.text,
              backgroundColor: colors.surface,
            }}
          />
        </div>

        {error && <p style={{ fontSize: 14, color: colors.danger, marginBottom: spacing.sm }}>{error}</p>}

        <Button label={t('kyc.form.submit')} onClick={handleSubmit} disabled={!canSubmit} loading={loading} />
      </div>
    );
  }

  // step === 'scan'
  return (
    <div>
      {backButton(() => navigate(-1))}
      <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: spacing.xs }}>{t('kyc.form.title')}</h1>
      <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl }}>{t('kyc.form.scanHint')}</p>

      <div style={{ fontSize: 72, textAlign: 'center', marginBottom: spacing.xl }}>🪪</div>

      {scanError && <p style={{ color: colors.danger, fontSize: 13.5, marginBottom: spacing.md }}>{scanError}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) runScan(file);
        }}
      />
      <Button label={`📷 ${t('kyc.form.takePhoto')}`} onClick={() => fileInputRef.current?.click()} />
    </div>
  );
}
