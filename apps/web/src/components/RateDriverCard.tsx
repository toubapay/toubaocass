import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { colors, radius, spacing } from '../theme';

interface Props {
  onSubmit: (score: number, comment?: string) => Promise<void>;
}

/**
 * Shown once a trip/delivery reaches its terminal success status
 * (completed/delivered) so the rider can leave a 1-5 star review of the
 * driver. Submitting is an upsert on the backend, so re-opening this after
 * already rating just edits the existing review — no "already rated" state
 * to track here.
 */
export function RateDriverCard({ onSubmit }: Props) {
  const { t } = useTranslation();
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    border: `1px solid ${colors.border}`,
  };

  if (submitted) {
    return (
      <div style={cardStyle}>
        <p style={{ fontSize: 15, fontWeight: 700, color: colors.success, margin: 0 }}>{t('rating.thanks')}</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (score === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(score, comment.trim() || undefined);
      setSubmitted(true);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const displayScore = hoverScore || score;

  return (
    <div style={cardStyle}>
      <p style={{ fontSize: 15, fontWeight: 700, color: colors.text, margin: `0 0 ${spacing.sm}px` }}>{t('rating.prompt')}</p>
      <div style={{ display: 'flex', gap: 4, marginBottom: spacing.sm }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            onMouseEnter={() => setHoverScore(n)}
            onMouseLeave={() => setHoverScore(0)}
            aria-label={t('rating.starLabel', { count: n })}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: 30, lineHeight: 1 }}
          >
            <span style={{ color: n <= displayScore ? colors.primary : colors.border }}>★</span>
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('rating.commentPlaceholder') as string}
        rows={2}
        maxLength={500}
        style={{
          width: '100%',
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          padding: spacing.sm,
          fontSize: 14,
          fontFamily: 'inherit',
          resize: 'vertical',
          marginBottom: spacing.sm,
          boxSizing: 'border-box',
        }}
      />
      {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={score === 0 || submitting}
        style={{
          width: '100%',
          border: 'none',
          borderRadius: radius.sm,
          padding: `${spacing.sm}px 0`,
          backgroundColor: colors.primary,
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          cursor: score === 0 || submitting ? 'default' : 'pointer',
          opacity: score === 0 || submitting ? 0.5 : 1,
        }}
      >
        {submitting ? '…' : t('rating.submit')}
      </button>
    </div>
  );
}
