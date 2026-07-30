<?php

namespace Tests\Feature\Trip;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TripArrivedTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_can_mark_arrived_while_the_trip_is_scheduled(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_SCHEDULED]);

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/arrived")
            ->assertOk()
            ->assertJsonPath('id', $trip->id);

        $trip->refresh();
        $this->assertNotNull($trip->arrived_at);
    }

    public function test_only_the_owning_driver_can_mark_arrived(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_SCHEDULED]);
        $stranger = User::factory()->driver()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/arrived")
            ->assertForbidden();
    }

    public function test_arrived_cannot_be_marked_once_in_progress_or_finished(): void
    {
        foreach ([Trip::STATUS_IN_PROGRESS, Trip::STATUS_COMPLETED, Trip::STATUS_CANCELLED] as $status) {
            $trip = Trip::factory()->create(['status' => $status]);

            $this->actingAs($trip->driver, 'sanctum')
                ->postJson("/api/driver/trips/{$trip->id}/arrived")
                ->assertUnprocessable();
        }
    }

    public function test_the_rider_sees_the_arrived_timestamp_via_show(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_FULL]);
        $rider = User::factory()->create();

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/arrived")
            ->assertOk();

        $response = $this->actingAs($rider, 'sanctum')
            ->getJson("/api/trips/{$trip->id}")
            ->assertOk();

        $this->assertNotNull($response->json('arrived_at'));
    }
}
