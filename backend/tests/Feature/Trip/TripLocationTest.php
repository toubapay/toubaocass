<?php

namespace Tests\Feature\Trip;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TripLocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_can_report_location_while_the_trip_is_in_progress(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/location", ['latitude' => 14.6928, 'longitude' => -17.4467])
            ->assertOk();

        $trip->refresh();
        $this->assertSame(14.6928, $trip->current_latitude);
        $this->assertSame(-17.4467, $trip->current_longitude);
        $this->assertNotNull($trip->current_location_updated_at);
    }

    public function test_only_the_owning_driver_can_report_location(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);
        $stranger = User::factory()->driver()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/location", ['latitude' => 14.6928, 'longitude' => -17.4467])
            ->assertForbidden();
    }

    public function test_location_cannot_be_reported_unless_the_trip_is_in_progress(): void
    {
        foreach ([Trip::STATUS_SCHEDULED, Trip::STATUS_FULL, Trip::STATUS_COMPLETED, Trip::STATUS_CANCELLED] as $status) {
            $trip = Trip::factory()->create(['status' => $status]);

            $this->actingAs($trip->driver, 'sanctum')
                ->postJson("/api/driver/trips/{$trip->id}/location", ['latitude' => 14.6928, 'longitude' => -17.4467])
                ->assertUnprocessable();
        }
    }

    public function test_location_update_rejects_out_of_range_coordinates(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/location", ['latitude' => 200, 'longitude' => -17.4467])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('latitude');
    }

    public function test_the_rider_sees_the_reported_location_via_show(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);
        $rider = User::factory()->create();

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/location", ['latitude' => 14.6928, 'longitude' => -17.4467])
            ->assertOk();

        $this->actingAs($rider, 'sanctum')
            ->getJson("/api/trips/{$trip->id}")
            ->assertOk()
            ->assertJsonPath('current_latitude', 14.6928)
            ->assertJsonPath('current_longitude', -17.4467);
    }
}
