<?php

namespace Tests\Feature\Driver;

use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\Delivery;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\DriverProfile;
use App\Models\Rating;
use App\Models\Trip;
use App\Models\User;
use App\Models\Wallet;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DriverEarningsAndRatingTest extends TestCase
{
    use RefreshDatabase;

    private function driverWithProfile(): User
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'rating' => 5.00, 'ratings_count' => 0]);

        return $driver;
    }

    // --- Trip: earnings on completion + rating ---------------------------

    public function test_completing_a_trip_credits_driver_net_of_commission_for_both_wallet_and_cash_bookings(): void
    {
        $driver = $this->driverWithProfile();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();
        $trip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_IN_PROGRESS,
            'fare' => 2000,
        ]);

        $walletRider = User::factory()->create();
        app(WalletService::class)->topUp($walletRider, 10000);
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $walletRider->id, 'fare_total' => 4000, 'payment_method' => Booking::PAYMENT_METHOD_WALLET, 'status' => Booking::STATUS_CONFIRMED]);

        $cashRider = User::factory()->create();
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $cashRider->id, 'fare_total' => 2000, 'payment_method' => Booking::PAYMENT_METHOD_CASH, 'status' => Booking::STATUS_CONFIRMED]);

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/trips/{$trip->id}/complete")->assertOk();

        // (4000 + 2000) fare, 15% default commission -> 900, net 5100 — the
        // driver's earnings ledger reflects both bookings regardless of how
        // each rider paid.
        $this->assertSame(5100, Wallet::where('user_id', $driver->id)->value('balance'));
    }

    public function test_rider_can_rate_driver_after_trip_completes(): void
    {
        $driver = $this->driverWithProfile();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();
        $trip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
        ]);
        $rider = User::factory()->create();
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/rate", ['score' => 5, 'comment' => 'Super chauffeur'])
            ->assertOk();

        $this->assertDatabaseHas('ratings', ['rateable_type' => Trip::class, 'rateable_id' => $trip->id, 'rater_id' => $rider->id, 'ratee_id' => $driver->id, 'score' => 5]);
        $this->assertSame(5.0, (float) $driver->driverProfile->fresh()->rating);
        $this->assertSame(1, $driver->driverProfile->fresh()->ratings_count);
    }

    public function test_cannot_rate_trip_before_it_completes(): void
    {
        $driver = $this->driverWithProfile();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();
        $trip = Trip::factory()->create([
            'driver_id' => $driver->id, 'car_id' => $car->id,
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_IN_PROGRESS,
        ]);
        $rider = User::factory()->create();
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/rate", ['score' => 5])
            ->assertStatus(422);
    }

    public function test_cannot_rate_a_trip_without_a_confirmed_booking(): void
    {
        $driver = $this->driverWithProfile();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();
        $trip = Trip::factory()->create([
            'driver_id' => $driver->id, 'car_id' => $car->id,
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
        ]);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/rate", ['score' => 5])
            ->assertStatus(422);
    }

    public function test_re_rating_the_same_trip_updates_the_existing_review(): void
    {
        $driver = $this->driverWithProfile();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();
        $trip = Trip::factory()->create([
            'driver_id' => $driver->id, 'car_id' => $car->id,
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
        ]);
        $rider = User::factory()->create();
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        $this->actingAs($rider, 'sanctum')->postJson("/api/trips/{$trip->id}/rate", ['score' => 2])->assertOk();
        $this->actingAs($rider, 'sanctum')->postJson("/api/trips/{$trip->id}/rate", ['score' => 5])->assertOk();

        $this->assertSame(1, Rating::where('rateable_type', Trip::class)->where('rateable_id', $trip->id)->count());
        $this->assertSame(5.0, (float) $driver->driverProfile->fresh()->rating);
    }

    // --- Dem Légui: earnings on completion + rating -----------------------

    public function test_completing_a_dem_legui_trip_credits_driver_net_of_commission(): void
    {
        $driver = $this->driverWithProfile();
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => 4]);
        $trip = DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => City::factory()->create()->id,
            'total_seats' => 4,
            'available_seats' => 3,
            'price_per_seat' => 1000,
            'status' => DemLeguiTrip::STATUS_IN_PROGRESS,
        ]);

        $rider = User::factory()->create();
        DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'dem_legui_trip_id' => $trip->id,
            'destination_city_id' => $trip->destination_city_id,
            'fare_total' => 2000,
            'payment_method' => DemLeguiRequest::PAYMENT_METHOD_WALLET,
            'status' => DemLeguiRequest::STATUS_MATCHED,
        ]);

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/dem-legui/trips/{$trip->id}/complete")->assertOk();

        // 2000 fare, 15% default commission -> 300, net 1700.
        $this->assertSame(1700, Wallet::where('user_id', $driver->id)->value('balance'));
    }

    public function test_completing_a_cash_paid_dem_legui_trip_still_credits_driver_earnings(): void
    {
        $driver = $this->driverWithProfile();
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => 4]);
        $trip = DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => City::factory()->create()->id,
            'total_seats' => 4,
            'available_seats' => 3,
            'price_per_seat' => 1000,
            'status' => DemLeguiTrip::STATUS_IN_PROGRESS,
        ]);

        $rider = User::factory()->create();
        DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'dem_legui_trip_id' => $trip->id,
            'destination_city_id' => $trip->destination_city_id,
            'fare_total' => 2000,
            'payment_method' => DemLeguiRequest::PAYMENT_METHOD_CASH,
            'status' => DemLeguiRequest::STATUS_MATCHED,
        ]);

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/dem-legui/trips/{$trip->id}/complete")->assertOk();

        // Cash paid directly to the driver, but the earnings ledger still
        // records the net amount so the driver's wallet reflects it.
        $this->assertSame(1700, Wallet::where('user_id', $driver->id)->value('balance'));
    }

    public function test_rider_can_rate_driver_after_dem_legui_trip_completes(): void
    {
        $driver = $this->driverWithProfile();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $trip = DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => City::factory()->create()->id,
            'total_seats' => 4,
            'available_seats' => 3,
            'price_per_seat' => 1000,
            'status' => DemLeguiTrip::STATUS_COMPLETED,
        ]);
        $rider = User::factory()->create();
        DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'dem_legui_trip_id' => $trip->id,
            'destination_city_id' => $trip->destination_city_id,
            'status' => DemLeguiRequest::STATUS_MATCHED,
        ]);

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/dem-legui/trips/{$trip->id}/rate", ['score' => 4])
            ->assertOk();

        $this->assertDatabaseHas('ratings', ['rateable_type' => DemLeguiTrip::class, 'rateable_id' => $trip->id, 'rater_id' => $rider->id, 'ratee_id' => $driver->id, 'score' => 4]);
    }

    public function test_cannot_rate_a_dem_legui_trip_without_having_been_matched_to_it(): void
    {
        $driver = $this->driverWithProfile();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $trip = DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => City::factory()->create()->id,
            'total_seats' => 4,
            'available_seats' => 4,
            'price_per_seat' => 1000,
            'status' => DemLeguiTrip::STATUS_COMPLETED,
        ]);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/dem-legui/trips/{$trip->id}/rate", ['score' => 4])
            ->assertStatus(422);
    }

    // --- Delivery: earnings on completion + rating -------------------------

    public function test_delivering_credits_driver_net_of_commission(): void
    {
        $driver = $this->driverWithProfile();
        $delivery = Delivery::factory()->create([
            'driver_id' => $driver->id,
            'fee' => 3000,
            'payment_method' => Delivery::PAYMENT_METHOD_WALLET,
            'status' => Delivery::STATUS_PICKED_UP,
        ]);

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/deliveries/{$delivery->id}/deliver")->assertOk();

        // 3000 fee, 15% default commission -> 450, net 2550.
        $this->assertSame(2550, Wallet::where('user_id', $driver->id)->value('balance'));
    }

    public function test_delivering_a_cash_paid_delivery_still_credits_driver_earnings(): void
    {
        $driver = $this->driverWithProfile();
        $delivery = Delivery::factory()->create([
            'driver_id' => $driver->id,
            'fee' => 3000,
            'payment_method' => Delivery::PAYMENT_METHOD_CASH,
            'status' => Delivery::STATUS_PICKED_UP,
        ]);

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/deliveries/{$delivery->id}/deliver")->assertOk();

        // Cash paid directly to the driver, but the earnings ledger still
        // records the net amount so the driver's wallet reflects it.
        $this->assertSame(2550, Wallet::where('user_id', $driver->id)->value('balance'));
    }

    public function test_sender_can_rate_driver_after_delivery(): void
    {
        $driver = $this->driverWithProfile();
        $sender = User::factory()->create();
        $delivery = Delivery::factory()->create([
            'sender_id' => $sender->id,
            'driver_id' => $driver->id,
            'status' => Delivery::STATUS_DELIVERED,
        ]);

        $this->actingAs($sender, 'sanctum')
            ->postJson("/api/deliveries/{$delivery->id}/rate", ['score' => 3, 'comment' => 'Colis en retard'])
            ->assertOk();

        $this->assertDatabaseHas('ratings', ['rateable_type' => Delivery::class, 'rateable_id' => $delivery->id, 'rater_id' => $sender->id, 'ratee_id' => $driver->id, 'score' => 3]);
    }

    public function test_only_the_sender_can_rate_a_delivery(): void
    {
        $driver = $this->driverWithProfile();
        $delivery = Delivery::factory()->create(['driver_id' => $driver->id, 'status' => Delivery::STATUS_DELIVERED]);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/deliveries/{$delivery->id}/rate", ['score' => 3])
            ->assertStatus(404);
    }

    // --- Cross-type aggregation + tier -------------------------------------

    public function test_driver_rating_aggregates_across_trip_dem_legui_and_delivery(): void
    {
        $driver = $this->driverWithProfile();

        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();
        $trip = Trip::factory()->create([
            'driver_id' => $driver->id, 'car_id' => $car->id,
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
        ]);
        $tripRider = User::factory()->create();
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $tripRider->id, 'status' => Booking::STATUS_CONFIRMED]);
        $this->actingAs($tripRider, 'sanctum')->postJson("/api/trips/{$trip->id}/rate", ['score' => 5])->assertOk();

        $delivery = Delivery::factory()->create(['driver_id' => $driver->id, 'status' => Delivery::STATUS_DELIVERED]);
        $this->actingAs($delivery->sender, 'sanctum')->postJson("/api/deliveries/{$delivery->id}/rate", ['score' => 3])->assertOk();

        // (5 + 3) / 2 = 4.0, across both rateable types.
        $this->assertSame(4.0, (float) $driver->driverProfile->fresh()->rating);
        $this->assertSame(2, $driver->driverProfile->fresh()->ratings_count);
    }

    public function test_anando_ratings_never_affect_a_drivers_professional_tier(): void
    {
        // A driver could also post Anando rides; those peer ratings are
        // stored separately (users.anando_rating) and must never leak into
        // driver_profiles.rating, which backs the tier shown to riders.
        $driver = $this->driverWithProfile();
        $driver->update(['anando_rating' => 1.0, 'anando_ratings_count' => 10]);

        $this->assertSame(5.0, (float) $driver->driverProfile->fresh()->rating);
        $this->assertSame(0, $driver->driverProfile->fresh()->ratings_count);
    }

    public function test_tier_is_debutant_below_the_minimum_rating_count(): void
    {
        $profile = DriverProfile::factory()->create(['rating' => 5.00, 'ratings_count' => DriverProfile::MIN_RATINGS_FOR_TIER - 1]);

        $this->assertSame(DriverProfile::TIER_DEBUTANT, $profile->tier);
    }

    public function test_tier_is_gold_at_or_above_the_gold_threshold_with_enough_ratings(): void
    {
        $profile = DriverProfile::factory()->create(['rating' => 4.50, 'ratings_count' => DriverProfile::MIN_RATINGS_FOR_TIER]);

        $this->assertSame(DriverProfile::TIER_GOLD, $profile->tier);
    }

    public function test_tier_is_silver_between_the_silver_and_gold_thresholds(): void
    {
        $profile = DriverProfile::factory()->create(['rating' => 4.00, 'ratings_count' => DriverProfile::MIN_RATINGS_FOR_TIER]);

        $this->assertSame(DriverProfile::TIER_SILVER, $profile->tier);
    }

    public function test_tier_falls_back_to_debutant_below_the_silver_threshold_even_with_enough_ratings(): void
    {
        $profile = DriverProfile::factory()->create(['rating' => 2.00, 'ratings_count' => DriverProfile::MIN_RATINGS_FOR_TIER]);

        $this->assertSame(DriverProfile::TIER_DEBUTANT, $profile->tier);
    }

    // --- GET /driver/ratings — the driver reading their own reviews --------

    public function test_driver_can_list_reviews_received_across_trip_dem_legui_and_delivery(): void
    {
        $driver = $this->driverWithProfile();

        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();
        $trip = Trip::factory()->create([
            'driver_id' => $driver->id, 'car_id' => $car->id,
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
        ]);
        $tripRider = User::factory()->create(['name' => 'Aminata']);
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $tripRider->id, 'status' => Booking::STATUS_CONFIRMED]);
        $this->actingAs($tripRider, 'sanctum')->postJson("/api/trips/{$trip->id}/rate", ['score' => 5, 'comment' => 'Super chauffeur'])->assertOk();

        $delivery = Delivery::factory()->create(['driver_id' => $driver->id, 'status' => Delivery::STATUS_DELIVERED]);
        $this->actingAs($delivery->sender, 'sanctum')->postJson("/api/deliveries/{$delivery->id}/rate", ['score' => 3])->assertOk();

        $response = $this->actingAs($driver, 'sanctum')->getJson('/api/driver/ratings')->assertOk();

        $data = $response->json('data');
        $this->assertCount(2, $data);
        $this->assertEqualsCanonicalizing(['trip', 'delivery'], array_column($data, 'rateable_type'));
        $tripReview = collect($data)->firstWhere('rateable_type', 'trip');
        $this->assertSame('Aminata', $tripReview['rater_name']);
        $this->assertSame(5, $tripReview['score']);
        $this->assertSame('Super chauffeur', $tripReview['comment']);
    }

    public function test_driver_ratings_list_never_includes_another_drivers_reviews(): void
    {
        $driver = $this->driverWithProfile();
        $otherDriver = $this->driverWithProfile();

        $delivery = Delivery::factory()->create(['driver_id' => $otherDriver->id, 'status' => Delivery::STATUS_DELIVERED]);
        $this->actingAs($delivery->sender, 'sanctum')->postJson("/api/deliveries/{$delivery->id}/rate", ['score' => 4])->assertOk();

        $response = $this->actingAs($driver, 'sanctum')->getJson('/api/driver/ratings')->assertOk();

        $this->assertCount(0, $response->json('data'));
    }
}
