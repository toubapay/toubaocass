<?php

namespace App\Models;

use Database\Factories\TripFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'driver_id', 'car_id', 'origin_city_id', 'destination_city_id',
    'departure_latitude', 'departure_longitude', 'departure_address',
    'departure_date', 'departure_time', 'fare', 'ride_type',
    'total_seats', 'available_seats', 'status', 'notes',
])]
class Trip extends Model
{
    /** @use HasFactory<TripFactory> */
    use HasFactory;

    const STATUS_SCHEDULED = 'scheduled';

    const STATUS_FULL = 'full';

    const STATUS_IN_PROGRESS = 'in_progress';

    const STATUS_COMPLETED = 'completed';

    const STATUS_CANCELLED = 'cancelled';

    const RIDE_TYPE_STANDARD = 'standard';

    const RIDE_TYPE_COMFORT = 'comfort';

    const RIDE_TYPE_XL = 'xl';

    protected function casts(): array
    {
        return [
            'departure_date' => 'date',
            'departure_latitude' => 'float',
            'departure_longitude' => 'float',
        ];
    }

    public function hasDepartureLocation(): bool
    {
        return $this->departure_latitude !== null && $this->departure_longitude !== null;
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class);
    }

    public function originCity(): BelongsTo
    {
        return $this->belongsTo(City::class, 'origin_city_id');
    }

    public function destinationCity(): BelongsTo
    {
        return $this->belongsTo(City::class, 'destination_city_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Unconstrained by rider on its own — callers eager-load this with a
     * `where('rider_id', ...)` constraint to surface "does the current rider
     * already have a booking on this trip" in rider-facing trip listings.
     */
    public function riderBooking(): HasOne
    {
        return $this->hasOne(Booking::class);
    }

    public function isBookable(): bool
    {
        return $this->status === self::STATUS_SCHEDULED && $this->available_seats > 0;
    }
}
