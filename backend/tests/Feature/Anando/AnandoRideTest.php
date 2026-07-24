<?php

namespace Tests\Feature\Anando;

use App\Models\AnandoRide;
use App\Models\AnandoRideBooking;
use App\Models\City;
use App\Models\User;
use App\Models\Wallet;
use App\Notifications\AnandoBookingConfirmedNotification;
use App\Notifications\AnandoRideJoinedNotification;
use App\Notifications\AnandoRidePostedNotification;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AnandoRideTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        $origin = City::factory()->create();
        $destination = City::factory()->create();

        return [
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'departure_point' => 'Sacré-Cœur 3, Dakar',
            'price_per_seat' => 1500,
            'total_seats' => 3,
            ...$overrides,
        ];
    }

    public function test_any_authenticated_user_rider_or_driver_can_post_an_anando_ride(): void
    {
        foreach ([User::factory()->create(), User::factory()->driver()->create()] as $user) {
            $response = $this->actingAs($user, 'sanctum')
                ->postJson('/api/anando-rides', $this->payload())
                ->assertCreated();

            $response->assertJsonPath('poster.id', $user->id)
                ->assertJsonPath('status', 'open')
                ->assertJsonPath('available_seats', 3)
                ->assertJsonPath('total_seats', 3);
        }
    }

    public function test_posting_requires_different_origin_and_destination(): void
    {
        $user = User::factory()->create();
        $city = City::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/anando-rides', $this->payload([
                'origin_city_id' => $city->id,
                'destination_city_id' => $city->id,
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('destination_city_id');
    }

    public function test_posting_dispatches_a_broadcast_notification_to_other_users_with_fcm_tokens(): void
    {
        Notification::fake();

        $poster = User::factory()->create(['fcm_token' => 'poster-token']);
        $other = User::factory()->create(['fcm_token' => 'other-token']);
        $noToken = User::factory()->create(['fcm_token' => null]);

        $this->actingAs($poster, 'sanctum')
            ->postJson('/api/anando-rides', $this->payload())
            ->assertCreated();

        Notification::assertSentTo($other, AnandoRidePostedNotification::class);
        Notification::assertNotSentTo($poster, AnandoRidePostedNotification::class);
        Notification::assertNotSentTo($noToken, AnandoRidePostedNotification::class);
    }

    public function test_index_lists_open_rides_excluding_the_current_users_own_rides(): void
    {
        $user = User::factory()->create();
        $ownRide = AnandoRide::factory()->create(['user_id' => $user->id]);
        $othersOpenRide = AnandoRide::factory()->create(['status' => AnandoRide::STATUS_OPEN]);
        $othersCancelledRide = AnandoRide::factory()->create(['status' => AnandoRide::STATUS_CANCELLED]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/anando-rides')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id');

        $this->assertTrue($ids->contains($othersOpenRide->id));
        $this->assertFalse($ids->contains($ownRide->id));
        $this->assertFalse($ids->contains($othersCancelledRide->id));
    }

    public function test_a_user_cannot_join_their_own_ride(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id]);

        $this->actingAs($poster, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 1])
            ->assertUnprocessable();
    }

    public function test_joining_creates_a_confirmed_booking_and_decrements_available_seats(): void
    {
        Notification::fake();
        $poster = User::factory()->create(['fcm_token' => 'poster-token']);
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'total_seats' => 3, 'available_seats' => 3, 'price_per_seat' => 1000]);
        $joiner = User::factory()->create();

        $response = $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 2])
            ->assertCreated();

        $response->assertJsonPath('seats_booked', 2)
            ->assertJsonPath('price_total', 2000)
            ->assertJsonPath('status', 'confirmed');

        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'available_seats' => 1, 'status' => 'open']);
        Notification::assertSentTo($ride->poster, AnandoRideJoinedNotification::class);
    }

    public function test_joiner_receives_a_booking_confirmation_notification(): void
    {
        Notification::fake();
        $poster = User::factory()->create(['fcm_token' => 'poster-token']);
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'total_seats' => 3, 'available_seats' => 3]);
        $joiner = User::factory()->create(['fcm_token' => 'joiner-token']);

        $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 1])
            ->assertCreated();

        Notification::assertSentTo($joiner, AnandoBookingConfirmedNotification::class);
    }

    public function test_joiner_without_fcm_token_is_skipped_for_booking_confirmation(): void
    {
        Notification::fake();
        $ride = AnandoRide::factory()->create(['total_seats' => 3, 'available_seats' => 3]);
        $joiner = User::factory()->create(['fcm_token' => null]);

        $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 1])
            ->assertCreated();

        Notification::assertNotSentTo($joiner, AnandoBookingConfirmedNotification::class);
    }

    public function test_ride_flips_to_full_once_all_seats_are_taken(): void
    {
        $ride = AnandoRide::factory()->create(['total_seats' => 2, 'available_seats' => 2]);
        $joiner = User::factory()->create();

        $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 2])
            ->assertCreated();

        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'available_seats' => 0, 'status' => 'full']);
    }

    public function test_joining_fails_if_not_enough_seats_are_available(): void
    {
        $ride = AnandoRide::factory()->create(['total_seats' => 2, 'available_seats' => 1]);
        $joiner = User::factory()->create();

        $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 2])
            ->assertUnprocessable();

        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'available_seats' => 1]);
    }

    public function test_a_user_cannot_join_the_same_ride_twice(): void
    {
        $ride = AnandoRide::factory()->create(['total_seats' => 4, 'available_seats' => 4]);
        $joiner = User::factory()->create();

        $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 1])
            ->assertCreated();

        $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 1])
            ->assertUnprocessable();
    }

    public function test_joining_with_wallet_charges_joiner_and_credits_poster(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'price_per_seat' => 1500, 'total_seats' => 3, 'available_seats' => 3]);

        $joiner = User::factory()->create();
        app(WalletService::class)->topUp($joiner, 10000);

        $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 2, 'payment_method' => 'wallet'])
            ->assertCreated();

        $this->assertSame(7000, Wallet::where('user_id', $joiner->id)->value('balance'));
        $this->assertSame(3000, Wallet::where('user_id', $poster->id)->value('balance'));
    }

    public function test_joining_with_wallet_fails_if_balance_is_insufficient(): void
    {
        $ride = AnandoRide::factory()->create(['price_per_seat' => 1500, 'total_seats' => 3, 'available_seats' => 3]);

        $joiner = User::factory()->create();
        app(WalletService::class)->topUp($joiner, 1000);

        $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 1, 'payment_method' => 'wallet'])
            ->assertUnprocessable();

        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'available_seats' => 3]);
        $this->assertSame(1000, Wallet::where('user_id', $joiner->id)->value('balance'));
    }

    public function test_only_the_poster_can_cancel_the_ride(): void
    {
        $ride = AnandoRide::factory()->create();
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->deleteJson("/api/anando-rides/{$ride->id}")
            ->assertNotFound();
    }

    public function test_cancelling_a_ride_refunds_wallet_bookings_and_cancels_them(): void
    {
        $poster = User::factory()->create();
        app(WalletService::class)->topUp($poster, 5000);
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'price_per_seat' => 1000, 'total_seats' => 2, 'available_seats' => 2]);

        $joiner = User::factory()->create();
        app(WalletService::class)->topUp($joiner, 5000);

        $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 2, 'payment_method' => 'wallet'])
            ->assertCreated();

        $this->assertSame(3000, Wallet::where('user_id', $joiner->id)->value('balance'));
        $this->assertSame(7000, Wallet::where('user_id', $poster->id)->value('balance'));

        $this->actingAs($poster, 'sanctum')
            ->deleteJson("/api/anando-rides/{$ride->id}")
            ->assertOk();

        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'status' => 'cancelled']);
        $this->assertDatabaseHas('anando_ride_bookings', ['anando_ride_id' => $ride->id, 'status' => 'cancelled']);
        $this->assertSame(5000, Wallet::where('user_id', $joiner->id)->value('balance'));
        $this->assertSame(5000, Wallet::where('user_id', $poster->id)->value('balance'));
    }

    public function test_a_joiner_can_cancel_their_own_booking_and_the_seat_reopens(): void
    {
        $ride = AnandoRide::factory()->create(['total_seats' => 2, 'available_seats' => 2]);
        $joiner = User::factory()->create();

        $bookingId = $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 2])
            ->assertCreated()
            ->json('id');

        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'status' => 'full', 'available_seats' => 0]);

        $this->actingAs($joiner, 'sanctum')
            ->deleteJson("/api/anando-ride-bookings/{$bookingId}")
            ->assertOk();

        $this->assertDatabaseHas('anando_ride_bookings', ['id' => $bookingId, 'status' => 'cancelled']);
        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'status' => 'open', 'available_seats' => 2]);
    }

    public function test_only_the_booking_owner_can_cancel_their_booking(): void
    {
        $ride = AnandoRide::factory()->create(['total_seats' => 2, 'available_seats' => 2]);
        $joiner = User::factory()->create();
        $stranger = User::factory()->create();

        $bookingId = $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 1])
            ->assertCreated()
            ->json('id');

        $this->actingAs($stranger, 'sanctum')
            ->deleteJson("/api/anando-ride-bookings/{$bookingId}")
            ->assertNotFound();
    }

    public function test_joiner_can_increase_seats_on_their_booking(): void
    {
        $ride = AnandoRide::factory()->create(['price_per_seat' => 1000, 'total_seats' => 4, 'available_seats' => 4]);
        $joiner = User::factory()->create();

        $bookingId = $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 1])
            ->assertCreated()
            ->json('id');

        $this->actingAs($joiner, 'sanctum')
            ->putJson("/api/anando-ride-bookings/{$bookingId}", ['seats' => 3])
            ->assertOk()
            ->assertJsonPath('seats_booked', 3)
            ->assertJsonPath('price_total', 3000);

        $this->assertDatabaseHas('anando_ride_bookings', ['id' => $bookingId, 'seats_booked' => 3, 'price_total' => 3000]);
        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'available_seats' => 1]);
    }

    public function test_joiner_can_decrease_seats_on_their_booking_and_ride_reopens(): void
    {
        $ride = AnandoRide::factory()->create(['price_per_seat' => 1000, 'total_seats' => 2, 'available_seats' => 2]);
        $joiner = User::factory()->create();

        $bookingId = $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 2])
            ->assertCreated()
            ->json('id');

        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'status' => 'full', 'available_seats' => 0]);

        $this->actingAs($joiner, 'sanctum')
            ->putJson("/api/anando-ride-bookings/{$bookingId}", ['seats' => 1])
            ->assertOk()
            ->assertJsonPath('seats_booked', 1)
            ->assertJsonPath('price_total', 1000);

        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'status' => 'open', 'available_seats' => 1]);
    }

    public function test_increasing_seats_fails_if_not_enough_are_available(): void
    {
        $otherJoiner = User::factory()->create();
        $ride = AnandoRide::factory()->create(['price_per_seat' => 1000, 'total_seats' => 3, 'available_seats' => 3]);
        $joiner = User::factory()->create();

        $bookingId = $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 1])
            ->assertCreated()
            ->json('id');

        $this->actingAs($otherJoiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 2])
            ->assertCreated();

        $this->actingAs($joiner, 'sanctum')
            ->putJson("/api/anando-ride-bookings/{$bookingId}", ['seats' => 2])
            ->assertUnprocessable();

        $this->assertDatabaseHas('anando_ride_bookings', ['id' => $bookingId, 'seats_booked' => 1]);
    }

    public function test_setting_seats_to_zero_cancels_the_booking(): void
    {
        $ride = AnandoRide::factory()->create(['total_seats' => 2, 'available_seats' => 2]);
        $joiner = User::factory()->create();

        $bookingId = $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 2])
            ->assertCreated()
            ->json('id');

        $this->actingAs($joiner, 'sanctum')
            ->putJson("/api/anando-ride-bookings/{$bookingId}", ['seats' => 0])
            ->assertOk();

        $this->assertDatabaseHas('anando_ride_bookings', ['id' => $bookingId, 'status' => 'cancelled']);
        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'status' => 'open', 'available_seats' => 2]);
    }

    public function test_modifying_a_wallet_booking_charges_or_refunds_the_difference(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'price_per_seat' => 1000, 'total_seats' => 4, 'available_seats' => 4]);
        $joiner = User::factory()->create();
        app(WalletService::class)->topUp($joiner, 10000);

        $bookingId = $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 1, 'payment_method' => 'wallet'])
            ->assertCreated()
            ->json('id');

        // 10000 - 1000 = 9000 joiner, poster earned 1000.
        $this->assertSame(9000, Wallet::where('user_id', $joiner->id)->value('balance'));
        $this->assertSame(1000, Wallet::where('user_id', $poster->id)->value('balance'));

        $this->actingAs($joiner, 'sanctum')
            ->putJson("/api/anando-ride-bookings/{$bookingId}", ['seats' => 3])
            ->assertOk()
            ->assertJsonPath('price_total', 3000);

        // Charged an extra 2000: 9000 - 2000 = 7000; poster earns 2000 more: 1000 + 2000 = 3000.
        $this->assertSame(7000, Wallet::where('user_id', $joiner->id)->value('balance'));
        $this->assertSame(3000, Wallet::where('user_id', $poster->id)->value('balance'));

        $this->actingAs($joiner, 'sanctum')
            ->putJson("/api/anando-ride-bookings/{$bookingId}", ['seats' => 1])
            ->assertOk()
            ->assertJsonPath('price_total', 1000);

        // Refunded 2000: 7000 + 2000 = 9000; poster reversed 2000: 3000 - 2000 = 1000.
        $this->assertSame(9000, Wallet::where('user_id', $joiner->id)->value('balance'));
        $this->assertSame(1000, Wallet::where('user_id', $poster->id)->value('balance'));
    }

    public function test_only_the_booking_owner_can_modify_their_booking(): void
    {
        $ride = AnandoRide::factory()->create(['total_seats' => 3, 'available_seats' => 3]);
        $joiner = User::factory()->create();
        $stranger = User::factory()->create();

        $bookingId = $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 1])
            ->assertCreated()
            ->json('id');

        $this->actingAs($stranger, 'sanctum')
            ->putJson("/api/anando-ride-bookings/{$bookingId}", ['seats' => 2])
            ->assertNotFound();
    }

    public function test_show_exposes_my_booking_when_the_current_user_has_joined(): void
    {
        $ride = AnandoRide::factory()->create(['total_seats' => 3, 'available_seats' => 3]);
        $joiner = User::factory()->create();
        $stranger = User::factory()->create();

        $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/join", ['seats' => 2])
            ->assertCreated();

        $this->actingAs($joiner, 'sanctum')
            ->getJson("/api/anando-rides/{$ride->id}")
            ->assertOk()
            ->assertJsonPath('my_booking.seats_booked', 2);

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/anando-rides/{$ride->id}")
            ->assertOk()
            ->assertJsonPath('my_booking', null);
    }

    public function test_poster_can_start_a_ride_from_open_or_full(): void
    {
        $poster = User::factory()->create();
        foreach ([AnandoRide::STATUS_OPEN, AnandoRide::STATUS_FULL] as $status) {
            $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => $status]);

            $this->actingAs($poster, 'sanctum')
                ->postJson("/api/anando-rides/{$ride->id}/start")
                ->assertOk()
                ->assertJsonPath('status', 'in_progress');

            $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'status' => 'in_progress']);
            $this->assertNotNull($ride->fresh()->started_at);
        }
    }

    public function test_only_the_poster_can_start_the_ride(): void
    {
        $ride = AnandoRide::factory()->create(['status' => AnandoRide::STATUS_FULL]);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/start")
            ->assertNotFound();
    }

    public function test_a_cancelled_or_completed_ride_cannot_be_started(): void
    {
        $poster = User::factory()->create();
        foreach ([AnandoRide::STATUS_CANCELLED, AnandoRide::STATUS_COMPLETED] as $status) {
            $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => $status]);

            $this->actingAs($poster, 'sanctum')
                ->postJson("/api/anando-rides/{$ride->id}/start")
                ->assertUnprocessable();
        }
    }

    public function test_poster_can_complete_an_in_progress_ride(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => AnandoRide::STATUS_IN_PROGRESS]);

        $this->actingAs($poster, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/complete")
            ->assertOk()
            ->assertJsonPath('status', 'completed');

        $this->assertDatabaseHas('anando_rides', ['id' => $ride->id, 'status' => 'completed']);
        $this->assertNotNull($ride->fresh()->completed_at);
    }

    public function test_a_ride_that_has_not_started_cannot_be_completed(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => AnandoRide::STATUS_FULL]);

        $this->actingAs($poster, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/complete")
            ->assertUnprocessable();
    }

    public function test_only_the_poster_can_complete_the_ride(): void
    {
        $ride = AnandoRide::factory()->create(['status' => AnandoRide::STATUS_IN_PROGRESS]);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/complete")
            ->assertNotFound();
    }

    public function test_poster_can_rate_a_rider_who_booked_a_confirmed_seat(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => AnandoRide::STATUS_COMPLETED, 'total_seats' => 3, 'available_seats' => 1]);
        $rider = User::factory()->create();
        AnandoRideBooking::factory()->create(['anando_ride_id' => $ride->id, 'user_id' => $rider->id, 'status' => AnandoRideBooking::STATUS_CONFIRMED]);

        $this->actingAs($poster, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/rate", ['ratee_id' => $rider->id, 'score' => 5, 'comment' => 'Excellent passager'])
            ->assertOk();

        $this->assertDatabaseHas('ratings', ['anando_ride_id' => $ride->id, 'rater_id' => $poster->id, 'ratee_id' => $rider->id, 'score' => 5]);
        $this->assertSame(5.0, $rider->fresh()->anando_rating);
        $this->assertSame(1, $rider->fresh()->anando_ratings_count);
    }

    public function test_rider_can_rate_the_poster(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => AnandoRide::STATUS_COMPLETED]);
        $rider = User::factory()->create();
        AnandoRideBooking::factory()->create(['anando_ride_id' => $ride->id, 'user_id' => $rider->id, 'status' => AnandoRideBooking::STATUS_CONFIRMED]);

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/rate", ['ratee_id' => $poster->id, 'score' => 4])
            ->assertOk();

        $this->assertDatabaseHas('ratings', ['anando_ride_id' => $ride->id, 'rater_id' => $rider->id, 'ratee_id' => $poster->id, 'score' => 4]);
        $this->assertSame(4.0, $poster->fresh()->anando_rating);
    }

    public function test_riders_cannot_rate_each_other(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => AnandoRide::STATUS_COMPLETED]);
        $riderA = User::factory()->create();
        $riderB = User::factory()->create();
        AnandoRideBooking::factory()->create(['anando_ride_id' => $ride->id, 'user_id' => $riderA->id, 'status' => AnandoRideBooking::STATUS_CONFIRMED]);
        AnandoRideBooking::factory()->create(['anando_ride_id' => $ride->id, 'user_id' => $riderB->id, 'status' => AnandoRideBooking::STATUS_CONFIRMED]);

        $this->actingAs($riderA, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/rate", ['ratee_id' => $riderB->id, 'score' => 3])
            ->assertUnprocessable();
    }

    public function test_poster_cannot_rate_a_rider_without_a_confirmed_booking(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => AnandoRide::STATUS_COMPLETED]);
        $stranger = User::factory()->create();

        $this->actingAs($poster, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/rate", ['ratee_id' => $stranger->id, 'score' => 3])
            ->assertUnprocessable();
    }

    public function test_rating_is_rejected_before_the_ride_is_completed(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => AnandoRide::STATUS_IN_PROGRESS]);
        $rider = User::factory()->create();
        AnandoRideBooking::factory()->create(['anando_ride_id' => $ride->id, 'user_id' => $rider->id, 'status' => AnandoRideBooking::STATUS_CONFIRMED]);

        $this->actingAs($poster, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/rate", ['ratee_id' => $rider->id, 'score' => 5])
            ->assertUnprocessable();
    }

    public function test_re_rating_the_same_person_updates_the_existing_review_and_recomputes_the_average(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => AnandoRide::STATUS_COMPLETED]);
        $rider = User::factory()->create();
        AnandoRideBooking::factory()->create(['anando_ride_id' => $ride->id, 'user_id' => $rider->id, 'status' => AnandoRideBooking::STATUS_CONFIRMED]);

        $this->actingAs($poster, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/rate", ['ratee_id' => $rider->id, 'score' => 2])
            ->assertOk();
        $this->assertSame(2.0, $rider->fresh()->anando_rating);

        $this->actingAs($poster, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/rate", ['ratee_id' => $rider->id, 'score' => 5])
            ->assertOk();

        $this->assertSame(5.0, $rider->fresh()->anando_rating);
        $this->assertSame(1, $rider->fresh()->anando_ratings_count);
        $this->assertDatabaseCount('ratings', 1);
    }

    public function test_show_exposes_my_ratings_given_for_the_current_user(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => AnandoRide::STATUS_COMPLETED]);
        $rider = User::factory()->create();
        AnandoRideBooking::factory()->create(['anando_ride_id' => $ride->id, 'user_id' => $rider->id, 'status' => AnandoRideBooking::STATUS_CONFIRMED]);

        $this->actingAs($poster, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/rate", ['ratee_id' => $rider->id, 'score' => 4])
            ->assertOk();

        $this->actingAs($poster, 'sanctum')
            ->getJson("/api/anando-rides/{$ride->id}")
            ->assertOk()
            ->assertJsonPath('my_ratings_given.0.ratee_id', $rider->id)
            ->assertJsonPath('my_ratings_given.0.score', 4);

        $this->actingAs($rider, 'sanctum')
            ->getJson("/api/anando-rides/{$ride->id}")
            ->assertOk()
            ->assertJsonPath('my_ratings_given', []);
    }
}
