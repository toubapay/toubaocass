import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { extractErrorMessage } from '../../api/client';
import { approveKyc, fetchKycDocumentUrl, fetchKycProfile, rejectKyc } from '../../api/kyc';
import type { KycDocumentField, KycProfile } from '../../api/types';
import { Button } from '../../components/Button';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

const DOCUMENT_LABELS: Record<KycDocumentField, string> = {
  id_document: "Pièce d'identité",
  license_document: 'Permis de conduire',
  selfie: 'Selfie',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  submitted: 'Soumis',
  approved: 'Approuvé',
  rejected: 'Rejeté',
};

function DocumentPreview({ profileId, field, available }: { profileId: number; field: KycDocumentField; available: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!available) return;
    let objectUrl: string | null = null;
    fetchKycDocumentUrl(profileId, field)
      .then((u) => {
        objectUrl = u;
        setUrl(u);
      })
      .catch(() => setError(true));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profileId, field, available]);

  return (
    <div style={{ flex: 1, minWidth: 160 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, margin: `0 0 ${spacing.xs}px` }}>
        {DOCUMENT_LABELS[field]}
      </p>
      <div
        style={{
          height: 140,
          borderRadius: radius.sm,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {!available ? (
          <span style={{ fontSize: 13, color: colors.textMuted }}>Non fourni</span>
        ) : error ? (
          <span style={{ fontSize: 13, color: colors.danger }}>Erreur de chargement</span>
        ) : url ? (
          <img src={url} alt={DOCUMENT_LABELS[field]} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: 13, color: colors.textMuted }}>Chargement…</span>
        )}
      </div>
    </div>
  );
}

export function KycReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<KycProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetchKycProfile(Number(id))
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async () => {
    if (!profile) return;
    setActionLoading(true);
    setError(undefined);
    try {
      setProfile(await approveKyc(profile.id));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!profile) return;
    const reason = reasonRef.current?.value.trim();
    if (!reason) return;
    setActionLoading(true);
    setError(undefined);
    try {
      setProfile(await rejectKyc(profile.id, reason));
      setShowRejectForm(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !profile) {
    return <CenteredSpinner />;
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <button
        onClick={() => navigate('/kyc')}
        style={{ border: 'none', background: 'none', color: colors.accent, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: spacing.md }}
      >
        ← Retour à la file KYC
      </button>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: colors.text, margin: 0 }}>{profile.driver_name ?? 'Chauffeur'}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: colors.textMuted }}>{profile.driver_phone}</p>
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: radius.lg,
              color: profile.kyc_status === 'approved' ? colors.success : profile.kyc_status === 'rejected' ? colors.danger : colors.accent,
              backgroundColor: profile.kyc_status === 'approved' ? colors.successSoft : profile.kyc_status === 'rejected' ? colors.dangerSoft : colors.accentSoft,
            }}
          >
            {STATUS_LABELS[profile.kyc_status] ?? profile.kyc_status}
          </span>
        </div>

        <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md, margin: `0 0 ${spacing.lg}px` }}>
          <div>
            <dt style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>N° de permis</dt>
            <dd style={{ margin: '2px 0 0', fontSize: 14, color: colors.text }}>{profile.license_number ?? '—'}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>Expiration du permis</dt>
            <dd style={{ margin: '2px 0 0', fontSize: 14, color: colors.text }}>
              {profile.license_expiry ? new Date(profile.license_expiry).toLocaleDateString('fr-FR') : '—'}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>N° de pièce d'identité</dt>
            <dd style={{ margin: '2px 0 0', fontSize: 14, color: colors.text }}>{profile.national_id_number ?? '—'}</dd>
          </div>
          {profile.kyc_rejection_reason && (
            <div>
              <dt style={{ fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>Motif du rejet</dt>
              <dd style={{ margin: '2px 0 0', fontSize: 14, color: colors.danger }}>{profile.kyc_rejection_reason}</dd>
            </div>
          )}
        </dl>

        <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
          <DocumentPreview profileId={profile.id} field="id_document" available={profile.documents.id_document} />
          <DocumentPreview profileId={profile.id} field="license_document" available={profile.documents.license_document} />
          <DocumentPreview profileId={profile.id} field="selfie" available={profile.documents.selfie} />
        </div>
      </div>

      {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</p>}

      {profile.kyc_status === 'submitted' && (
        <div>
          {!showRejectForm ? (
            <div style={{ display: 'flex', gap: spacing.sm }}>
              <Button label="Approuver" onClick={handleApprove} loading={actionLoading} />
              <Button label="Rejeter" variant="danger" onClick={() => setShowRejectForm(true)} disabled={actionLoading} />
            </div>
          ) : (
            <div style={{ maxWidth: 420 }}>
              <textarea
                ref={reasonRef}
                placeholder="Motif du rejet…"
                rows={3}
                style={{
                  width: '100%',
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.sm,
                  padding: spacing.sm,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  marginBottom: spacing.sm,
                }}
              />
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <Button label="Confirmer le rejet" variant="danger" onClick={handleReject} loading={actionLoading} />
                <Button label="Annuler" variant="outline" onClick={() => setShowRejectForm(false)} disabled={actionLoading} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
