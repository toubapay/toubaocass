<?php

namespace Tests\Feature\Anando;

use App\Models\AnandoRide;
use App\Models\AnandoRideBooking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TerminateStaleAnandoRidesCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_open_ride_posted_more_than_5_hours_ago_is_auto_completed(): void
    {
        $ride = AnandoRide::factory()->create([
            'status' => AnandoRide::STATUS_OPEN,
            'created_at' => now()->subHours(6),
        ]);

        $this->artisan('anando:terminate-stale')->assertExitCode(0);

        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'status' => 'completed']);
        $this->assertNotNull($ride->fresh()->completed_at);
    }

    public function test_full_and_in_progress_rides_posted_more_than_5_hours_ago_are_also_completed(): void
    {
        foreach ([AnandoRide::STATUS_FULL, AnandoRide::STATUS_IN_PROGRESS] as $status) {
            $ride = AnandoRide::factory()->create([
                'status' => $status,
                'created_at' => now()->subHours(6),
            ]);

            $this->artisan('anando:terminate-stale');

            $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'status' => 'completed']);
        }
    }

    public function test_a_ride_posted_less_than_5_hours_ago_is_left_alone(): void
    {
        $ride = AnandoRide::factory()->create([
            'status' => AnandoRide::STATUS_OPEN,
            'created_at' => now()->subHours(4),
        ]);

        $this->artisan('anando:terminate-stale');

        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'status' => 'open']);
    }

    public function test_already_completed_or_cancelled_rides_are_left_alone(): void
    {
        foreach ([AnandoRide::STATUS_COMPLETED, AnandoRide::STATUS_CANCELLED] as $status) {
            $ride = AnandoRide::factory()->create([
                'status' => $status,
                'created_at' => now()->subHours(6),
            ]);

            $this->artisan('anando:terminate-stale');

            $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'status' => $status]);
        }
    }

    public function test_bookings_on_an_auto_terminated_ride_are_left_untouched(): void
    {
        $ride = AnandoRide::factory()->create([
            'status' => AnandoRide::STATUS_OPEN,
            'created_at' => now()->subHours(6),
        ]);
        $booking = AnandoRideBooking::factory()->create([
            'anando_ride_id' => $ride->id,
            'status' => AnandoRideBooking::STATUS_CONFIRMED,
        ]);

        $this->artisan('anando:terminate-stale');

        $this->assertDatabaseHas('anando_ride_bookings', ['id' => $booking->id, 'status' => 'confirmed']);
    }
}
