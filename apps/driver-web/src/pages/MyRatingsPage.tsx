import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchMyRatings, type DriverRating } from '../api/ratings';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const RATEABLE_TYPE_LABEL_KEY: Record<DriverRating['rateable_type'], string> = {
  trip: 'ratings.rateableType.trip',
  dem_legui_trip: 'ratings.rateableType.demLegui',
  delivery: 'ratings.rateableType.delivery',
};

function Stars({ score }: { score: number }) {
  return (
    <span style={{ color: colors.primary, fontSize: 15, letterSpacing: 1 }}>
      {'★'.repeat(score)}
      <span style={{ color: colors.border }}>{'★'.repeat(5 - score)}</span>
    </span>
  );
}

export function MyRatingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<DriverRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyRatings()
      .then((res) => setRatings(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('ratings.myReviewsTitle')}</h1>

      {ratings.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 16, textAlign: 'center', margin: `${spacing.lg}px 0` }}>
          {t('ratings.noReviewsYet')}
        </p>
      ) : (
        ratings.map((rating) => (
          <div
            key={rating.id}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.sm,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <Stars score={rating.score} />
              <span style={{ fontSize: 12, color: colors.textMuted }}>
                {new Date(rating.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, margin: `${spacing.xs}px 0 0` }}>
              {rating.rater_name ?? t('ratings.anonymousRider')} · {t(RATEABLE_TYPE_LABEL_KEY[rating.rateable_type])}
            </p>
            {rating.comment && (
              <p style={{ fontSize: 14.5, color: colors.text, margin: `${spacing.xs}px 0 0` }}>{rating.comment}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
