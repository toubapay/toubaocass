<?php

namespace App\Models;

use Database\Factories\DemLeguiRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'rider_id', 'pickup_latitude', 'pickup_longitude', 'pickup_address',
    'destination_city_id', 'destination_address', 'seats_requested', 'fare_total',
    'payment_method', 'status', 'commission_amount', 'commission_rate', 'dem_legui_trip_id',
])]
class DemLeguiRequest extends Model
{
    /** @use HasFactory<DemLeguiRequestFactory> */
    use HasFactory;

    const STATUS_PENDING = 'pending';

    const STATUS_MATCHED = 'matched';

    const STATUS_CANCELLED = 'cancelled';

    const STATUS_EXPIRED = 'expired';

    const PAYMENT_METHOD_CASH = 'cash';

    const PAYMENT_METHOD_WALLET = 'wallet';

    /**
     * A request's pickup point must be within this many km of a driver's
     * last reported position to be surfaced to them (browsing) or to
     * trigger a notification (posting) — tighter than
     * TripController::search()'s 50km default since this is "come get me
     * now", not "browse for later".
     */
    const NEARBY_RADIUS_KM = 15;

    protected function casts(): array
    {
        return [
            'pickup_latitude' => 'float',
            'pickup_longitude' => 'float',
        ];
    }

    public function rider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rider_id');
    }

    public function destinationCity(): BelongsTo
    {
        return $this->belongsTo(City::class, 'destination_city_id');
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(DemLeguiTrip::class, 'dem_legui_trip_id');
    }
}
