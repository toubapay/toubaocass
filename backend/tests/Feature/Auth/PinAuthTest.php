<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PinAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_set_a_pin_and_then_log_in_with_it(): void
    {
        $user = User::factory()->create(['phone' => '+221771234567', 'role' => 'rider']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/auth/pin/set', ['pin' => '1234'])
            ->assertOk()
            ->assertJson(['has_pin' => true]);

        $response = $this->postJson('/api/auth/pin/login', [
            'phone' => '+221771234567',
            'role' => 'rider',
            'pin' => '1234',
        ])->assertOk();

        $this->assertNotEmpty($response->json('token'));
        $response->assertJson(['user' => ['phone' => '+221771234567', 'has_pin' => true]]);
    }

    public function test_pin_login_fails_with_wrong_pin(): void
    {
        $user = User::factory()->create(['phone' => '+221771234568', 'role' => 'rider']);
        $this->actingAs($user, 'sanctum')->postJson('/api/auth/pin/set', ['pin' => '1234'])->assertOk();

        $this->postJson('/api/auth/pin/login', [
            'phone' => '+221771234568',
            'role' => 'rider',
            'pin' => '0000',
        ])->assertUnprocessable();
    }

    public function test_pin_login_fails_when_no_pin_has_been_set(): void
    {
        User::factory()->create(['phone' => '+221771234569', 'role' => 'rider']);

        $this->postJson('/api/auth/pin/login', [
            'phone' => '+221771234569',
            'role' => 'rider',
            'pin' => '1234',
        ])->assertUnprocessable();
    }

    public function test_pin_login_fails_for_unknown_phone(): void
    {
        $this->postJson('/api/auth/pin/login', [
            'phone' => '+221770000000',
            'role' => 'rider',
            'pin' => '1234',
        ])->assertUnprocessable();
    }

    public function test_account_locks_after_too_many_wrong_pin_attempts(): void
    {
        $user = User::factory()->create(['phone' => '+221771234570', 'role' => 'rider']);
        $this->actingAs($user, 'sanctum')->postJson('/api/auth/pin/set', ['pin' => '1234'])->assertOk();

        $maxAttempts = (int) config('services.pin.max_attempts');

        for ($i = 0; $i < $maxAttempts; $i++) {
            $this->postJson('/api/auth/pin/login', [
                'phone' => '+221771234570',
                'role' => 'rider',
                'pin' => '0000',
            ])->assertUnprocessable();
        }

        // Even the correct PIN is now rejected — the account is locked out.
        $response = $this->postJson('/api/auth/pin/login', [
            'phone' => '+221771234570',
            'role' => 'rider',
            'pin' => '1234',
        ])->assertUnprocessable();

        $this->assertStringContainsString('tentatives', $response->json('errors.pin.0'));
    }

    public function test_rider_and_driver_pins_are_independent_for_the_same_phone(): void
    {
        $rider = User::factory()->create(['phone' => '+221771234571', 'role' => 'rider']);
        User::factory()->create(['phone' => '+221771234571', 'role' => 'driver']);

        $this->actingAs($rider, 'sanctum')->postJson('/api/auth/pin/set', ['pin' => '1234'])->assertOk();

        // The driver account never set a PIN, so it must not accept the rider's.
        $this->postJson('/api/auth/pin/login', [
            'phone' => '+221771234571',
            'role' => 'driver',
            'pin' => '1234',
        ])->assertUnprocessable();

        $this->postJson('/api/auth/pin/login', [
            'phone' => '+221771234571',
            'role' => 'rider',
            'pin' => '1234',
        ])->assertOk();
    }
}
