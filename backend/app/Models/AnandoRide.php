<?php

namespace App\Models;

use Database\Factories\AnandoRideFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Builder;

#[Fillable([
    'user_id', 'origin_city_id', 'destination_city_id', 'departure_point',
    'departure_latitude', 'departure_longitude', 'departure_at', 'price_per_seat',
    'total_seats', 'available_seats', 'vehicle_info', 'notes', 'status',
    'started_at', 'cancelled_at', 'completed_at',
    'current_latitude', 'current_longitude', 'current_location_updated_at',
])]
class AnandoRide extends Model
{
    /** @use HasFactory<AnandoRideFactory> */
    use HasFactory;

    const STATUS_OPEN = 'open';

    const STATUS_FULL = 'full';

    const STATUS_IN_PROGRESS = 'in_progress';

    const STATUS_CANCELLED = 'cancelled';

    const STATUS_COMPLETED = 'completed';

    /**
     * An Anando ride is only ever "active" for this long after posting —
     * unlike a scheduled Trip, there's no separate departure instant to
     * anchor against, so a poster who never explicitly completes/cancels
     * still has their ride auto-terminated a fixed window after they
     * created it (see AnandoRideController::index() and the
     * anando:terminate-stale command).
     */
    const ACTIVE_WINDOW_HOURS = 5;

    protected function casts(): array
    {
        return [
            'departure_latitude' => 'float',
            'departure_longitude' => 'float',
            'departure_at' => 'datetime',
            'started_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'completed_at' => 'datetime',
            'current_latitude' => 'float',
            'current_longitude' => 'float',
            'current_location_updated_at' => 'datetime',
        ];
    }

    public function isJoinable(): bool
    {
        return $this->status === self::STATUS_OPEN && $this->available_seats > 0;
    }

    /**
     * Not yet cancelled/completed — a poster may only have one of these at
     * a time (enforced in AnandoRideController::store()).
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_OPEN, self::STATUS_FULL, self::STATUS_IN_PROGRESS]);
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

    public function ratings(): HasMany
    {
        return $this->hasMany(Rating::class);
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
