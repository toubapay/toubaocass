<?php

namespace Tests\Feature\Trip;

use App\Models\Car;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TripSearchTest extends TestCase
{
    use RefreshDatabase;

    private function makeApprovedDriverWithCar(): array
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => 4]);

        return [$driver, $car];
    }

    public function test_search_excludes_a_trip_with_a_departure_date_in_the_past(): void
    {
        [$driver, $car] = $this->makeApprovedDriverWithCar();

        $pastTrip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'departure_date' => now()->subDay()->toDateString(),
            'departure_time' => '10:00',
        ]);
        $futureTrip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'departure_date' => now()->addDay()->toDateString(),
            'departure_time' => '10:00',
        ]);

        $rider = User::factory()->create();
        $response = $this->actingAs($rider, 'sanctum')->getJson('/api/trips')->assertOk();

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertFalse($ids->contains($pastTrip->id));
        $this->assertTrue($ids->contains($futureTrip->id));
    }

    public function test_search_excludes_a_trip_departing_earlier_today(): void
    {
        // Frozen at a safe mid-day instant so +/-1 hour never crosses a
        // calendar day boundary (which would otherwise make this test flaky
        // depending on what time it actually runs).
        $this->travelTo(now()->setTime(12, 0));

        [$driver, $car] = $this->makeApprovedDriverWithCar();

        $alreadyDeparted = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'departure_date' => now()->toDateString(),
            'departure_time' => now()->subHour()->format('H:i'),
        ]);
        $departingLaterToday = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'departure_date' => now()->toDateString(),
            'departure_time' => now()->addHour()->format('H:i'),
        ]);

        $rider = User::factory()->create();
        $response = $this->actingAs($rider, 'sanctum')->getJson('/api/trips')->assertOk();

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertFalse($ids->contains($alreadyDeparted->id));
        $this->assertTrue($ids->contains($departingLaterToday->id));
    }
}
