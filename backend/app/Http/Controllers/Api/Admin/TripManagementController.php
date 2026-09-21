<?php

namespace App\Http\Controllers\Api\Admin;

use App\Events\TripCancelled;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminTripResource;
use App\Models\Booking;
use App\Models\Car;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\WalletTransaction;
use App\Services\AuditLogService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TripManagementController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index(Request $request)
    {
        $request->validate([
            'status' => ['sometimes', Rule::in([Trip::STATUS_SCHEDULED, Trip::STATUS_FULL, Trip::STATUS_IN_PROGRESS, Trip::STATUS_COMPLETED, Trip::STATUS_CANCELLED])],
        ]);

        $trips = Trip::query()
            ->with(['driver:id,name,phone', 'car:id,driver_id,make,model,plate_number', 'originCity:id,name', 'destinationCity:id,name'])
            ->withCount(['bookings' => fn ($q) => $q->where('status', Booking::STATUS_CONFIRMED)])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->latest()
            ->paginate(20);

        return AdminTripResource::collection($trips);
    }

    public function cancel(Request $request, Trip $trip, WalletService $walletService)
    {
        try {
            DB::transaction(function () use ($trip, $walletService) {
                /** @var Trip $locked */
                $locked = Trip::where('id', $trip->id)->lockForUpdate()->firstOrFail();

                if (in_array($locked->status, [Trip::STATUS_CANCELLED, Trip::STATUS_COMPLETED], true)) {
                    throw new \RuntimeException('Ce trajet ne peut plus être annulé.');
                }

                $confirmedBookings = $locked->bookings()->where('status', Booking::STATUS_CONFIRMED)->get();

                foreach ($confirmedBookings as $booking) {
                    $booking->update(['status' => Booking::STATUS_CANCELLED]);

                    // No driver-side reversal needed — the driver isn't
                    // credited until the trip completes.
                    if ($booking->payment_method === Booking::PAYMENT_METHOD_WALLET) {
                        $walletService->credit($booking->rider, $booking->fare_total, $booking, WalletTransaction::TYPE_REFUND, 'Remboursement de réservation (trajet annulé par un administrateur)');
                    }
                }

                $locked->update(['status' => Trip::STATUS_CANCELLED]);
            });
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $fresh = $trip->fresh();

        TripCancelled::dispatch($fresh);

        $this->auditLog->record($request->user(), 'trip.cancel', "Trajet #{$trip->id} annulé par un administrateur.", $fresh);

        return new AdminTripResource($fresh->load(['driver:id,name,phone', 'car:id,driver_id,make,model,plate_number', 'originCity:id,name', 'destinationCity:id,name'])->loadCount(['bookings' => fn ($q) => $q->where('status', Booking::STATUS_CONFIRMED)]));
    }

    public function assignDriver(Request $request, Trip $trip)
    {
        $data = $request->validate([
            'driver_id' => ['required', 'integer'],
        ]);

        if (in_array($trip->status, [Trip::STATUS_IN_PROGRESS, Trip::STATUS_COMPLETED, Trip::STATUS_CANCELLED], true)) {
            throw ValidationException::withMessages([
                'trip' => ['Ce trajet ne peut plus être réassigné à un autre conducteur.'],
            ]);
        }

        $profile = DriverProfile::where('user_id', $data['driver_id'])->where('kyc_status', DriverProfile::STATUS_APPROVED)->first();

        if (! $profile) {
            throw ValidationException::withMessages([
                'driver_id' => ['Ce conducteur est introuvable ou son KYC n\'est pas approuvé.'],
            ]);
        }

        $car = Car::where('driver_id', $data['driver_id'])->where('is_active', true)->first();

        if (! $car) {
            throw ValidationException::withMessages([
                'driver_id' => ['Ce conducteur n\'a aucun véhicule actif.'],
            ]);
        }

        $trip->update(['driver_id' => $data['driver_id'], 'car_id' => $car->id]);

        $fresh = $trip->fresh();

        $this->auditLog->record($request->user(), 'trip.assign_driver', "Trajet #{$trip->id} réassigné au conducteur #{$data['driver_id']}.", $fresh);

        return new AdminTripResource($fresh->load(['driver:id,name,phone', 'car:id,driver_id,make,model,plate_number', 'originCity:id,name', 'destinationCity:id,name'])->loadCount(['bookings' => fn ($q) => $q->where('status', Booking::STATUS_CONFIRMED)]));
    }
}
