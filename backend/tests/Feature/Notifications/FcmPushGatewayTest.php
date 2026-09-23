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

    public function test_an_os_display_send_includes_a_native_collapsing_notification_block(): void
    {
        Http::fake([
            'oauth2.googleapis.com/*' => Http::response(['access_token' => 'test-access-token'], 200),
            'fcm.googleapis.com/*' => Http::response(['name' => 'projects/test-project/messages/1'], 200),
        ]);

        $this->gateway()->send(
            'device-token',
            'Toyota Corolla · DK-1234',
            'Arrivée dans 4 min',
            ['type' => 'dem_legui_eta_update', 'dem_legui_request_id' => 9],
            ['tag' => 'dem_legui_eta_9'],
        );

        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), 'fcm.googleapis.com')) {
                return true;
            }

            $message = $request->data()['message'];

            return $message['notification']['title'] === 'Toyota Corolla · DK-1234'
                && $message['notification']['body'] === 'Arrivée dans 4 min'
                && $message['android']['notification']['tag'] === 'dem_legui_eta_9'
                && $message['android']['collapse_key'] === 'dem_legui_eta_9'
                && $message['apns']['headers']['apns-collapse-id'] === 'dem_legui_eta_9'
                && $message['apns']['payload']['aps']['alert']['title'] === 'Toyota Corolla · DK-1234'
                // Data payload still carries title/body/type too, same as
                // every other push — clients that key off data alone
                // (rather than the native notification block) keep working.
                && $message['data']['title'] === 'Toyota Corolla · DK-1234'
                && $message['data']['type'] === 'dem_legui_eta_update';
        });
    }
}
