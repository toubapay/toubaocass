<?php

namespace Tests\Feature\DemLegui;

use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiTrip;
use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemLeguiTripHistoryTest extends TestCase
{
    use RefreshDatabase;

    private function driverWithCar(): User
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id]);
        Car::factory()->create(['driver_id' => $driver->id, 'is_active' => true]);

        return $driver;
    }

    private function createTrip(User $driver, string $status): DemLeguiTrip
    {
        $car = Car::where('driver_id', $driver->id)->first();

        return DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => City::factory()->create()->id,
            'total_seats' => $car->seats,
            'available_seats' => $car->seats,
            'price_per_seat' => 1000,
            'status' => $status,
        ]);
    }

    public function test_historic_only_returns_completed_and_cancelled_trips(): void
    {
        $driver = $this->driverWithCar();
        $completed = $this->createTrip($driver, DemLeguiTrip::STATUS_COMPLETED);
        $cancelled = $this->createTrip($driver, DemLeguiTrip::STATUS_CANCELLED);
        $this->createTrip($driver, DemLeguiTrip::STATUS_OPEN);
        $this->createTrip($driver, DemLeguiTrip::STATUS_IN_PROGRESS);

        $response = $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/dem-legui/trips/mine?historic=1')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertEqualsCanonicalizing([$completed->id, $cancelled->id], $ids->all());
    }

    public function test_without_historic_param_all_statuses_are_returned(): void
    {
        $driver = $this->driverWithCar();
        $this->createTrip($driver, DemLeguiTrip::STATUS_COMPLETED);
        $this->createTrip($driver, DemLeguiTrip::STATUS_OPEN);

        $response = $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/dem-legui/trips/mine')
            ->assertOk();

        $this->assertCount(2, $response->json('data'));
    }

    public function test_another_drivers_trips_are_never_returned(): void
    {
        $driver = $this->driverWithCar();
        $otherDriver = $this->driverWithCar();
        $this->createTrip($otherDriver, DemLeguiTrip::STATUS_COMPLETED);

        $response = $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/dem-legui/trips/mine?historic=1')
            ->assertOk();

        $this->assertCount(0, $response->json('data'));
    }
}
