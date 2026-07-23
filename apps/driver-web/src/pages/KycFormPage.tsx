import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { submitKyc } from '../api/kyc';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

function DocumentPicker({ label, file, onPick }: { label: string; file: File | null; onPick: (f: File) => void }) {
  const { t } = useTranslation();
  const inputId = `doc-${label.replace(/\s+/g, '-')}`;
  return (
    <div style={{ marginBottom: spacing.md }}>
      <label htmlFor={inputId} style={{ display: 'block', fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: spacing.xs }}>
        {label}
      </label>
      <label
        htmlFor={inputId}
        style={{
          display: 'flex',
          height: 120,
          borderRadius: radius.md,
          border: `1px dashed ${colors.border}`,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {file ? (
          <img src={URL.createObjectURL(file)} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: colors.textMuted }}>{t('kyc.form.pickPlaceholder')}</span>
        )}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />
    </div>
  );
}

export function KycFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [licenseDocument, setLicenseDocument] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const canSubmit =
    licenseNumber.trim().length > 0 &&
    licenseExpiry.length > 0 &&
    nationalId.trim().length > 0 &&
    idDocument != null &&
    licenseDocument != null &&
    selfie != null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !idDocument || !licenseDocument || !selfie) return;

    setError(undefined);
    setLoading(true);
    try {
      const profile = await submitKyc({
        license_number: licenseNumber.trim(),
        license_expiry: licenseExpiry,
        national_id_number: nationalId.trim(),
        id_document: idDocument,
        license_document: licenseDocument,
        selfie,
      });
      if (user) setUser({ ...user, driver_profile: profile });
      navigate('/kyc');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('kyc.form.title')}</h1>

      <form onSubmit={handleSubmit}>
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
        <TextField label={t('kyc.form.nationalIdLabel')} type="number" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />

        <DocumentPicker label={t('kyc.form.idPhotoLabel')} file={idDocument} onPick={setIdDocument} />
        <DocumentPicker label={t('kyc.form.licensePhotoLabel')} file={licenseDocument} onPick={setLicenseDocument} />
        <DocumentPicker label={t('kyc.form.selfieLabel')} file={selfie} onPick={setSelfie} />

        {error && <p style={{ fontSize: 14, color: colors.danger, marginBottom: spacing.sm }}>{error}</p>}

        <Button label={t('kyc.form.submit')} type="submit" disabled={!canSubmit} loading={loading} />
      </form>
    </div>
  );
}
