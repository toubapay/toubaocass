<?php

namespace App\Http\Controllers\Api;

use App\Events\BookingCancelled;
use App\Events\BookingCreated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Rider\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $bookings = $request->user()->bookings()
            ->with(['trip.car', 'trip.originCity', 'trip.destinationCity', 'trip.driver'])
            ->latest()
            ->paginate(20);

        return BookingResource::collection($bookings);
    }

    public function store(StoreBookingRequest $request, Trip $trip)
    {
        $rider = $request->user();
        $seatsRequested = (int) $request->validated('seats');

        $booking = DB::transaction(function () use ($trip, $rider, $seatsRequested) {
            /** @var Trip $locked */
            $locked = Trip::where('id', $trip->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== Trip::STATUS_SCHEDULED) {
                throw ValidationException::withMessages([
                    'trip' => ['Ce trajet n\'accepte plus de réservations.'],
                ]);
            }

            if ($locked->available_seats < $seatsRequested) {
                throw ValidationException::withMessages([
                    'seats' => ["Il ne reste que {$locked->available_seats} place(s) sur ce trajet."],
                ]);
            }

            $alreadyBooked = $locked->bookings()
                ->where('rider_id', $rider->id)
                ->where('status', Booking::STATUS_CONFIRMED)
                ->exists();

            if ($alreadyBooked) {
                throw ValidationException::withMessages([
                    'trip' => ['Vous avez déjà une réservation sur ce trajet. Annulez-la d\'abord pour modifier le nombre de places.'],
                ]);
            }

            $booking = $locked->bookings()->create([
                'rider_id' => $rider->id,
                'seats_booked' => $seatsRequested,
                'fare_total' => $locked->fare * $seatsRequested,
                'status' => Booking::STATUS_CONFIRMED,
            ]);

            $locked->decrement('available_seats', $seatsRequested);

            if ($locked->fresh()->available_seats === 0) {
                $locked->update(['status' => Trip::STATUS_FULL]);
            }

            return $booking;
        });

        BookingCreated::dispatch($booking);

        return new BookingResource($booking->load(['trip.car', 'trip.originCity', 'trip.destinationCity', 'trip.driver']));
    }

    public function destroy(Request $request, Booking $booking)
    {
        $this->authorize('delete', $booking);

        if ($booking->status !== Booking::STATUS_CONFIRMED) {
            return response()->json(['message' => 'Cette réservation est déjà annulée.'], 422);
        }

        DB::transaction(function () use ($booking) {
            $booking->update(['status' => Booking::STATUS_CANCELLED]);

            /** @var Trip $trip */
            $trip = Trip::where('id', $booking->trip_id)->lockForUpdate()->firstOrFail();
            $wasFull = $trip->status === Trip::STATUS_FULL;

            $trip->increment('available_seats', $booking->seats_booked);

            if ($wasFull) {
                $trip->update(['status' => Trip::STATUS_SCHEDULED]);
            }
        });

        BookingCancelled::dispatch($booking->fresh());

        return response()->json(['message' => 'Réservation annulée.']);
    }
}
