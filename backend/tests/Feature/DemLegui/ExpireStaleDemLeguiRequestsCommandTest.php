<?php

namespace Tests\Feature\DemLegui;

use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpireStaleDemLeguiRequestsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_pending_request_older_than_the_active_window_is_expired(): void
    {
        $request = DemLeguiRequest::factory()->create(['status' => DemLeguiRequest::STATUS_PENDING]);
        $request->timestamps = false;
        $request->created_at = now()->subMinutes(DemLeguiRequest::ACTIVE_WINDOW_MINUTES + 1);
        $request->save();

        $this->artisan('dem-legui:expire-stale-requests')->assertExitCode(0);

        $this->assertDatabaseHas('dem_legui_requests', ['id' => $request->id, 'status' => DemLeguiRequest::STATUS_EXPIRED]);
    }

    public function test_a_recent_pending_request_is_left_alone(): void
    {
        $request = DemLeguiRequest::factory()->create(['status' => DemLeguiRequest::STATUS_PENDING]);

        $this->artisan('dem-legui:expire-stale-requests');

        $this->assertDatabaseHas('dem_legui_requests', ['id' => $request->id, 'status' => DemLeguiRequest::STATUS_PENDING]);
    }

    public function test_a_matched_request_is_never_expired_even_if_old(): void
    {
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $trip = DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => City::factory()->create()->id,
            'total_seats' => $car->seats,
            'available_seats' => $car->seats,
            'price_per_seat' => 1000,
            'status' => DemLeguiTrip::STATUS_OPEN,
        ]);
        $request = DemLeguiRequest::factory()->create(['status' => DemLeguiRequest::STATUS_MATCHED, 'dem_legui_trip_id' => $trip->id]);
        $request->timestamps = false;
        $request->created_at = now()->subMinutes(DemLeguiRequest::ACTIVE_WINDOW_MINUTES + 60);
        $request->save();

        $this->artisan('dem-legui:expire-stale-requests');

        $this->assertDatabaseHas('dem_legui_requests', ['id' => $request->id, 'status' => DemLeguiRequest::STATUS_MATCHED]);
    }

    public function test_expiring_frees_the_rider_to_post_a_new_request(): void
    {
        $rider = User::factory()->create();
        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'status' => DemLeguiRequest::STATUS_PENDING]);
        $request->timestamps = false;
        $request->created_at = now()->subMinutes(DemLeguiRequest::ACTIVE_WINDOW_MINUTES + 1);
        $request->save();

        $this->assertTrue($rider->demLeguiRequests()->active()->exists());

        $this->artisan('dem-legui:expire-stale-requests');

        $this->assertFalse($rider->demLeguiRequests()->active()->exists());
    }
}
