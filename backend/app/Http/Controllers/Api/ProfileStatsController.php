<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnandoRide;
use App\Models\AnandoRideBooking;
use App\Models\Booking;
use App\Models\Trip;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;

class ProfileStatsController extends Controller
{
    /**
     * Aggregated numbers for the Profile page dashboard. Same response
     * shape for every account regardless of role — Anando lets any user
     * act as a ride poster or passenger, so a metric that doesn't apply to
     * this particular account (e.g. a driver's "bookings made") is simply
     * zero/null rather than the response shape differing by role.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'trips_count' => $this->tripsCount($user),
            'bookings_count' => $this->bookingsCount($user),
            'anando_rides_count' => $user->anandoRides()->where('status', '!=', AnandoRide::STATUS_CANCELLED)->count(),
            'anando_clients_count' => $this->anandoClientsCount($user),
            'earnings_total' => (int) ($user->wallet?->transactions()->where('type', WalletTransaction::TYPE_EARNING)->sum('amount') ?? 0),
            'active_booking' => $this->activeBooking($user),
            'last_trip' => $this->lastTrip($user),
        ]);
    }

    /**
     * Drivers: trips they've organized (posted), any status. Riders: trips
     * they've actually completed as a passenger (a distinct, smaller number
     * than "bookings made" below, since a confirmed booking's trip may not
     * have happened yet).
     */
    private function tripsCount(User $user): int
    {
        if ($user->isDriver()) {
            return $user->trips()->count();
        }

        return $user->bookings()
            ->where('status', Booking::STATUS_CONFIRMED)
            ->whereHas('trip', fn ($q) => $q->where('status', Trip::STATUS_COMPLETED))
            ->count();
    }

    /**
     * Drivers: total confirmed passenger bookings received across every
     * trip they've posted. Riders: total confirmed bookings they've made,
     * regardless of whether that trip has happened yet.
     */
    private function bookingsCount(User $user): int
    {
        if ($user->isDriver()) {
            return Booking::where('status', Booking::STATUS_CONFIRMED)
                ->whereIn('trip_id', $user->trips()->pluck('id'))
                ->count();
        }

        return $user->bookings()->where('status', Booking::STATUS_CONFIRMED)->count();
    }

    private function anandoClientsCount(User $user): int
    {
        return AnandoRideBooking::where('status', AnandoRideBooking::STATUS_CONFIRMED)
            ->whereIn('anando_ride_id', $user->anandoRides()->pluck('id'))
            ->distinct('user_id')
            ->count('user_id');
    }

    /**
     * A trip stuck in "scheduled"/"full" past its own departure time (never
     * explicitly started/completed/cancelled by the driver) is a past trip
     * in every practical sense and must not be surfaced as the user's
     * current active one — only "in_progress" is exempt from this check,
     * since it's legitimately still under way regardless of how long ago it
     * was due to leave. Candidates are fetched ordered by departure and
     * filtered in PHP with Trip::hasDeparted() rather than in SQL, since
     * that's the single source of truth this app already uses everywhere
     * else a trip's departure needs to be checked against "now".
     */
    private function activeBooking(User $user): ?array
    {
        $activeStatuses = [Trip::STATUS_SCHEDULED, Trip::STATUS_FULL, Trip::STATUS_IN_PROGRESS];

        if ($user->isDriver()) {
            $trip = $user->trips()
                ->whereIn('status', $activeStatuses)
                ->with(['originCity', 'destinationCity'])
                ->orderBy('departure_date')
                ->orderBy('departure_time')
                ->get()
                ->first(fn (Trip $t) => $t->status === Trip::STATUS_IN_PROGRESS || ! $t->hasDeparted());

            return $trip ? $this->tripSummary($trip) : null;
        }

        // Soonest upcoming/in-progress trip the rider is confirmed on — a
        // join (rather than whereHas) so it can be ordered by the trip's
        // own departure, not by when the booking row was created.
        $booking = Booking::query()
            ->where('rider_id', $user->id)
            ->where('bookings.status', Booking::STATUS_CONFIRMED)
            ->join('trips', 'trips.id', '=', 'bookings.trip_id')
            ->whereIn('trips.status', $activeStatuses)
            ->orderBy('trips.departure_date')
            ->orderBy('trips.departure_time')
            ->select('bookings.*')
            ->with(['trip.originCity', 'trip.destinationCity'])
            ->get()
            ->first(fn (Booking $b) => $b->trip->status === Trip::STATUS_IN_PROGRESS || ! $b->trip->hasDeparted());

        return $booking ? $this->tripSummary($booking->trip) : null;
    }

    private function lastTrip(User $user): ?array
    {
        if ($user->isDriver()) {
            $trip = $user->trips()
                ->where('status', Trip::STATUS_COMPLETED)
                ->with(['originCity', 'destinationCity'])
                ->orderByDesc('departure_date')
                ->orderByDesc('departure_time')
                ->first();

            return $trip ? $this->tripSummary($trip) : null;
        }

        $booking = Booking::query()
            ->where('rider_id', $user->id)
            ->where('bookings.status', Booking::STATUS_CONFIRMED)
            ->join('trips', 'trips.id', '=', 'bookings.trip_id')
            ->where('trips.status', Trip::STATUS_COMPLETED)
            ->orderByDesc('trips.departure_date')
            ->orderByDesc('trips.departure_time')
            ->select('bookings.*')
            ->with(['trip.originCity', 'trip.destinationCity'])
            ->first();

        return $booking ? $this->tripSummary($booking->trip) : null;
    }

    private function tripSummary(Trip $trip): array
    {
        return [
            'id' => $trip->id,
            'origin_city' => $trip->originCity?->name,
            'destination_city' => $trip->destinationCity?->name,
            'departure_date' => $trip->departure_date,
            'departure_time' => $trip->departure_time,
            'status' => $trip->status,
        ];
    }
}
