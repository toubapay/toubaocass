<?php

namespace Tests\Feature\Rider;

use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\Delivery;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpendingReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_reports_total_spent_and_breakdown_by_service_for_the_current_rider_only(): void
    {
        $rider = User::factory()->create();
        $otherRider = User::factory()->create();
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();

        $trip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
        ]);
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'fare_total' => 3000, 'status' => Booking::STATUS_CONFIRMED]);
        // A different rider's booking on the same trip must not count.
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $otherRider->id, 'fare_total' => 9000, 'status' => Booking::STATUS_CONFIRMED]);

        Delivery::factory()->create(['sender_id' => $rider->id, 'driver_id' => $driver->id, 'status' => Delivery::STATUS_DELIVERED, 'fee' => 1500, 'delivered_at' => now()]);

        $response = $this->actingAs($rider, 'sanctum')
            ->getJson('/api/me/spending-report?range=month')
            ->assertOk();

        $response->assertJsonPath('range', 'month');
        $response->assertJsonPath('total_spent', 4500);
        $response->assertJsonPath('items_count', 2);

        $byService = collect($response->json('by_service'))->keyBy('service');
        $this->assertSame(3000, $byService['trip']['amount']);
        $this->assertSame(1500, $byService['delivery']['amount']);
        $this->assertSame(0, $byService['dem_legui']['amount']);
        $this->assertSame(0, $byService['anando']['amount']);

        $this->assertNotEmpty($response->json('by_period'));

        $items = collect($response->json('items'))->keyBy('type');
        $this->assertCount(2, $items);
        $this->assertSame(3000, $items['trip']['amount']);
        $this->assertSame($driver->name, $items['trip']['counterparty_name']);
        $this->assertSame($destination->name, $items['trip']['destination']);
        $this->assertNotNull($items['trip']['completed_at']);
        $this->assertSame(1500, $items['delivery']['amount']);
        $this->assertSame($driver->name, $items['delivery']['counterparty_name']);
    }

    public function test_week_and_year_ranges_are_accepted(): void
    {
        $rider = User::factory()->create();

        $this->actingAs($rider, 'sanctum')->getJson('/api/me/spending-report?range=week')->assertOk()->assertJsonPath('range', 'week');
        $this->actingAs($rider, 'sanctum')->getJson('/api/me/spending-report?range=year')->assertOk()->assertJsonPath('range', 'year');
        // An unrecognized range falls back to month rather than erroring.
        $this->actingAs($rider, 'sanctum')->getJson('/api/me/spending-report?range=bogus')->assertOk()->assertJsonPath('range', 'month');
    }
}
