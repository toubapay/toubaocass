import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { fetchActiveChat, type ActiveChat } from '../api/demLegui';
import { colors } from '../theme';

const POLL_INTERVAL_MS = 20000;

/**
 * Floating shortcut to the driver's single most relevant conversation
 * (most recent incoming message, or most recent active booking/Dem Légui
 * request if nobody's spoken yet) — chat was otherwise only reachable by
 * drilling into a specific trip's booking list. Hides itself on chat
 * screens themselves and whenever there's nothing to jump to.
 */
export function ChatFab() {
  const location = useLocation();
  const navigate = useNavigate();
  const [chat, setChat] = useState<ActiveChat | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchActiveChat()
        .then((result) => {
          if (!cancelled) setChat(result);
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

  const onChatScreen = location.pathname.startsWith('/chat/') || location.pathname.endsWith('/chat');
  if (!chat || onChatScreen) return null;

  const handleClick = () => {
    if (chat.type === 'booking') {
      navigate(`/chat/${chat.id}`, { state: { title: chat.other_party_name ?? undefined } });
    } else {
      navigate(`/dem-legui/requests/${chat.id}/chat`);
    }
  };

  return (
    <button
      onClick={handleClick}
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
  );
}
