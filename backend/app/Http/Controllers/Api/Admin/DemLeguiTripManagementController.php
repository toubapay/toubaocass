<?php

namespace App\Http\Controllers\Api\Admin;

use App\Events\DemLeguiTripCancelled;
use App\Http\Controllers\Controller;
use App\Http\Resources\DemLeguiTripResource;
use App\Models\Car;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\DriverProfile;
use App\Models\WalletTransaction;
use App\Services\AuditLogService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Reuses DemLeguiTripResource (and, transitively, DemLeguiRequestResource
 * for each attached rider) rather than a bespoke admin resource — it's
 * already the driver/rider-facing shape, which includes everything an
 * admin needs (driver, car, every attached rider's contact info, and the
 * trip's live position) and nothing an admin shouldn't see.
 */
class DemLeguiTripManagementController extends Controller
{
    private const EAGER_LOAD = ['driver.driverProfile', 'car', 'destinationCity', 'requests.rider'];

    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index(Request $request)
    {
        $request->validate([
            'status' => ['sometimes', Rule::in([DemLeguiTrip::STATUS_OPEN, DemLeguiTrip::STATUS_IN_PROGRESS, DemLeguiTrip::STATUS_COMPLETED, DemLeguiTrip::STATUS_CANCELLED])],
        ]);

        $trips = DemLeguiTrip::query()
            ->with(self::EAGER_LOAD)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->latest()
            ->paginate(20);

        return DemLeguiTripResource::collection($trips);
    }

    public function cancel(Request $request, DemLeguiTrip $demLeguiTrip, WalletService $walletService)
    {
        $cancelledRequestIds = [];

        try {
            DB::transaction(function () use ($demLeguiTrip, $walletService, &$cancelledRequestIds) {
                /** @var DemLeguiTrip $locked */
                $locked = DemLeguiTrip::where('id', $demLeguiTrip->id)->lockForUpdate()->firstOrFail();

                if (in_array($locked->status, [DemLeguiTrip::STATUS_COMPLETED, DemLeguiTrip::STATUS_CANCELLED], true)) {
                    throw new \RuntimeException('Ce trajet Dem Légui ne peut plus être annulé.');
                }

                $matchedRequests = $locked->requests()->where('status', DemLeguiRequest::STATUS_MATCHED)->get();

                foreach ($matchedRequests as $attachedRequest) {
                    if ($attachedRequest->payment_method === DemLeguiRequest::PAYMENT_METHOD_WALLET) {
                        $walletService->credit($attachedRequest->rider, $attachedRequest->fare_total, null, WalletTransaction::TYPE_REFUND, "Remboursement Dem Légui #{$attachedRequest->id} (trajet annulé par un administrateur)");
                        $walletService->debit($locked->driver, $attachedRequest->fare_total, null, WalletTransaction::TYPE_REFUND_REVERSAL, "Reprise de revenu (Dem Légui #{$attachedRequest->id} annulée)");
                    }

                    $attachedRequest->update(['status' => DemLeguiRequest::STATUS_CANCELLED]);
                    $cancelledRequestIds[] = $attachedRequest->id;
                }

                $locked->update(['status' => DemLeguiTrip::STATUS_CANCELLED]);
            });
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $fresh = $demLeguiTrip->fresh(self::EAGER_LOAD);

        DemLeguiTripCancelled::dispatch($fresh, DemLeguiRequest::whereIn('id', $cancelledRequestIds)->with('rider')->get());

        $this->auditLog->record($request->user(), 'dem_legui_trip.cancel', "Trajet Dem Légui #{$demLeguiTrip->id} annulé par un administrateur.", $fresh);

        return new DemLeguiTripResource($fresh);
    }

    public function assignDriver(Request $request, DemLeguiTrip $demLeguiTrip)
    {
        $data = $request->validate([
            'driver_id' => ['required', 'integer'],
        ]);

        if ($demLeguiTrip->status !== DemLeguiTrip::STATUS_OPEN) {
            throw ValidationException::withMessages([
                'dem_legui_trip' => ['Ce trajet Dem Légui ne peut plus être réassigné à un autre conducteur.'],
            ]);
        }

        $profile = DriverProfile::where('user_id', $data['driver_id'])->where('kyc_status', DriverProfile::STATUS_APPROVED)->first();

        if (! $profile) {
            throw ValidationException::withMessages([
                'driver_id' => ['Ce conducteur est introuvable ou son KYC n\'est pas approuvé.'],
            ]);
        }

        // The new driver's car must seat at least everyone already matched
        // to this trip — total_seats/available_seats are recomputed against
        // it below so the two stay consistent.
        $bookedSeats = $demLeguiTrip->total_seats - $demLeguiTrip->available_seats;

        $car = Car::where('driver_id', $data['driver_id'])
            ->where('is_active', true)
            ->where('seats', '>=', max($bookedSeats, 1))
            ->first();

        if (! $car) {
            throw ValidationException::withMessages([
                'driver_id' => ['Ce conducteur n\'a aucun véhicule actif avec une capacité suffisante.'],
            ]);
        }

        $demLeguiTrip->update([
            'driver_id' => $data['driver_id'],
            'car_id' => $car->id,
            'total_seats' => $car->seats,
            'available_seats' => $car->seats - $bookedSeats,
        ]);

        $fresh = $demLeguiTrip->fresh(self::EAGER_LOAD);

        $this->auditLog->record($request->user(), 'dem_legui_trip.assign_driver', "Trajet Dem Légui #{$demLeguiTrip->id} réassigné au conducteur #{$data['driver_id']}.", $fresh);

        return new DemLeguiTripResource($fresh);
    }
}
