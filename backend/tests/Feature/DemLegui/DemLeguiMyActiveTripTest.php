<?php

namespace Tests\Feature\DemLegui;

use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiTrip;
use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemLeguiMyActiveTripTest extends TestCase
{
    use RefreshDatabase;

    private function driverWithCar(): User
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id]);
        Car::factory()->create(['driver_id' => $driver->id, 'is_active' => true]);

        return $driver;
    }

    private function createTrip(User $driver, string $status, ?\DateTimeInterface $createdAt = null): DemLeguiTrip
    {
        $car = Car::where('driver_id', $driver->id)->first();

        $trip = DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => City::factory()->create()->id,
            'total_seats' => $car->seats,
            'available_seats' => $car->seats,
            'price_per_seat' => 1000,
            'status' => $status,
        ]);

        if ($createdAt) {
            $trip->timestamps = false;
            $trip->created_at = $createdAt;
            $trip->save();
        }

        return $trip;
    }

    public function test_returns_null_when_the_driver_has_no_trips(): void
    {
        $driver = $this->driverWithCar();

        $this->actingAs($driver, 'sanctum')->getJson('/api/driver/dem-legui/trips/mine/active')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_returns_the_open_trip(): void
    {
        $driver = $this->driverWithCar();
        $trip = $this->createTrip($driver, DemLeguiTrip::STATUS_OPEN);

        $this->actingAs($driver, 'sanctum')->getJson('/api/driver/dem-legui/trips/mine/active')
            ->assertOk()
            ->assertJsonPath('data.id', $trip->id)
            ->assertJsonPath('data.status', 'open');
    }

    public function test_returns_the_in_progress_trip(): void
    {
        $driver = $this->driverWithCar();
        $trip = $this->createTrip($driver, DemLeguiTrip::STATUS_IN_PROGRESS);

        $this->actingAs($driver, 'sanctum')->getJson('/api/driver/dem-legui/trips/mine/active')
            ->assertOk()
            ->assertJsonPath('data.id', $trip->id);
    }

    public function test_a_completed_or_cancelled_trip_is_not_returned(): void
    {
        $driver = $this->driverWithCar();
        $this->createTrip($driver, DemLeguiTrip::STATUS_COMPLETED);
        $this->createTrip($driver, DemLeguiTrip::STATUS_CANCELLED);

        $this->actingAs($driver, 'sanctum')->getJson('/api/driver/dem-legui/trips/mine/active')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_another_drivers_active_trip_is_never_returned(): void
    {
        $driver = $this->driverWithCar();
        $otherDriver = $this->driverWithCar();
        $this->createTrip($otherDriver, DemLeguiTrip::STATUS_OPEN);

        $this->actingAs($driver, 'sanctum')->getJson('/api/driver/dem-legui/trips/mine/active')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    /**
     * myTrips() sorts by creation date and paginates 20 per page — a driver
     * with a long history could have their still-open trip pushed past the
     * first page if it's old enough relative to newer completed ones. This
     * reproduces exactly that shape and proves myActiveTrip() finds the
     * trip regardless, since it filters by status directly instead of
     * scanning a page of "my trips".
     */
    public function test_an_old_open_trip_is_found_even_behind_25_newer_completed_trips(): void
    {
        $driver = $this->driverWithCar();

        $activeTrip = $this->createTrip($driver, DemLeguiTrip::STATUS_OPEN, now()->subDays(30));

        for ($i = 0; $i < 25; $i++) {
            $this->createTrip($driver, DemLeguiTrip::STATUS_COMPLETED, now()->subDays(29 - $i));
        }

        // Confirms the scenario is real: the old active trip is indeed off
        // the first page of myTrips().
        $mineResponse = $this->actingAs($driver, 'sanctum')->getJson('/api/driver/dem-legui/trips/mine')->assertOk();
        $mineIds = collect($mineResponse->json('data'))->pluck('id');
        $this->assertFalse($mineIds->contains($activeTrip->id));

        $this->actingAs($driver, 'sanctum')->getJson('/api/driver/dem-legui/trips/mine/active')
            ->assertOk()
            ->assertJsonPath('data.id', $activeTrip->id);
    }
}
