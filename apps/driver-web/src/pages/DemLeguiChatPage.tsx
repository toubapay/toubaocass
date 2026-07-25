import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { extractErrorMessage } from '../api/client';
import { fetchDemLeguiMessages, sendDemLeguiMessage } from '../api/demLegui';
import type { Message } from '../api/types';
import { CenteredSpinner } from '../components/Spinner';
import { colors, radius, spacing } from '../theme';

const POLL_INTERVAL_MS = 4000;

/**
 * Chat thread for a Dem Légui request — same shape as ChatPage (booking
 * chat), just pointed at the dem-legui/requests/{id}/messages endpoints.
 */
export function DemLeguiChatPage() {
  const { t } = useTranslation();
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const id = Number(requestId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchDemLeguiMessages(id);
      setMessages(data);
    } catch {
      // Keep the last known messages on a transient poll failure.
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || !id || sending) return;
    setSending(true);
    setError(undefined);
    try {
      const message = await sendDemLeguiMessage(id, trimmed);
      setMessages((prev) => [...prev, message]);
      setBody('');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <CenteredSpinner />;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: colors.textMuted, fontSize: 22, cursor: 'pointer', padding: 0, marginBottom: spacing.sm }}
      >
        ←
      </button>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: spacing.md }}>{t('chat.defaultTitle')}</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.md }}>
        {messages.length === 0 ? (
          <p style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.xl }}>
            {t('chat.empty')}
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.is_mine ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '78%',
                  backgroundColor: m.is_mine ? colors.primary : colors.surface,
                  color: m.is_mine ? '#fff' : colors.text,
                  border: m.is_mine ? 'none' : `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  fontSize: 14.5,
                }}
              >
                {!m.is_mine && (
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.65, marginBottom: 2 }}>{m.sender_name}</div>
                )}
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                  {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>{error}</p>}

      <div style={{ display: 'flex', gap: spacing.sm }}>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder={t('chat.placeholder')}
          style={{
            flex: 1,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            padding: '12px 14px',
            fontSize: 15,
            color: colors.text,
            backgroundColor: colors.surface,
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          style={{
            border: 'none',
            borderRadius: radius.sm,
            padding: `0 ${spacing.md}px`,
            backgroundColor: colors.primary,
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: sending || !body.trim() ? 'default' : 'pointer',
            opacity: sending || !body.trim() ? 0.6 : 1,
          }}
        >
          {t('chat.send')}
        </button>
      </div>
    </div>
  );
}
