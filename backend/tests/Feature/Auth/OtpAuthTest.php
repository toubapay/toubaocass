<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\OtpCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
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

    public function test_authenticated_user_can_upload_and_replace_a_profile_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $first = $this->actingAs($user, 'sanctum')
            ->postJson('/api/profile/photo', ['photo' => UploadedFile::fake()->image('me.jpg')])
            ->assertOk()
            ->json();

        $this->assertNotNull($first['photo_url']);
        $firstPath = $user->fresh()->photo_path;
        Storage::disk('public')->assertExists($firstPath);

        // Uploading a new photo replaces the old file rather than leaving
        // it orphaned on disk.
        $this->actingAs($user->fresh(), 'sanctum')
            ->postJson('/api/profile/photo', ['photo' => UploadedFile::fake()->image('me-again.jpg')])
            ->assertOk();

        Storage::disk('public')->assertMissing($firstPath);
        $this->assertNotEquals($firstPath, $user->fresh()->photo_path);
    }

    public function test_authenticated_user_can_delete_their_profile_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/profile/photo', ['photo' => UploadedFile::fake()->image('me.jpg')])
            ->assertOk();

        $path = $user->fresh()->photo_path;

        $this->actingAs($user->fresh(), 'sanctum')
            ->deleteJson('/api/profile/photo')
            ->assertOk()
            ->assertJson(['photo_url' => null]);

        Storage::disk('public')->assertMissing($path);
        $this->assertNull($user->fresh()->photo_path);
    }

    public function test_profile_photo_upload_rejects_a_non_image_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/profile/photo', ['photo' => UploadedFile::fake()->create('doc.pdf', 100)])
            ->assertUnprocessable();
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
