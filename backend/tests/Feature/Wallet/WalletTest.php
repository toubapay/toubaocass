<?php

namespace Tests\Feature\Wallet;

use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\Trip;
use App\Models\User;
use App\Models\Wallet;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WalletTest extends TestCase
{
    use RefreshDatabase;

    private function makeTrip(int $fare = 3000, int $seats = 4): Trip
    {
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => $seats]);
        [$origin, $destination] = City::factory()->count(2)->create();

        return Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'fare' => $fare,
            'total_seats' => $seats,
            'available_seats' => $seats,
        ]);
    }

    public function test_wallet_is_auto_created_with_zero_balance(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/wallet')->assertOk();

        $this->assertSame(0, $response->json('balance'));
        $this->assertSame(1, Wallet::where('user_id', $user->id)->count());
    }

    public function test_admin_can_top_up_a_users_wallet_via_the_console_command(): void
    {
        $user = User::factory()->create(['phone' => '+221781119900']);

        $this->artisan('wallet:top-up', ['phone' => '+221781119900', 'amount' => 5000])
            ->assertExitCode(0);

        $this->assertSame(5000, Wallet::where('user_id', $user->id)->value('balance'));
        $transaction = Wallet::where('user_id', $user->id)->first()->transactions()->first();
        $this->assertSame('top_up', $transaction->type);
        $this->assertSame(5000, $transaction->amount);
    }

    public function test_top_up_command_fails_for_an_unknown_phone_number(): void
    {
        $this->artisan('wallet:top-up', ['phone' => '+221700000000', 'amount' => 5000])
            ->assertExitCode(1);

        $this->assertSame(0, Wallet::count());
    }

    public function test_there_is_no_self_service_top_up_endpoint(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/wallet/top-up', ['amount' => 5000])
            ->assertStatus(404);
    }

    public function test_booking_with_wallet_payment_charges_rider_and_credits_driver(): void
    {
        $trip = $this->makeTrip(fare: 3000);
        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 10000);

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2, 'payment_method' => 'wallet'])
            ->assertCreated()
            ->assertJsonPath('payment_method', 'wallet');

        $this->assertSame(4000, Wallet::where('user_id', $rider->id)->value('balance'));
        $this->assertSame(6000, Wallet::where('user_id', $trip->driver_id)->value('balance'));
    }

    public function test_booking_with_wallet_payment_fails_when_balance_is_insufficient(): void
    {
        $trip = $this->makeTrip(fare: 3000);
        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 1000);

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2, 'payment_method' => 'wallet'])
            ->assertStatus(422);

        $this->assertSame(0, Booking::count());
        $this->assertSame(1000, Wallet::where('user_id', $rider->id)->value('balance'));
        $this->assertSame(4, $trip->fresh()->available_seats);
    }

    public function test_booking_with_cash_payment_never_touches_any_wallet(): void
    {
        $trip = $this->makeTrip(fare: 3000);
        $rider = User::factory()->create();

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 1, 'payment_method' => 'cash'])
            ->assertCreated()
            ->assertJsonPath('payment_method', 'cash');

        $this->assertSame(0, Wallet::where('user_id', $rider->id)->value('balance') ?? 0);
        $this->assertSame(0, Wallet::count());
    }

    public function test_cancelling_a_wallet_paid_booking_refunds_rider_and_reverses_driver_earning(): void
    {
        $trip = $this->makeTrip(fare: 3000);
        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 10000);

        $response = $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2, 'payment_method' => 'wallet'])
            ->assertCreated();
        $bookingId = $response->json('id');

        $this->actingAs($rider, 'sanctum')->deleteJson("/api/bookings/{$bookingId}")->assertOk();

        $this->assertSame(10000, Wallet::where('user_id', $rider->id)->value('balance'));
        $this->assertSame(0, Wallet::where('user_id', $trip->driver_id)->value('balance'));
    }

    public function test_increasing_seats_on_a_wallet_paid_booking_charges_the_difference(): void
    {
        $trip = $this->makeTrip(fare: 3000, seats: 4);
        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 10000);

        $response = $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 1, 'payment_method' => 'wallet'])
            ->assertCreated();
        $bookingId = $response->json('id');

        // 3000 charged so far; going to 3 seats charges 6000 more.
        $this->actingAs($rider, 'sanctum')
            ->putJson("/api/bookings/{$bookingId}", ['seats' => 3])
            ->assertOk();

        $this->assertSame(1000, Wallet::where('user_id', $rider->id)->value('balance'));
        $this->assertSame(9000, Wallet::where('user_id', $trip->driver_id)->value('balance'));
    }

    public function test_decreasing_seats_on_a_wallet_paid_booking_refunds_the_difference(): void
    {
        $trip = $this->makeTrip(fare: 3000, seats: 4);
        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 10000);

        $response = $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 3, 'payment_method' => 'wallet'])
            ->assertCreated();
        $bookingId = $response->json('id');

        // 9000 charged so far; going down to 1 seat refunds 6000.
        $this->actingAs($rider, 'sanctum')
            ->putJson("/api/bookings/{$bookingId}", ['seats' => 1])
            ->assertOk();

        $this->assertSame(7000, Wallet::where('user_id', $rider->id)->value('balance'));
        $this->assertSame(3000, Wallet::where('user_id', $trip->driver_id)->value('balance'));
    }

    public function test_each_users_wallet_is_isolated_from_others(): void
    {
        $owner = User::factory()->create();
        app(WalletService::class)->topUp($owner, 5000);
        $otherUser = User::factory()->create();

        $response = $this->actingAs($otherUser, 'sanctum')->getJson('/api/wallet')->assertOk();

        $this->assertSame(0, $response->json('balance'));
    }
}
