import { InboxPage as SharedInboxPage } from 'shared-web/src/pages/InboxPage';
import type { InboxThread } from 'shared-web/src/api/types';

function chatUrl(thread: InboxThread): string {
  switch (thread.type) {
    case 'booking':
      return `/chat/${thread.id}`;
    case 'dem_legui_request':
      return `/dem-legui/requests/${thread.id}/chat`;
    case 'anando':
      return `/anando-ride-bookings/${thread.id}/chat`;
    case 'delivery':
      return `/deliveries/${thread.id}/chat`;
  }
}

export function InboxPage() {
  return <SharedInboxPage chatUrl={chatUrl} />;
}
