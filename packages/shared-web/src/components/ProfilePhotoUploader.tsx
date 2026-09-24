import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { colors, spacing } from '../theme';
import { Spinner } from './Spinner';

/**
 * Circular avatar + change/remove controls, shown at the top of a rider's
 * or driver's own profile page. Falls back to the first letter of their
 * name when no photo is set yet, same as most rideshare apps. `onUpload`/
 * `onRemove` are handed the app's own auth API calls (rider-web and
 * driver-web each have their own `/profile/photo` client, not a shared
 * one) and are expected to return the updated User so the caller can push
 * it into its AuthContext.
 */
export function ProfilePhotoUploader({
  photoUrl,
  name,
  onUpload,
  onRemove,
}: {
  photoUrl: string | null;
  name: string | null;
  onUpload: (file: File) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = (name ?? '').trim().charAt(0).toUpperCase() || '?';

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      await onUpload(file);
    } catch {
      setError(t('profile.photoUploadError'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      await onRemove();
    } catch {
      setError(t('profile.photoUploadError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: spacing.sm }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: colors.accentSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {busy ? (
            <Spinner size={24} />
          ) : photoUrl ? (
            <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 24, fontWeight: 700, color: colors.primary }}>{initial}</span>
          )}
        </div>
        <div>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              color: colors.primary,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: busy ? 'default' : 'pointer',
              display: 'block',
            }}
          >
            {t('profile.changePhoto')}
          </button>
          {photoUrl && (
            <button
              onClick={handleRemove}
              disabled={busy}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                marginTop: 4,
                color: colors.danger,
                fontSize: 13,
                fontWeight: 600,
                cursor: busy ? 'default' : 'pointer',
                display: 'block',
              }}
            >
              {t('profile.removePhoto')}
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      </div>
      {error && <p style={{ fontSize: 12.5, color: colors.danger, margin: `${spacing.xs}px 0 0` }}>{error}</p>}
    </div>
  );
}
