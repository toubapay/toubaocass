<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\AnandoRide;
use App\Models\AnandoRideBooking;
use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\Delivery;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_without_permission_cannot_view_the_report(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_SUPPORT)->create();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/financials/report')->assertForbidden();
    }

    public function test_report_aggregates_commission_and_earnings_across_all_four_service_types(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();

        $driver = User::factory()->driver()->create();
        $rider = User::factory()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $origin = City::factory()->create();
        $destination = City::factory()->create();

        // Trip: fare_total 4000, commission 600 -> net 3400.
        $trip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
            'ride_type' => Trip::RIDE_TYPE_COMFORT,
        ]);
        Booking::factory()->create([
            'trip_id' => $trip->id,
            'rider_id' => $rider->id,
            'fare_total' => 4000,
            'commission_amount' => 600,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        // Dem Légui: fare_total 1500, commission 225 -> net 1275.
        $demLeguiTrip = DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => $destination->id,
            'total_seats' => $car->seats,
            'available_seats' => $car->seats - 1,
            'price_per_seat' => 1500,
            'status' => DemLeguiTrip::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);
        DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'dem_legui_trip_id' => $demLeguiTrip->id,
            'destination_city_id' => $destination->id,
            'status' => DemLeguiRequest::STATUS_MATCHED,
            'fare_total' => 1500,
            'commission_amount' => 225,
        ]);

        // Delivery: fee 2000, commission 300 -> net 1700.
        Delivery::factory()->create([
            'sender_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => Delivery::STATUS_DELIVERED,
            'fee' => 2000,
            'commission_amount' => 300,
            'delivered_at' => now(),
        ]);

        // Anando: price_total 1000, commission 150 -> net 850.
        $anandoRide = AnandoRide::factory()->create([
            'user_id' => $driver->id,
            'destination_city_id' => $destination->id,
            'status' => AnandoRide::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);
        AnandoRideBooking::factory()->create([
            'anando_ride_id' => $anandoRide->id,
            'user_id' => $rider->id,
            'status' => AnandoRideBooking::STATUS_CONFIRMED,
            'price_total' => 1000,
            'commission_amount' => 150,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/financials/report')
            ->assertOk();

        $response->assertJsonPath('totals.commission_total', 600 + 225 + 300 + 150);
        $response->assertJsonPath('totals.driver_earnings_total', 3400 + 1275 + 1700 + 850);
        $response->assertJsonPath('totals.gross_revenue', 4000 + 1500 + 2000 + 1000);
        $response->assertJsonPath('totals.rider_spending_total', 4000 + 1500 + 2000 + 1000);
        $response->assertJsonPath('totals.trips_count', 1);
        $response->assertJsonPath('totals.dem_legui_count', 1);
        $response->assertJsonPath('totals.deliveries_count', 1);
        $response->assertJsonPath('totals.anando_count', 1);
        $response->assertJsonPath('totals.active_drivers_count', 1);
        $response->assertJsonPath('totals.active_riders_count', 1);

        $byService = collect($response->json('by_service'))->keyBy('service');
        $this->assertSame(600, $byService['trip']['commission']);
        $this->assertSame(225, $byService['dem_legui']['commission']);
        $this->assertSame(300, $byService['delivery']['commission']);
        $this->assertSame(150, $byService['anando']['commission']);

        $byVehicleCategory = collect($response->json('by_vehicle_category'))->keyBy('ride_type');
        $this->assertSame(1, $byVehicleCategory['comfort']['count']);
        $this->assertSame(0, $byVehicleCategory['standard']['count']);

        $byDestination = collect($response->json('by_destination'));
        $this->assertTrue($byDestination->contains(fn ($row) => $row['city'] === $destination->name));

        $byDriver = collect($response->json('by_driver'));
        $this->assertSame(1, $byDriver->count());
        $this->assertSame(3400 + 1275 + 1700 + 850, $byDriver->first()['driver_earnings']);
    }

    public function test_report_excludes_items_outside_the_requested_date_range(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $driver = User::factory()->driver()->create();
        $rider = User::factory()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();

        $oldTrip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
            'updated_at' => now()->subDays(60),
        ]);
        Booking::factory()->create(['trip_id' => $oldTrip->id, 'rider_id' => $rider->id, 'fare_total' => 5000, 'commission_amount' => 750, 'status' => Booking::STATUS_CONFIRMED]);

        // Default range is the last 30 days — the 60-day-old trip must not appear.
        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/financials/report')->assertOk();
        $response->assertJsonPath('totals.trips_count', 0);
        $response->assertJsonPath('totals.commission_total', 0);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/financials/report?from='.now()->subDays(90)->toDateString())
            ->assertOk();
        $response->assertJsonPath('totals.trips_count', 1);
        $response->assertJsonPath('totals.commission_total', 750);
    }
}
