<?php

namespace App\Models;

use Database\Factories\AnandoRideBookingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'anando_ride_id', 'user_id', 'seats_booked', 'price_total', 'payment_method',
    'commission_amount', 'commission_rate', 'status',
])]
class AnandoRideBooking extends Model
{
    /** @use HasFactory<AnandoRideBookingFactory> */
    use HasFactory;

    const STATUS_CONFIRMED = 'confirmed';

    const STATUS_CANCELLED = 'cancelled';

    const PAYMENT_METHOD_CASH = 'cash';

    const PAYMENT_METHOD_WALLET = 'wallet';

    protected function casts(): array
    {
        return [
            'commission_rate' => 'decimal:2',
        ];
    }

    public function anandoRide(): BelongsTo
    {
        return $this->belongsTo(AnandoRide::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
