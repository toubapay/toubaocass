import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { listKycQueue } from '../../api/kyc';
import type { KycProfile } from '../../api/types';
import { CenteredSpinner } from '../../components/Spinner';
import { colors, radius, spacing } from '../../theme';

export function KycQueuePage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<KycProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listKycQueue()
      .then((res) => setProfiles(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: colors.text, margin: `0 0 ${spacing.xs}px` }}>
        Vérification KYC
      </h1>
      <p style={{ fontSize: 14, color: colors.textMuted, margin: `0 0 ${spacing.lg}px` }}>
        Chauffeurs en attente d'examen manuel.
      </p>

      {loading ? (
        <CenteredSpinner />
      ) : (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}`, textAlign: 'left' }}>
                {['Chauffeur', 'Téléphone', 'N° de permis', 'Soumis le'].map((label) => (
                  <th key={label} style={{ padding: spacing.sm, fontSize: 12, color: colors.textMuted, fontWeight: 700 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr
                  key={profile.id}
                  onClick={() => navigate(`/kyc/${profile.id}`)}
                  style={{ borderBottom: `1px solid ${colors.border}`, cursor: 'pointer' }}
                >
                  <td style={{ padding: spacing.sm, fontSize: 14, fontWeight: 600, color: colors.text }}>
                    {profile.driver_name ?? '—'}
                  </td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{profile.driver_phone}</td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.text }}>{profile.license_number ?? '—'}</td>
                  <td style={{ padding: spacing.sm, fontSize: 14, color: colors.textMuted }}>
                    {new Date(profile.updated_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: spacing.lg, textAlign: 'center', color: colors.textMuted }}>
                    Aucune vérification en attente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
