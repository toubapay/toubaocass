<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\OtpCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class OtpAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_rider_can_request_and_verify_otp_as_a_new_user(): void
    {
        Notification::fake();

        $phone = '+221771234567';

        $this->postJson('/api/auth/otp/request', [
            'phone' => $phone,
            'role' => 'rider',
        ])->assertOk();

        Notification::assertSentTo(
            new AnonymousNotifiable,
            OtpCodeNotification::class,
        );

        $code = $this->capturedOtpCode();

        $response = $this->postJson('/api/auth/otp/verify', [
            'phone' => $phone,
            'role' => 'rider',
            'code' => $code,
        ])->assertOk();

        $response->assertJson(['is_new_user' => true, 'user' => ['phone_verified' => true]]);
        $this->assertNotEmpty($response->json('token'));
        $this->assertDatabaseHas('users', ['phone' => $phone, 'role' => 'rider']);
        $this->assertNotNull(User::where('phone', $phone)->first()->phone_verified_at);
    }

    public function test_verify_fails_with_wrong_code(): void
    {
        Notification::fake();

        $phone = '+221771234568';

        $this->postJson('/api/auth/otp/request', [
            'phone' => $phone,
            'role' => 'rider',
        ])->assertOk();

        $this->postJson('/api/auth/otp/verify', [
            'phone' => $phone,
            'role' => 'rider',
            'code' => '000000',
        ])->assertUnprocessable();
    }

    public function test_same_phone_can_hold_separate_rider_and_driver_accounts(): void
    {
        Notification::fake();
        $phone = '+221771234569';

        foreach (['rider', 'driver'] as $role) {
            $this->postJson('/api/auth/otp/request', ['phone' => $phone, 'role' => $role])->assertOk();
            $code = $this->capturedOtpCode();
            $this->postJson('/api/auth/otp/verify', ['phone' => $phone, 'role' => $role, 'code' => $code])
                ->assertOk()
                ->assertJson(['is_new_user' => true]);
        }

        $this->assertEquals(2, User::where('phone', $phone)->count());
    }

    public function test_authenticated_user_can_fetch_and_update_profile(): void
    {
        $user = User::factory()->create(['name' => null]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/me')->assertOk();
        $response->assertJson(['profile_complete' => false]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', ['name' => 'Awa Ndiaye'])
            ->assertOk()
            ->assertJson(['name' => 'Awa Ndiaye', 'profile_complete' => true]);
    }

    public function test_authenticated_user_can_register_an_fcm_token(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/fcm-token', ['fcm_token' => 'device-token-123'])
            ->assertOk();

        $this->assertDatabaseHas('users', ['id' => $user->id, 'fcm_token' => 'device-token-123']);
    }

    private function capturedOtpCode(): string
    {
        $code = null;

        Notification::assertSentTo(
            new AnonymousNotifiable,
            OtpCodeNotification::class,
            function (OtpCodeNotification $notification) use (&$code) {
                $code = $notification->code();

                return true;
            }
        );

        return $code;
    }
}
