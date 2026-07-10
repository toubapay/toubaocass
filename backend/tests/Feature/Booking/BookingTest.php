<?php

namespace Tests\Feature\Booking;

use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\Trip;
use App\Models\User;
use App\Notifications\TripFullNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    private function makeTrip(int $seats = 4): Trip
    {
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => $seats]);
        [$origin, $destination] = City::factory()->count(2)->create();

        return Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'total_seats' => $seats,
            'available_seats' => $seats,
        ]);
    }

    public function test_rider_can_book_available_seats(): void
    {
        $trip = $this->makeTrip(4);
        $rider = User::factory()->create();

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2])
            ->assertCreated()
            ->assertJsonPath('seats_booked', 2);

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'available_seats' => 2, 'status' => 'scheduled']);
    }

    public function test_booking_all_seats_marks_the_trip_full_and_notifies_driver(): void
    {
        Notification::fake();

        $trip = $this->makeTrip(4);
        $rider = User::factory()->create();

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 4])
            ->assertCreated();

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'available_seats' => 0, 'status' => 'full']);

        Notification::assertSentTo($trip->driver, TripFullNotification::class);
    }

    public function test_rider_cannot_book_more_seats_than_available(): void
    {
        $trip = $this->makeTrip(4);
        $rider = User::factory()->create();

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 5])
            ->assertUnprocessable();

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'available_seats' => 4]);
    }

    public function test_a_full_trip_rejects_further_bookings(): void
    {
        $trip = $this->makeTrip(2);
        $riderA = User::factory()->create();
        $riderB = User::factory()->create();

        $this->actingAs($riderA, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2])
            ->assertCreated();

        $this->actingAs($riderB, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('trip');
    }

    public function test_a_driver_account_cannot_use_the_rider_booking_endpoint(): void
    {
        $trip = $this->makeTrip(4);

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 1])
            ->assertForbidden();
    }

    public function test_cancelling_a_booking_frees_the_seats_and_reopens_a_full_trip(): void
    {
        $trip = $this->makeTrip(2);
        $rider = User::factory()->create();

        $booking = $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2])
            ->assertCreated()
            ->json();

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'status' => 'full']);

        $this->actingAs($rider, 'sanctum')
            ->deleteJson("/api/bookings/{$booking['id']}")
            ->assertOk();

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'available_seats' => 2, 'status' => 'scheduled']);
        $this->assertDatabaseHas('bookings', ['id' => $booking['id'], 'status' => 'cancelled']);
    }

    public function test_rider_cannot_cancel_another_riders_booking(): void
    {
        $trip = $this->makeTrip(4);
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $booking = Booking::factory()->create([
            'trip_id' => $trip->id,
            'rider_id' => $owner->id,
            'seats_booked' => 1,
        ]);

        $this->actingAs($intruder, 'sanctum')
            ->deleteJson("/api/bookings/{$booking->id}")
            ->assertForbidden();
    }

    public function test_search_results_surface_the_riders_own_booking_on_a_trip(): void
    {
        $trip = $this->makeTrip(4);
        $rider = User::factory()->create();

        $booking = $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2])
            ->json();

        $response = $this->actingAs($rider, 'sanctum')->getJson('/api/trips');

        $response->assertOk();
        $tripPayload = collect($response->json('data'))->firstWhere('id', $trip->id);
        $this->assertNotNull($tripPayload);
        $this->assertSame($booking['id'], $tripPayload['my_booking']['id']);
        $this->assertSame(2, $tripPayload['my_booking']['seats_booked']);

        $otherRider = User::factory()->create();
        $otherResponse = $this->actingAs($otherRider, 'sanctum')->getJson('/api/trips');
        $otherTripPayload = collect($otherResponse->json('data'))->firstWhere('id', $trip->id);
        $this->assertNull($otherTripPayload['my_booking']);
    }

    public function test_rider_can_increase_seats_on_their_booking(): void
    {
        $trip = $this->makeTrip(4);
        $rider = User::factory()->create();

        $booking = $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2])
            ->json();

        $this->actingAs($rider, 'sanctum')
            ->putJson("/api/bookings/{$booking['id']}", ['seats' => 4])
            ->assertOk()
            ->assertJsonPath('seats_booked', 4)
            ->assertJsonPath('fare_total', $trip->fare * 4);

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'available_seats' => 0, 'status' => 'full']);
    }

    public function test_rider_cannot_increase_seats_beyond_availability(): void
    {
        $trip = $this->makeTrip(4);
        $rider = User::factory()->create();
        $otherRider = User::factory()->create();

        $booking = $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2])
            ->json();

        $this->actingAs($otherRider, 'sanctum')->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 1]);

        $this->actingAs($rider, 'sanctum')
            ->putJson("/api/bookings/{$booking['id']}", ['seats' => 4])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('seats');

        $this->assertDatabaseHas('bookings', ['id' => $booking['id'], 'seats_booked' => 2]);
    }

    public function test_rider_can_release_a_seat_and_it_reopens_a_full_trip(): void
    {
        $trip = $this->makeTrip(2);
        $rider = User::factory()->create();

        $booking = $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2])
            ->json();

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'status' => 'full']);

        $this->actingAs($rider, 'sanctum')
            ->putJson("/api/bookings/{$booking['id']}", ['seats' => 1])
            ->assertOk()
            ->assertJsonPath('seats_booked', 1);

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'available_seats' => 1, 'status' => 'scheduled']);
    }

    public function test_reducing_a_booking_to_zero_seats_cancels_it(): void
    {
        $trip = $this->makeTrip(4);
        $rider = User::factory()->create();

        $booking = $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2])
            ->json();

        $this->actingAs($rider, 'sanctum')
            ->putJson("/api/bookings/{$booking['id']}", ['seats' => 0])
            ->assertOk();

        $this->assertDatabaseHas('bookings', ['id' => $booking['id'], 'status' => 'cancelled']);
        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'available_seats' => 4]);
    }

    public function test_rider_cannot_modify_another_riders_booking(): void
    {
        $trip = $this->makeTrip(4);
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $booking = Booking::factory()->create([
            'trip_id' => $trip->id,
            'rider_id' => $owner->id,
            'seats_booked' => 1,
        ]);

        $this->actingAs($intruder, 'sanctum')
            ->putJson("/api/bookings/{$booking->id}", ['seats' => 2])
            ->assertForbidden();
    }

    public function test_driver_cancelling_a_trip_cancels_confirmed_bookings(): void
    {
        $trip = $this->makeTrip(4);
        $rider = User::factory()->create();

        $booking = $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/bookings", ['seats' => 2])
            ->json();

        $this->actingAs($trip->driver, 'sanctum')
            ->deleteJson("/api/driver/trips/{$trip->id}")
            ->assertOk();

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'status' => 'cancelled']);
        $this->assertDatabaseHas('bookings', ['id' => $booking['id'], 'status' => 'cancelled']);
    }
}
