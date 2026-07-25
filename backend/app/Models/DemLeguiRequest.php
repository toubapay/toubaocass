<?php

namespace App\Models;

use Database\Factories\DemLeguiRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Support\Geo;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    /**
     * Assumed average approach speed (km/h) used to turn the driver's
     * distance to this pickup point into a rough ETA in minutes — slower
     * than CityDistanceService's 60 km/h intercity estimate since this is
     * local/urban approach driving, not a highway leg.
     */
    const APPROACH_SPEED_KMH = 30.0;

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

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * Rough time-until-arrival for the rider, based on the driver's last
     * reported position — the trip's own live position while under way,
     * falling back to the driver's continuous online-status ping while
     * still en route to pick everyone up. Null once there's no usable
     * driver position or the trip isn't in a "driver is approaching" state.
     */
    public function etaMinutes(): ?int
    {
        if ($this->trip === null || ! in_array($this->trip->status, [DemLeguiTrip::STATUS_OPEN, DemLeguiTrip::STATUS_IN_PROGRESS], true)) {
            return null;
        }

        $driverLat = $this->trip->current_latitude ?? $this->trip->driver?->driverProfile?->current_latitude;
        $driverLng = $this->trip->current_longitude ?? $this->trip->driver?->driverProfile?->current_longitude;

        if ($driverLat === null || $driverLng === null) {
            return null;
        }

        $distanceKm = Geo::haversineKm($driverLat, $driverLng, $this->pickup_latitude, $this->pickup_longitude);

        return max(1, (int) ceil($distanceKm / self::APPROACH_SPEED_KMH * 60));
    }
}
