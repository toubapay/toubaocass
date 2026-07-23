<?php

namespace Tests\Feature\Notifications;

use App\Contracts\PushGateway;
use App\Contracts\PushSendResult;
use App\Models\User;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;
use Tests\TestCase;

class FcmChannelTest extends TestCase
{
    use RefreshDatabase;

    private function notification(): Notification
    {
        return new class extends Notification
        {
            public function via(object $notifiable): array
            {
                return [FcmChannel::class];
            }

            public function toFcm(object $notifiable): array
            {
                return ['title' => 'Test', 'body' => 'Test body'];
            }
        };
    }

    public function test_an_invalid_token_response_clears_the_users_fcm_token(): void
    {
        $user = User::factory()->create(['fcm_token' => 'stale-token']);

        $this->app->bind(PushGateway::class, fn () => new class implements PushGateway
        {
            public function send(string $token, string $title, string $body, array $data = []): PushSendResult
            {
                return PushSendResult::failed(tokenInvalid: true);
            }
        });

        $user->notify($this->notification());

        $this->assertNull($user->fresh()->fcm_token);
    }

    public function test_a_transient_failure_does_not_clear_the_users_fcm_token(): void
    {
        $user = User::factory()->create(['fcm_token' => 'still-good-token']);

        $this->app->bind(PushGateway::class, fn () => new class implements PushGateway
        {
            public function send(string $token, string $title, string $body, array $data = []): PushSendResult
            {
                return PushSendResult::failed(tokenInvalid: false);
            }
        });

        $user->notify($this->notification());

        $this->assertSame('still-good-token', $user->fresh()->fcm_token);
    }
}
