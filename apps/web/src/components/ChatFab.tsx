import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { fetchActiveChat, type ActiveChat } from '../api/demLegui';
import { colors, radius, spacing } from '../theme';

const POLL_INTERVAL_MS = 20000;
const ALERT_AUTO_DISMISS_MS = 6000;

function chatUrl(chat: ActiveChat): string {
  return chat.type === 'booking' ? `/chat/${chat.id}` : `/services/dem-legui/${chat.id}/chat`;
}

/**
 * Floating shortcut to the rider's single most relevant conversation, plus
 * a banner alert whenever a genuinely new incoming message is detected
 * across polls — chat was otherwise only reachable by drilling into a
 * specific trip/request, with nothing surfacing new messages while browsing
 * elsewhere. Deliberately independent of push notifications (which need
 * FCM configured and permission granted) so it always works.
 */
export function ChatFab() {
  const location = useLocation();
  const navigate = useNavigate();
  const [chat, setChat] = useState<ActiveChat | null>(null);
  const [alertChat, setAlertChat] = useState<ActiveChat | null>(null);
  const seenMessageId = useRef<number | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchActiveChat()
        .then((result) => {
          if (cancelled) return;
          setChat(result);

          if (result?.latest_message_id != null) {
            if (initialized.current && result.latest_message_id !== seenMessageId.current) {
              setAlertChat(result);
            }
            seenMessageId.current = result.latest_message_id;
          }
          initialized.current = true;
        })
        .catch(() => {
          // Silent — this is a convenience shortcut, not critical UI.
        });
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!alertChat) return;
    const timeout = setTimeout(() => setAlertChat(null), ALERT_AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
  }, [alertChat]);

  const onChatScreen = location.pathname.startsWith('/chat/') || location.pathname.endsWith('/chat');

  const goToChat = (target: ActiveChat) => {
    setAlertChat(null);
    navigate(chatUrl(target), target.type === 'booking' ? { state: { title: target.other_party_name ?? undefined } } : undefined);
  };

  return (
    <>
      {alertChat && !onChatScreen && (
        <button
          onClick={() => goToChat(alertChat)}
          style={{
            position: 'fixed',
            top: 'calc(14px + env(safe-area-inset-top))',
            left: 14,
            right: 14,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            boxShadow: '0 8px 24px rgba(19, 26, 23, 0.22)',
            padding: `${spacing.sm}px ${spacing.md}px`,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 22 }}>💬</span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: colors.text }}>
              {alertChat.other_party_name ?? 'Nouveau message'}
            </span>
            {alertChat.preview && (
              <span
                style={{
                  display: 'block',
                  fontSize: 12.5,
                  color: colors.textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {alertChat.preview}
              </span>
            )}
          </span>
        </button>
      )}

      {chat && !onChatScreen && (
        <button
          onClick={() => goToChat(chat)}
          aria-label="Chat"
          style={{
            position: 'fixed',
            bottom: 'calc(110px + env(safe-area-inset-bottom))',
            right: 16,
            zIndex: 101,
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: colors.primary,
            color: '#fff',
            fontSize: 24,
            lineHeight: 1,
            boxShadow: '0 6px 16px rgba(19, 26, 23, 0.28)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          💬
        </button>
      )}
    </>
  );
}
