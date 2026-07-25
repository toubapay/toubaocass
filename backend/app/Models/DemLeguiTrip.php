<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'driver_id', 'car_id', 'destination_city_id', 'total_seats', 'available_seats',
    'price_per_seat', 'status', 'started_at', 'completed_at',
    'current_latitude', 'current_longitude', 'current_location_updated_at',
])]
class DemLeguiTrip extends Model
{
    const STATUS_OPEN = 'open';

    const STATUS_IN_PROGRESS = 'in_progress';

    const STATUS_COMPLETED = 'completed';

    const STATUS_CANCELLED = 'cancelled';

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'current_latitude' => 'float',
            'current_longitude' => 'float',
            'current_location_updated_at' => 'datetime',
        ];
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class);
    }

    public function destinationCity(): BelongsTo
    {
        return $this->belongsTo(City::class, 'destination_city_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(DemLeguiRequest::class);
    }
}
