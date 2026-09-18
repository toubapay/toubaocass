import { ThreadChatPage } from 'shared-web/src/pages/ThreadChatPage';

import { fetchAnandoMessages, sendAnandoMessage } from '../api/anando';

export function AnandoChatPage() {
  return <ThreadChatPage paramName="bookingId" fetchMessages={fetchAnandoMessages} sendMessage={sendAnandoMessage} />;
}
