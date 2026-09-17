<?php

namespace Tests\Feature\Notifications;

use App\Services\Push\FcmPushGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FcmPushGatewayTest extends TestCase
{
    use RefreshDatabase;

    private function gateway(): FcmPushGateway
    {
        $keyPair = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($keyPair, $privateKey);

        return new FcmPushGateway('test-project', [
            'client_email' => 'test@test-project.iam.gserviceaccount.com',
            'private_key' => $privateKey,
        ]);
    }

    public function test_sends_a_data_only_message_with_title_and_body_folded_into_data(): void
    {
        Http::fake([
            'oauth2.googleapis.com/*' => Http::response(['access_token' => 'test-access-token'], 200),
            'fcm.googleapis.com/*' => Http::response(['name' => 'projects/test-project/messages/1'], 200),
        ]);

        $this->gateway()->send('device-token', 'Nouvelle réservation', '2 places réservées.', ['type' => 'booking_created', 'trip_id' => 5]);

        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), 'fcm.googleapis.com')) {
                return true;
            }

            $message = $request->data()['message'];

            return $message['token'] === 'device-token'
                && ! array_key_exists('notification', $message)
                && $message['data']['title'] === 'Nouvelle réservation'
                && $message['data']['body'] === '2 places réservées.'
                && $message['data']['type'] === 'booking_created'
                && $message['data']['trip_id'] === '5';
        });
    }
}
