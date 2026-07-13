<?php

namespace App\Http\Controllers\Api;

use App\Events\DeliveryAccepted;
use App\Events\DeliveryCancelled;
use App\Events\DeliveryDelivered;
use App\Events\DeliveryPickedUp;
use App\Events\DeliveryRequested;
use App\Http\Controllers\Controller;
use App\Http\Requests\Rider\QuoteDeliveryRequest;
use App\Http\Requests\Rider\StoreDeliveryRequest;
use App\Http\Resources\DeliveryResource;
use App\Models\Delivery;
use App\Models\DriverProfile;
use App\Models\WalletTransaction;
use App\Services\DeliveryPricingService;
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
        abort_unless($delivery->sender_id === $request->user()->id, 404);

        return new DeliveryResource($delivery->load(['sender', 'driver.driverProfile']));
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

            if ($locked->status === Delivery::STATUS_ACCEPTED && $locked->payment_method === Delivery::PAYMENT_METHOD_WALLET) {
                $walletService->credit($locked->sender, $locked->fee, null, WalletTransaction::TYPE_REFUND, "Remboursement de livraison #{$locked->id}");
                $walletService->debit($locked->driver, $locked->fee, null, WalletTransaction::TYPE_REFUND_REVERSAL, "Reprise de revenu (livraison #{$locked->id} annulée)");
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

    public function accept(Request $request, Delivery $delivery, WalletService $walletService)
    {
        $user = $request->user();

        if ($user->driverProfile?->kyc_status !== DriverProfile::STATUS_APPROVED) {
            throw ValidationException::withMessages([
                'kyc' => ['Votre vérification conducteur (KYC) doit être approuvée avant d\'accepter des livraisons.'],
            ]);
        }

        DB::transaction(function () use ($delivery, $user, $walletService) {
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

            if ($locked->payment_method === Delivery::PAYMENT_METHOD_WALLET) {
                $walletService->charge($locked->sender, $locked->fee, null, "Paiement de livraison #{$locked->id}");
                $walletService->credit($user, $locked->fee, null, WalletTransaction::TYPE_EARNING, "Revenu de livraison #{$locked->id}");
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

    public function deliver(Request $request, Delivery $delivery)
    {
        $this->authorize('update', $delivery);

        if ($delivery->status !== Delivery::STATUS_PICKED_UP) {
            return response()->json(['message' => 'Seule une livraison récupérée peut être marquée livrée.'], 422);
        }

        $delivery->update(['status' => Delivery::STATUS_DELIVERED, 'delivered_at' => now()]);

        DeliveryDelivered::dispatch($delivery->fresh());

        return new DeliveryResource($delivery->fresh(['sender', 'driver.driverProfile']));
    }
}
