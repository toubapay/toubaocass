import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { fetchInbox } from '../api/inbox';
import type { InboxThread } from '../api/types';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const TYPE_ICON: Record<InboxThread['type'], string> = {
  booking: '🚌',
  dem_legui_request: '🚕',
  anando: '🚗',
  delivery: '📦',
};

interface InboxPageProps {
  /** Resolves a thread to its chat route — differs per app/thread type. */
  chatUrl: (thread: InboxThread) => string;
}

/**
 * Every conversation the user is part of, across every ride/delivery type,
 * most recent first — the "browse everything" counterpart to ChatFab's
 * "jump to the one most relevant conversation".
 */
export function InboxPage({ chatUrl }: InboxPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInbox()
      .then((res) => setThreads(res.data))
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
      <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('inbox.title')}</h1>

      {threads.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: 15, textAlign: 'center', margin: `${spacing.lg}px 0` }}>{t('inbox.empty')}</p>
      ) : (
        threads.map((thread) => (
          <button
            key={`${thread.type}-${thread.id}`}
            onClick={() => navigate(chatUrl(thread), thread.type === 'booking' ? { state: { title: thread.other_party_name ?? undefined } } : undefined)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              width: '100%',
              textAlign: 'left',
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.sm,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 22 }}>{TYPE_ICON[thread.type]}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: thread.unread_count > 0 ? 800 : 700,
                    color: colors.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {thread.other_party_name ?? t('inbox.unknownParty')}
                </span>
              </span>
              {thread.preview && (
                <span
                  style={{
                    display: 'block',
                    fontSize: 13.5,
                    color: thread.unread_count > 0 ? colors.text : colors.textMuted,
                    fontWeight: thread.unread_count > 0 ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: 2,
                  }}
                >
                  {thread.preview}
                </span>
              )}
            </span>
            {thread.unread_count > 0 && (
              <span
                style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: 999,
                  backgroundColor: colors.primary,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: `0 ${spacing.xs}px`,
                  flexShrink: 0,
                }}
              >
                {thread.unread_count > 9 ? '9+' : thread.unread_count}
              </span>
            )}
          </button>
        ))
      )}
    </div>
  );
}
