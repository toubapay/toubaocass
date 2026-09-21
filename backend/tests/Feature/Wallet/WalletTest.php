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

    public function test_booking_with_wallet_payment_charges_rider_and_credits_driver_only_at_completion(): void
    {
        $trip = $this->makeTrip(fare: 3000);
        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 10000);

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2, 'payment_method' => 'wallet'])
            ->assertCreated()
            ->assertJsonPath('payment_method', 'wallet');

        // Nobody is charged or credited until the trip completes — both
        // sides of the payment move atomically at completion (see
        // DemLeguiEarningsTest/DeliveryEarningsTest for the full picture).
        $this->assertSame(10000, Wallet::where('user_id', $rider->id)->value('balance'));
        $this->assertNull(Wallet::where('user_id', $trip->driver_id)->value('balance'));

        $trip->update(['status' => Trip::STATUS_IN_PROGRESS]);
        $this->actingAs($trip->driver, 'sanctum')->postJson("/api/driver/trips/{$trip->id}/complete")->assertOk();

        // fare_total 6000 charged to the rider.
        $this->assertSame(4000, Wallet::where('user_id', $rider->id)->value('balance'));
        // fare_total 6000, default 15% commission -> 900, net 5100.
        $this->assertSame(5100, Wallet::where('user_id', $trip->driver_id)->value('balance'));
    }

    public function test_booking_with_wallet_payment_and_insufficient_balance_still_completes_and_goes_negative(): void
    {
        $trip = $this->makeTrip(fare: 3000);
        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 1000);

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2, 'payment_method' => 'wallet'])
            ->assertCreated();

        $this->assertSame(1, Booking::count());
        $this->assertSame(1000, Wallet::where('user_id', $rider->id)->value('balance'));
        $this->assertSame(2, $trip->fresh()->available_seats);

        $trip->update(['status' => Trip::STATUS_IN_PROGRESS]);
        $this->actingAs($trip->driver, 'sanctum')->postJson("/api/driver/trips/{$trip->id}/complete")->assertOk();

        // fare_total 6000 debited unconditionally — the rider's balance
        // goes negative rather than blocking the driver's completion.
        $this->assertSame(-5000, Wallet::where('user_id', $rider->id)->value('balance'));
        $this->assertSame(5100, Wallet::where('user_id', $trip->driver_id)->value('balance'));
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

    public function test_cancelling_a_wallet_paid_booking_refunds_rider_driver_was_never_credited(): void
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
        $this->assertNull(Wallet::where('user_id', $trip->driver_id)->value('balance'));
    }

    public function test_increasing_seats_on_a_wallet_paid_booking_charges_the_updated_total_at_completion(): void
    {
        $trip = $this->makeTrip(fare: 3000, seats: 4);
        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 10000);

        $response = $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 1, 'payment_method' => 'wallet'])
            ->assertCreated();
        $bookingId = $response->json('id');

        // No wallet interaction on the seat change itself.
        $this->actingAs($rider, 'sanctum')
            ->putJson("/api/bookings/{$bookingId}", ['seats' => 3])
            ->assertOk();

        $this->assertSame(10000, Wallet::where('user_id', $rider->id)->value('balance'));

        $trip->update(['status' => Trip::STATUS_IN_PROGRESS]);
        $this->actingAs($trip->driver, 'sanctum')->postJson("/api/driver/trips/{$trip->id}/complete")->assertOk();

        // Only the final fare_total (3 seats × 3000 = 9000) is charged, once.
        $this->assertSame(1000, Wallet::where('user_id', $rider->id)->value('balance'));
    }

    public function test_decreasing_seats_on_a_wallet_paid_booking_charges_the_updated_total_at_completion(): void
    {
        $trip = $this->makeTrip(fare: 3000, seats: 4);
        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 10000);

        $response = $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 3, 'payment_method' => 'wallet'])
            ->assertCreated();
        $bookingId = $response->json('id');

        // No wallet interaction on the seat change itself.
        $this->actingAs($rider, 'sanctum')
            ->putJson("/api/bookings/{$bookingId}", ['seats' => 1])
            ->assertOk();

        $this->assertSame(10000, Wallet::where('user_id', $rider->id)->value('balance'));

        $trip->update(['status' => Trip::STATUS_IN_PROGRESS]);
        $this->actingAs($trip->driver, 'sanctum')->postJson("/api/driver/trips/{$trip->id}/complete")->assertOk();

        // Only the final fare_total (1 seat × 3000 = 3000) is charged, once.
        $this->assertSame(7000, Wallet::where('user_id', $rider->id)->value('balance'));
    }

    public function test_driver_cancelling_the_whole_trip_refunds_wallet_paid_bookings(): void
    {
        $trip = $this->makeTrip(fare: 3000, seats: 4);
        $riderA = User::factory()->create();
        $riderB = User::factory()->create();
        app(WalletService::class)->topUp($riderA, 10000);
        app(WalletService::class)->topUp($riderB, 10000);

        $this->actingAs($riderA, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2, 'payment_method' => 'wallet'])
            ->assertCreated();
        $this->actingAs($riderB, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 1, 'payment_method' => 'cash'])
            ->assertCreated();

        // Driver isn't credited until the trip completes, so cancelling now
        // has nothing to reverse.
        $this->assertNull(Wallet::where('user_id', $trip->driver_id)->value('balance'));

        $this->actingAs($trip->driver, 'sanctum')
            ->deleteJson("/api/driver/trips/{$trip->id}")
            ->assertOk();

        $this->assertSame(10000, Wallet::where('user_id', $riderA->id)->value('balance'));
        $this->assertNull(Wallet::where('user_id', $trip->driver_id)->value('balance'));
        $this->assertSame(10000, Wallet::where('user_id', $riderB->id)->value('balance'));
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
