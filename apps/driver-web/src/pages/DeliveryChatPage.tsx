import { ThreadChatPage } from 'shared-web/src/pages/ThreadChatPage';

import { fetchDeliveryMessages, sendDeliveryMessage } from '../api/deliveries';

export function DeliveryChatPage() {
  return <ThreadChatPage paramName="deliveryId" fetchMessages={fetchDeliveryMessages} sendMessage={sendDeliveryMessage} />;
}
