<?php

namespace App\Http\Controllers\Api\Admin;

use App\Events\DeliveryAccepted;
use App\Events\DeliveryCancelled;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminDeliveryResource;
use App\Models\Delivery;
use App\Models\DriverProfile;
use App\Models\WalletTransaction;
use App\Services\AuditLogService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DeliveryManagementController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index(Request $request)
    {
        $request->validate([
            'status' => ['sometimes', Rule::in([Delivery::STATUS_PENDING, Delivery::STATUS_ACCEPTED, Delivery::STATUS_PICKED_UP, Delivery::STATUS_DELIVERED, Delivery::STATUS_CANCELLED])],
        ]);

        $deliveries = Delivery::query()
            ->with(['sender:id,name,phone', 'driver:id,name,phone'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->latest()
            ->paginate(20);

        return AdminDeliveryResource::collection($deliveries);
    }

    public function cancel(Request $request, Delivery $delivery, WalletService $walletService)
    {
        if (! $delivery->isCancellable()) {
            return response()->json(['message' => 'Cette livraison ne peut plus être annulée.'], 422);
        }

        DB::transaction(function () use ($delivery, $walletService) {
            /** @var Delivery $locked */
            $locked = Delivery::where('id', $delivery->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === Delivery::STATUS_ACCEPTED && $locked->payment_method === Delivery::PAYMENT_METHOD_WALLET) {
                $walletService->credit($locked->sender, $locked->fee, null, WalletTransaction::TYPE_REFUND, "Remboursement de livraison #{$locked->id} (annulée par un administrateur)");
                $walletService->debit($locked->driver, $locked->fee, null, WalletTransaction::TYPE_REFUND_REVERSAL, "Reprise de revenu (livraison #{$locked->id} annulée par un administrateur)");
            }

            $locked->update(['status' => Delivery::STATUS_CANCELLED, 'cancelled_at' => now()]);
        });

        $fresh = $delivery->fresh();

        DeliveryCancelled::dispatch($fresh);

        $this->auditLog->record($request->user(), 'delivery.cancel', "Livraison #{$delivery->id} annulée par un administrateur.", $fresh);

        return new AdminDeliveryResource($fresh->load(['sender:id,name,phone', 'driver:id,name,phone']));
    }

    public function assignDriver(Request $request, Delivery $delivery)
    {
        $data = $request->validate([
            'driver_id' => ['required', 'integer'],
        ]);

        if (! in_array($delivery->status, [Delivery::STATUS_PENDING, Delivery::STATUS_ACCEPTED], true)) {
            throw ValidationException::withMessages([
                'delivery' => ['Cette livraison ne peut plus être assignée à un autre conducteur.'],
            ]);
        }

        $profile = DriverProfile::where('user_id', $data['driver_id'])->where('kyc_status', DriverProfile::STATUS_APPROVED)->first();

        if (! $profile) {
            throw ValidationException::withMessages([
                'driver_id' => ['Ce conducteur est introuvable ou son KYC n\'est pas approuvé.'],
            ]);
        }

        $delivery->update([
            'driver_id' => $data['driver_id'],
            'status' => Delivery::STATUS_ACCEPTED,
            'accepted_at' => $delivery->accepted_at ?? now(),
        ]);

        $fresh = $delivery->fresh();

        // Notifies both the sender (a driver is now handling their delivery)
        // and the newly assigned driver — correct whether this is the first
        // assignment or an admin reassignment away from a previous driver.
        DeliveryAccepted::dispatch($fresh);

        $this->auditLog->record($request->user(), 'delivery.assign_driver', "Livraison #{$delivery->id} assignée au conducteur #{$data['driver_id']}.", $fresh);

        return new AdminDeliveryResource($fresh->load(['sender:id,name,phone', 'driver:id,name,phone']));
    }
}
