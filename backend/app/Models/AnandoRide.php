<?php

namespace App\Models;

use Database\Factories\AnandoRideFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'user_id', 'origin_city_id', 'destination_city_id', 'departure_point',
    'departure_latitude', 'departure_longitude', 'departure_at', 'price_per_seat',
    'total_seats', 'available_seats', 'vehicle_info', 'notes', 'status',
    'cancelled_at', 'completed_at',
])]
class AnandoRide extends Model
{
    /** @use HasFactory<AnandoRideFactory> */
    use HasFactory;

    const STATUS_OPEN = 'open';

    const STATUS_FULL = 'full';

    const STATUS_CANCELLED = 'cancelled';

    const STATUS_COMPLETED = 'completed';

    protected function casts(): array
    {
        return [
            'departure_latitude' => 'float',
            'departure_longitude' => 'float',
            'departure_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function isJoinable(): bool
    {
        return $this->status === self::STATUS_OPEN && $this->available_seats > 0;
    }

    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
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
        return $this->hasMany(AnandoRideBooking::class);
    }

    /**
     * The current request's own booking on this ride, if any — constrained
     * per-query by the controller (mirrors Trip::riderBooking), not a
     * fixed relation, since "current user" is request-scoped.
     */
    public function myBooking(): HasOne
    {
        return $this->hasOne(AnandoRideBooking::class);
    }
}
