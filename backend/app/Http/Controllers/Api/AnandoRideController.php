<?php

namespace App\Http\Controllers\Api;

use App\Events\AnandoRideJoined;
use App\Events\AnandoRidePosted;
use App\Http\Controllers\Controller;
use App\Http\Requests\JoinAnandoRideRequest;
use App\Http\Requests\StoreAnandoRideRequest;
use App\Http\Requests\UpdateAnandoBookingRequest;
use App\Http\Resources\AnandoRideBookingResource;
use App\Http\Resources\AnandoRideResource;
use App\Models\AnandoRide;
use App\Models\AnandoRideBooking;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * "Anando" — peer-to-peer instant ride sharing. Unlike Trip (KYC-verified
 * drivers only) or Delivery (rider posts, driver fulfills), any
 * authenticated user — rider or driver — can post a ride they're making
 * and any other user can join a seat on it. Routes for this controller are
 * intentionally NOT nested under the `role:rider`/`role:driver` middleware
 * groups in routes/api.php.
 */
class AnandoRideController extends Controller
{
    /**
     * Browse open rides available to join — "trending" (most recently
     * posted first), excluding the current user's own rides.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $rides = AnandoRide::query()
            ->where('status', AnandoRide::STATUS_OPEN)
            ->where('user_id', '!=', $user->id)
            ->with([
                'poster', 'originCity', 'destinationCity',
                'myBooking' => fn ($q) => $q->where('user_id', $user->id)->where('status', AnandoRideBooking::STATUS_CONFIRMED),
            ])
            ->latest()
            ->paginate(20);

        return AnandoRideResource::collection($rides);
    }

    public function store(StoreAnandoRideRequest $request)
    {
        $data = $request->validated();
        $seats = (int) $data['total_seats'];

        $ride = $request->user()->anandoRides()->create([
            ...$data,
            'departure_at' => $data['departure_at'] ?? now(),
            'total_seats' => $seats,
            'available_seats' => $seats,
            'status' => AnandoRide::STATUS_OPEN,
        ]);

        AnandoRidePosted::dispatch($ride);

        return new AnandoRideResource($ride->load(['poster', 'originCity', 'destinationCity']));
    }

    public function myRides(Request $request)
    {
        $rides = $request->user()->anandoRides()
            ->with(['poster', 'originCity', 'destinationCity', 'bookings.user'])
            ->latest()
            ->paginate(20);

        return AnandoRideResource::collection($rides);
    }

    public function myBookings(Request $request)
    {
        $bookings = $request->user()->anandoRideBookings()
            ->with(['anandoRide.poster', 'anandoRide.originCity', 'anandoRide.destinationCity', 'user'])
            ->latest()
            ->paginate(20);

        return AnandoRideBookingResource::collection($bookings);
    }

    public function show(Request $request, AnandoRide $anandoRide)
    {
        $user = $request->user();

        $anandoRide->load([
            'poster', 'originCity', 'destinationCity',
            'myBooking' => fn ($q) => $q->where('user_id', $user->id)->where('status', AnandoRideBooking::STATUS_CONFIRMED),
        ]);

        if ($anandoRide->user_id === $user->id) {
            $anandoRide->load('bookings.user');
        }

        return new AnandoRideResource($anandoRide);
    }

    public function join(JoinAnandoRideRequest $request, AnandoRide $anandoRide, WalletService $walletService)
    {
        $user = $request->user();
        $data = $request->validated();
        $seats = (int) $data['seats'];
        $paymentMethod = $data['payment_method'] ?? AnandoRideBooking::PAYMENT_METHOD_CASH;

        if ($anandoRide->user_id === $user->id) {
            throw ValidationException::withMessages([
                'anando_ride' => ["Vous ne pouvez pas rejoindre votre propre trajet."],
            ]);
        }

        $booking = DB::transaction(function () use ($anandoRide, $user, $seats, $paymentMethod, $walletService) {
            /** @var AnandoRide $locked */
            $locked = AnandoRide::where('id', $anandoRide->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== AnandoRide::STATUS_OPEN || $locked->available_seats < $seats) {
                throw ValidationException::withMessages([
                    'anando_ride' => ["Ce trajet n'a plus assez de places disponibles."],
                ]);
            }

            $alreadyJoined = AnandoRideBooking::where('anando_ride_id', $locked->id)
                ->where('user_id', $user->id)
                ->where('status', AnandoRideBooking::STATUS_CONFIRMED)
                ->exists();

            if ($alreadyJoined) {
                throw ValidationException::withMessages([
                    'anando_ride' => ['Vous avez déjà rejoint ce trajet.'],
                ]);
            }

            $priceTotal = $locked->price_per_seat * $seats;

            $booking = AnandoRideBooking::create([
                'anando_ride_id' => $locked->id,
                'user_id' => $user->id,
                'seats_booked' => $seats,
                'price_total' => $priceTotal,
                'payment_method' => $paymentMethod,
                'status' => AnandoRideBooking::STATUS_CONFIRMED,
            ]);

            if ($paymentMethod === AnandoRideBooking::PAYMENT_METHOD_WALLET) {
                $walletService->charge($user, $priceTotal, null, "Trajet Anando #{$locked->id}");
                $walletService->credit($locked->poster, $priceTotal, null, WalletTransaction::TYPE_EARNING, "Revenu Anando #{$locked->id}");
            }

            $locked->decrement('available_seats', $seats);
            if ($locked->fresh()->available_seats <= 0) {
                $locked->update(['status' => AnandoRide::STATUS_FULL]);
            }

            return $booking;
        });

        $booking->load(['anandoRide.poster', 'anandoRide.originCity', 'anandoRide.destinationCity', 'user']);

        AnandoRideJoined::dispatch($booking);

        return new AnandoRideBookingResource($booking);
    }

    public function cancelRide(Request $request, AnandoRide $anandoRide, WalletService $walletService)
    {
        abort_unless($anandoRide->user_id === $request->user()->id, 404);

        if (! in_array($anandoRide->status, [AnandoRide::STATUS_OPEN, AnandoRide::STATUS_FULL], true)) {
            return response()->json(['message' => 'Ce trajet Anando ne peut plus être annulé.'], 422);
        }

        DB::transaction(function () use ($anandoRide, $walletService) {
            /** @var AnandoRide $locked */
            $locked = AnandoRide::where('id', $anandoRide->id)->lockForUpdate()->firstOrFail();

            $bookings = AnandoRideBooking::where('anando_ride_id', $locked->id)
                ->where('status', AnandoRideBooking::STATUS_CONFIRMED)
                ->get();

            foreach ($bookings as $booking) {
                if ($booking->payment_method === AnandoRideBooking::PAYMENT_METHOD_WALLET) {
                    $walletService->credit($booking->user, $booking->price_total, null, WalletTransaction::TYPE_REFUND, "Remboursement Anando #{$locked->id}");
                    $walletService->debit($locked->poster, $booking->price_total, null, WalletTransaction::TYPE_REFUND_REVERSAL, "Reprise de revenu (Anando #{$locked->id} annulé)");
                }
                $booking->update(['status' => AnandoRideBooking::STATUS_CANCELLED]);
            }

            $locked->update(['status' => AnandoRide::STATUS_CANCELLED, 'cancelled_at' => now()]);
        });

        return response()->json(['message' => 'Trajet Anando annulé.']);
    }

    /**
     * Change the seat count on an existing confirmed booking — mirrors
     * BookingController::update() for regular Trip bookings. Reducing to 0
     * seats is treated as a cancellation.
     */
    public function updateBooking(UpdateAnandoBookingRequest $request, AnandoRideBooking $anandoRideBooking, WalletService $walletService)
    {
        abort_unless($anandoRideBooking->user_id === $request->user()->id, 404);

        $newSeats = (int) $request->validated('seats');

        if ($newSeats === 0) {
            return $this->cancelBooking($request, $anandoRideBooking, $walletService);
        }

        if ($anandoRideBooking->status !== AnandoRideBooking::STATUS_CONFIRMED) {
            return response()->json(['message' => 'Cette réservation Anando est déjà annulée.'], 422);
        }

        $updated = DB::transaction(function () use ($anandoRideBooking, $newSeats, $walletService) {
            /** @var AnandoRideBooking $lockedBooking */
            $lockedBooking = AnandoRideBooking::where('id', $anandoRideBooking->id)->lockForUpdate()->firstOrFail();
            /** @var AnandoRide $ride */
            $ride = AnandoRide::where('id', $lockedBooking->anando_ride_id)->lockForUpdate()->firstOrFail();

            if (! in_array($ride->status, [AnandoRide::STATUS_OPEN, AnandoRide::STATUS_FULL], true)) {
                throw ValidationException::withMessages([
                    'anando_ride' => ["Ce trajet Anando n'accepte plus de modifications."],
                ]);
            }

            $seatDelta = $newSeats - $lockedBooking->seats_booked;

            if ($seatDelta > 0 && $ride->available_seats < $seatDelta) {
                throw ValidationException::withMessages([
                    'seats' => ["Il ne reste que {$ride->available_seats} place(s) supplémentaire(s) disponible(s) sur ce trajet."],
                ]);
            }

            $newPriceTotal = $ride->price_per_seat * $newSeats;
            $priceDelta = $newPriceTotal - $lockedBooking->price_total;

            if ($lockedBooking->payment_method === AnandoRideBooking::PAYMENT_METHOD_WALLET && $priceDelta !== 0) {
                if ($priceDelta > 0) {
                    $walletService->charge($lockedBooking->user, $priceDelta, null, "Ajustement Anando #{$ride->id}");
                    $walletService->credit($ride->poster, $priceDelta, null, WalletTransaction::TYPE_EARNING, "Ajustement de revenu Anando #{$ride->id}");
                } else {
                    $refundAmount = abs($priceDelta);
                    $walletService->credit($lockedBooking->user, $refundAmount, null, WalletTransaction::TYPE_REFUND, "Remboursement partiel Anando #{$ride->id}");
                    $walletService->debit($ride->poster, $refundAmount, null, WalletTransaction::TYPE_REFUND_REVERSAL, "Ajustement de revenu Anando #{$ride->id}");
                }
            }

            $lockedBooking->update([
                'seats_booked' => $newSeats,
                'price_total' => $newPriceTotal,
            ]);

            if ($seatDelta !== 0) {
                $ride->decrement('available_seats', $seatDelta);
            }

            $ride->refresh();

            if ($ride->available_seats <= 0 && $ride->status !== AnandoRide::STATUS_FULL) {
                $ride->update(['status' => AnandoRide::STATUS_FULL]);
            } elseif ($ride->available_seats > 0 && $ride->status === AnandoRide::STATUS_FULL) {
                $ride->update(['status' => AnandoRide::STATUS_OPEN]);
            }

            return $lockedBooking;
        });

        return new AnandoRideBookingResource($updated->load(['anandoRide.poster', 'anandoRide.originCity', 'anandoRide.destinationCity', 'user']));
    }

    public function cancelBooking(Request $request, AnandoRideBooking $anandoRideBooking, WalletService $walletService)
    {
        abort_unless($anandoRideBooking->user_id === $request->user()->id, 404);

        if ($anandoRideBooking->status !== AnandoRideBooking::STATUS_CONFIRMED) {
            return response()->json(['message' => 'Cette réservation Anando ne peut plus être annulée.'], 422);
        }

        DB::transaction(function () use ($anandoRideBooking, $walletService) {
            /** @var AnandoRideBooking $lockedBooking */
            $lockedBooking = AnandoRideBooking::where('id', $anandoRideBooking->id)->lockForUpdate()->firstOrFail();
            $ride = AnandoRide::where('id', $lockedBooking->anando_ride_id)->lockForUpdate()->firstOrFail();

            if ($lockedBooking->payment_method === AnandoRideBooking::PAYMENT_METHOD_WALLET) {
                $walletService->credit($lockedBooking->user, $lockedBooking->price_total, null, WalletTransaction::TYPE_REFUND, "Remboursement Anando #{$ride->id}");
                $walletService->debit($ride->poster, $lockedBooking->price_total, null, WalletTransaction::TYPE_REFUND_REVERSAL, "Reprise de revenu (place Anando #{$ride->id} annulée)");
            }

            $lockedBooking->update(['status' => AnandoRideBooking::STATUS_CANCELLED]);

            $ride->increment('available_seats', $lockedBooking->seats_booked);
            if ($ride->fresh()->status === AnandoRide::STATUS_FULL) {
                $ride->update(['status' => AnandoRide::STATUS_OPEN]);
            }
        });

        return response()->json(['message' => 'Réservation Anando annulée.']);
    }
}
