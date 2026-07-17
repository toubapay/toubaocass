<?php

namespace App\Http\Controllers\Api;

use App\Events\BookingCancelled;
use App\Events\BookingCreated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Rider\StoreBookingRequest;
use App\Http\Requests\Rider\UpdateBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Models\Trip;
use App\Models\WalletTransaction;
use App\Services\WalletService;
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

    public function store(StoreBookingRequest $request, Trip $trip, WalletService $walletService)
    {
        $rider = $request->user();
        $seatsRequested = (int) $request->validated('seats');
        $paymentMethod = $request->validated('payment_method') ?? Booking::PAYMENT_METHOD_CASH;

        $booking = DB::transaction(function () use ($trip, $rider, $seatsRequested, $paymentMethod, $walletService) {
            /** @var Trip $locked */
            $locked = Trip::where('id', $trip->id)->lockForUpdate()->firstOrFail();

            if ($locked->hasDeparted()) {
                throw ValidationException::withMessages([
                    'trip' => ['Ce trajet est déjà terminé ou est déjà parti.'],
                ]);
            }

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

            $fareTotal = $locked->fare * $seatsRequested;

            $booking = $locked->bookings()->create([
                'rider_id' => $rider->id,
                'seats_booked' => $seatsRequested,
                'fare_total' => $fareTotal,
                'payment_method' => $paymentMethod,
                'status' => Booking::STATUS_CONFIRMED,
            ]);

            if ($paymentMethod === Booking::PAYMENT_METHOD_WALLET) {
                $walletService->charge($rider, $fareTotal, $booking, 'Paiement de réservation');
                $walletService->credit($locked->driver, $fareTotal, $booking, WalletTransaction::TYPE_EARNING, 'Revenu de réservation');
            }

            $locked->decrement('available_seats', $seatsRequested);

            if ($locked->fresh()->available_seats === 0) {
                $locked->update(['status' => Trip::STATUS_FULL]);
            }

            return $booking;
        });

        BookingCreated::dispatch($booking);

        return new BookingResource($booking->load(['trip.car', 'trip.originCity', 'trip.destinationCity', 'trip.driver']));
    }

    /**
     * Change the seat count on an existing confirmed booking — lets a rider
     * add more seats (if available) or release some, without cancelling and
     * re-booking. Reducing to 0 seats is treated as a cancellation.
     */
    public function update(UpdateBookingRequest $request, Booking $booking, WalletService $walletService)
    {
        $this->authorize('update', $booking);

        $newSeats = (int) $request->validated('seats');

        if ($newSeats === 0) {
            return $this->destroy($request, $booking, $walletService);
        }

        if ($booking->status !== Booking::STATUS_CONFIRMED) {
            return response()->json(['message' => 'Cette réservation est déjà annulée.'], 422);
        }

        $updated = DB::transaction(function () use ($booking, $newSeats, $walletService) {
            /** @var Trip $trip */
            $trip = Trip::where('id', $booking->trip_id)->lockForUpdate()->firstOrFail();

            if ($trip->hasDeparted()) {
                throw ValidationException::withMessages([
                    'trip' => ['Ce trajet est déjà terminé ou est déjà parti.'],
                ]);
            }

            if (! in_array($trip->status, [Trip::STATUS_SCHEDULED, Trip::STATUS_FULL], true)) {
                throw ValidationException::withMessages([
                    'trip' => ['Ce trajet n\'accepte plus de modifications.'],
                ]);
            }

            $seatDelta = $newSeats - $booking->seats_booked;

            if ($seatDelta > 0 && $trip->available_seats < $seatDelta) {
                throw ValidationException::withMessages([
                    'seats' => ["Il ne reste que {$trip->available_seats} place(s) supplémentaire(s) disponible(s) sur ce trajet."],
                ]);
            }

            $newFareTotal = $trip->fare * $newSeats;
            $fareDelta = $newFareTotal - $booking->fare_total;

            if ($booking->payment_method === Booking::PAYMENT_METHOD_WALLET && $fareDelta !== 0) {
                if ($fareDelta > 0) {
                    $walletService->charge($booking->rider, $fareDelta, $booking, 'Ajustement de réservation');
                    $walletService->credit($trip->driver, $fareDelta, $booking, WalletTransaction::TYPE_EARNING, 'Ajustement de revenu');
                } else {
                    $refundAmount = abs($fareDelta);
                    $walletService->credit($booking->rider, $refundAmount, $booking, WalletTransaction::TYPE_REFUND, 'Remboursement partiel de réservation');
                    $walletService->debit($trip->driver, $refundAmount, $booking, WalletTransaction::TYPE_REFUND_REVERSAL, 'Ajustement de revenu');
                }
            }

            $booking->update([
                'seats_booked' => $newSeats,
                'fare_total' => $newFareTotal,
            ]);

            if ($seatDelta !== 0) {
                $trip->decrement('available_seats', $seatDelta);
            }

            $trip->refresh();

            if ($trip->available_seats <= 0 && $trip->status !== Trip::STATUS_FULL) {
                $trip->update(['status' => Trip::STATUS_FULL]);
            } elseif ($trip->available_seats > 0 && $trip->status === Trip::STATUS_FULL) {
                $trip->update(['status' => Trip::STATUS_SCHEDULED]);
            }

            return $booking;
        });

        return new BookingResource($updated->load(['trip.car', 'trip.originCity', 'trip.destinationCity', 'trip.driver']));
    }

    public function destroy(Request $request, Booking $booking, WalletService $walletService)
    {
        $this->authorize('delete', $booking);

        if ($booking->status !== Booking::STATUS_CONFIRMED) {
            return response()->json(['message' => 'Cette réservation est déjà annulée.'], 422);
        }

        DB::transaction(function () use ($booking, $walletService) {
            $booking->update(['status' => Booking::STATUS_CANCELLED]);

            /** @var Trip $trip */
            $trip = Trip::where('id', $booking->trip_id)->lockForUpdate()->firstOrFail();
            $wasFull = $trip->status === Trip::STATUS_FULL;

            $trip->increment('available_seats', $booking->seats_booked);

            if ($wasFull) {
                $trip->update(['status' => Trip::STATUS_SCHEDULED]);
            }

            if ($booking->payment_method === Booking::PAYMENT_METHOD_WALLET) {
                $walletService->credit($booking->rider, $booking->fare_total, $booking, WalletTransaction::TYPE_REFUND, 'Remboursement de réservation annulée');
                $walletService->debit($trip->driver, $booking->fare_total, $booking, WalletTransaction::TYPE_REFUND_REVERSAL, 'Reprise de revenu (réservation annulée)');
            }
        });

        BookingCancelled::dispatch($booking->fresh());

        return response()->json(['message' => 'Réservation annulée.']);
    }
}
