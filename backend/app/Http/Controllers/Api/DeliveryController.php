<?php

namespace App\Http\Controllers\Api;

use App\Events\DeliveryAccepted;
use App\Events\DeliveryCancelled;
use App\Events\DeliveryDelivered;
use App\Events\DeliveryPickedUp;
use App\Events\DeliveryRequested;
use App\Http\Controllers\Controller;
use App\Http\Requests\RateDeliveryRequest;
use App\Http\Requests\Rider\QuoteDeliveryRequest;
use App\Http\Requests\Rider\StoreDeliveryRequest;
use App\Http\Requests\Rider\UpdateDeliveryRequest;
use App\Http\Requests\UpdateDeliveryLocationRequest;
use App\Http\Resources\DeliveryResource;
use App\Models\Delivery;
use App\Models\DriverProfile;
use App\Models\SecurityAlert;
use App\Models\WalletTransaction;
use App\Services\CommissionService;
use App\Services\DeliveryPricingService;
use App\Services\RatingService;
use App\Services\SecurityAlertService;
use App\Services\TrackingLinkService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeliveryController extends Controller
{
    /**
     * Live fee preview while the rider is placing pickup/receiver pins.
     */
    public function quote(QuoteDeliveryRequest $request, DeliveryPricingService $pricing)
    {
        return response()->json($pricing->quote(
            (float) $request->validated('pickup_latitude'),
            (float) $request->validated('pickup_longitude'),
            (float) $request->validated('receiver_latitude'),
            (float) $request->validated('receiver_longitude'),
        ));
    }

    public function store(StoreDeliveryRequest $request, DeliveryPricingService $pricing)
    {
        $data = $request->validated();

        $quote = $pricing->quote(
            (float) $data['pickup_latitude'],
            (float) $data['pickup_longitude'],
            (float) $data['receiver_latitude'],
            (float) $data['receiver_longitude'],
        );

        $delivery = $request->user()->deliveriesAsSender()->create([
            ...$data,
            'payment_method' => $data['payment_method'] ?? Delivery::PAYMENT_METHOD_CASH,
            'distance_km' => $quote['distance_km'],
            'fee' => $quote['fee'],
            'status' => Delivery::STATUS_PENDING,
        ]);

        DeliveryRequested::dispatch($delivery);

        return new DeliveryResource($delivery->load(['sender', 'driver.driverProfile']));
    }

    public function index(Request $request)
    {
        $deliveries = $request->user()->deliveriesAsSender()
            ->with(['sender', 'driver.driverProfile'])
            ->latest()
            ->paginate(20);

        return DeliveryResource::collection($deliveries);
    }

    public function show(Request $request, Delivery $delivery)
    {
        abort_unless($request->user()->can('view', $delivery), 404);

        return new DeliveryResource($delivery->load(['sender', 'driver.driverProfile']));
    }

    /**
     * Lets the sender edit a delivery's details while it's still pending —
     * no driver assigned yet, so nothing to conflict with. Recomputes
     * distance/fee the same way store() does, since the addresses (and
     * therefore the route) may have changed.
     */
    public function update(UpdateDeliveryRequest $request, Delivery $delivery, DeliveryPricingService $pricing)
    {
        abort_unless($request->user()->can('view', $delivery), 404);

        if ($delivery->status !== Delivery::STATUS_PENDING) {
            return response()->json(['message' => 'Seule une livraison en attente peut être modifiée.'], 422);
        }

        $data = $request->validated();

        $quote = $pricing->quote(
            (float) $data['pickup_latitude'],
            (float) $data['pickup_longitude'],
            (float) $data['receiver_latitude'],
            (float) $data['receiver_longitude'],
        );

        $delivery->update([
            ...$data,
            'payment_method' => $data['payment_method'] ?? $delivery->payment_method,
            'distance_km' => $quote['distance_km'],
            'fee' => $quote['fee'],
        ]);

        return new DeliveryResource($delivery->fresh(['sender', 'driver.driverProfile']));
    }

    /**
     * SOS-style "share this delivery's live position" link — either the
     * sender or the courier may want to hand it to the receiver over
     * WhatsApp/SMS. Mirrors Trip/Anando/DemLeguiTrip::shareLink() exactly.
     */
    public function shareLink(Request $request, Delivery $delivery, TrackingLinkService $trackingLinks)
    {
        $user = $request->user();
        $isParticipant = $delivery->sender_id === $user->id || $delivery->driver_id === $user->id;

        abort_unless($isParticipant, 404);

        return response()->json(['url' => $trackingLinks->generateUrl('delivery', $delivery->id)]);
    }

    /**
     * Panic button: the sender or the courier signals an emergency, raising
     * a high-severity SecurityAlert the admin team sees on their alerts
     * dashboard.
     */
    public function sos(Request $request, Delivery $delivery, SecurityAlertService $alerts, TrackingLinkService $trackingLinks)
    {
        $user = $request->user();
        $isParticipant = $delivery->sender_id === $user->id || $delivery->driver_id === $user->id;

        abort_unless($isParticipant, 404);

        $data = $request->validate([
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $alerts->record(
            SecurityAlert::TYPE_RIDER_SOS,
            SecurityAlert::SEVERITY_HIGH,
            "Alerte SOS déclenchée par {$user->name} sur la livraison #{$delivery->id}.",
            $user,
            [
                'kind' => 'delivery',
                'ride_id' => $delivery->id,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'tracking_url' => $trackingLinks->generateUrl('delivery', $delivery->id),
                'parties' => [
                    ['role' => 'driver', 'name' => $delivery->driver?->name, 'phone' => $delivery->driver?->phone],
                    ['role' => 'sender', 'name' => $delivery->sender?->name, 'phone' => $delivery->sender?->phone],
                ],
            ],
        );

        return response()->json(['message' => 'Alerte SOS envoyée.']);
    }

    public function destroy(Request $request, Delivery $delivery, WalletService $walletService)
    {
        $this->authorize('delete', $delivery);

        if (! $delivery->isCancellable()) {
            return response()->json(['message' => 'Cette livraison ne peut plus être annulée.'], 422);
        }

        DB::transaction(function () use ($delivery, $walletService) {
            /** @var Delivery $locked */
            $locked = Delivery::where('id', $delivery->id)->lockForUpdate()->firstOrFail();

            // No driver-side reversal needed — the driver isn't credited
            // until delivered (see accept()'s comment).
            if ($locked->status === Delivery::STATUS_ACCEPTED && $locked->payment_method === Delivery::PAYMENT_METHOD_WALLET) {
                $walletService->credit($locked->sender, $locked->fee, null, WalletTransaction::TYPE_REFUND, "Remboursement de livraison #{$locked->id}");
            }

            $locked->update(['status' => Delivery::STATUS_CANCELLED, 'cancelled_at' => now()]);
        });

        DeliveryCancelled::dispatch($delivery->fresh());

        return response()->json(['message' => 'Livraison annulée.']);
    }

    /**
     * Driver-facing: pending delivery requests not yet claimed by anyone.
     */
    public function availableIndex(Request $request)
    {
        $deliveries = Delivery::query()
            ->where('status', Delivery::STATUS_PENDING)
            ->whereNull('driver_id')
            ->with(['sender', 'driver.driverProfile'])
            ->latest()
            ->paginate(20);

        return DeliveryResource::collection($deliveries);
    }

    /**
     * Driver-facing: this driver's own accepted/picked_up/delivered deliveries.
     */
    public function driverIndex(Request $request)
    {
        $deliveries = $request->user()->deliveriesAsDriver()
            ->with(['sender', 'driver.driverProfile'])
            ->latest()
            ->paginate(20);

        return DeliveryResource::collection($deliveries);
    }

    public function driverShow(Request $request, Delivery $delivery)
    {
        abort_unless(
            $delivery->status === Delivery::STATUS_PENDING || $delivery->driver_id === $request->user()->id,
            404
        );

        return new DeliveryResource($delivery->load(['sender', 'driver.driverProfile']));
    }

    public function accept(Request $request, Delivery $delivery, WalletService $walletService, DeliveryPricingService $pricing)
    {
        $user = $request->user();

        if ($user->driverProfile?->kyc_status !== DriverProfile::STATUS_APPROVED) {
            throw ValidationException::withMessages([
                'kyc' => ['Votre vérification conducteur (KYC) doit être approuvée avant d\'accepter des livraisons.'],
            ]);
        }

        DB::transaction(function () use ($delivery, $user, $walletService, $pricing) {
            // Locks the driver's own profile row first so two concurrent
            // accept() calls from the same driver (different deliveries)
            // serialize instead of both reading the active-count below
            // before either commits — otherwise both could slip past the
            // limit at once.
            DriverProfile::where('user_id', $user->id)->lockForUpdate()->first();

            $maxActive = $pricing->maxActiveDeliveriesPerDriver();
            if ($maxActive !== null) {
                $activeCount = Delivery::where('driver_id', $user->id)
                    ->whereIn('status', [Delivery::STATUS_ACCEPTED, Delivery::STATUS_PICKED_UP])
                    ->count();

                if ($activeCount >= $maxActive) {
                    throw ValidationException::withMessages([
                        'delivery' => ["Vous avez déjà {$activeCount} livraison(s) active(s), la limite autorisée. Terminez-en une avant d'en accepter une nouvelle."],
                    ]);
                }
            }

            /** @var Delivery $locked */
            $locked = Delivery::where('id', $delivery->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== Delivery::STATUS_PENDING || $locked->driver_id !== null) {
                throw ValidationException::withMessages([
                    'delivery' => ['Cette livraison n\'est plus disponible.'],
                ]);
            }

            $locked->update([
                'driver_id' => $user->id,
                'status' => Delivery::STATUS_ACCEPTED,
                'accepted_at' => now(),
            ]);

            // The sender pays up front; the driver is only credited their net
            // earnings once the delivery is actually delivered (see
            // deliver()) — same reasoning as Trip bookings.
            if ($locked->payment_method === Delivery::PAYMENT_METHOD_WALLET) {
                $walletService->charge($locked->sender, $locked->fee, null, "Paiement de livraison #{$locked->id}");
            }
        });

        DeliveryAccepted::dispatch($delivery->fresh());

        return new DeliveryResource($delivery->fresh(['sender', 'driver.driverProfile']));
    }

    public function pickup(Request $request, Delivery $delivery)
    {
        $this->authorize('update', $delivery);

        if ($delivery->status !== Delivery::STATUS_ACCEPTED) {
            return response()->json(['message' => 'Seule une livraison acceptée peut être marquée récupérée.'], 422);
        }

        $delivery->update(['status' => Delivery::STATUS_PICKED_UP, 'picked_up_at' => now()]);

        DeliveryPickedUp::dispatch($delivery->fresh());

        return new DeliveryResource($delivery->fresh(['sender', 'driver.driverProfile']));
    }

    /**
     * Courier reports its live position while a delivery is in transit —
     * mirrors Trip/Anando/DemLeguiTrip's updateLocation() shape exactly, so
     * the rider's delivery detail page can show a live moving dot.
     */
    public function updateLocation(UpdateDeliveryLocationRequest $request, Delivery $delivery)
    {
        $this->authorize('update', $delivery);

        if ($delivery->status !== Delivery::STATUS_PICKED_UP) {
            return response()->json(['message' => 'Cette livraison doit être en cours de transport pour partager la position.'], 422);
        }

        $delivery->update([
            'current_latitude' => $request->validated('latitude'),
            'current_longitude' => $request->validated('longitude'),
            'current_location_updated_at' => now(),
        ]);

        return response()->json(['message' => 'Position mise à jour.']);
    }

    public function deliver(Request $request, Delivery $delivery, CommissionService $commission, WalletService $walletService)
    {
        $this->authorize('update', $delivery);

        if ($delivery->status !== Delivery::STATUS_PICKED_UP) {
            return response()->json(['message' => 'Seule une livraison récupérée peut être marquée livrée.'], 422);
        }

        DB::transaction(function () use ($delivery, $commission, $walletService) {
            $delivery->update(['status' => Delivery::STATUS_DELIVERED, 'delivered_at' => now()]);
            $delivery = $commission->applyToDelivery($delivery);

            if ($delivery->payment_method === Delivery::PAYMENT_METHOD_WALLET) {
                $net = $delivery->fee - $delivery->commission_amount;
                $walletService->credit($delivery->driver, $net, null, WalletTransaction::TYPE_EARNING, "Revenu de livraison #{$delivery->id} (livrée)");
            }
        });

        DeliveryDelivered::dispatch($delivery->fresh());

        return new DeliveryResource($delivery->fresh(['sender', 'driver.driverProfile']));
    }

    /**
     * Sender leaves a 1-5 star review of the driver after a delivered
     * package. Re-rating updates the existing review.
     */
    public function rate(RateDeliveryRequest $request, Delivery $delivery, RatingService $ratingService)
    {
        $sender = $request->user();

        abort_unless($delivery->sender_id === $sender->id, 404);

        if ($delivery->status !== Delivery::STATUS_DELIVERED) {
            return response()->json(['message' => 'Cette livraison doit être livrée avant de laisser un avis.'], 422);
        }

        $ratingService->submitRating($delivery, $sender, $delivery->driver, (int) $request->validated('score'), $request->validated('comment'));

        return response()->json(['message' => 'Avis enregistré.']);
    }
}
