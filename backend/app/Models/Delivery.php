<?php

namespace App\Models;

use Database\Factories\DeliveryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'sender_id', 'driver_id', 'receiver_name', 'receiver_phone', 'receiver_address_line',
    'receiver_latitude', 'receiver_longitude', 'pickup_address_line', 'pickup_latitude',
    'pickup_longitude', 'package_type', 'notes', 'distance_km', 'fee', 'payment_method',
    'status', 'accepted_at', 'picked_up_at', 'delivered_at', 'cancelled_at',
])]
class Delivery extends Model
{
    /** @use HasFactory<DeliveryFactory> */
    use HasFactory;

    const STATUS_PENDING = 'pending';

    const STATUS_ACCEPTED = 'accepted';

    const STATUS_PICKED_UP = 'picked_up';

    const STATUS_DELIVERED = 'delivered';

    const STATUS_CANCELLED = 'cancelled';

    const PACKAGE_TYPE_DOCUMENT = 'document';

    const PACKAGE_TYPE_COLIS_LEGER = 'colis_leger';

    const PACKAGE_TYPE_COLIS_MOYEN = 'colis_moyen';

    const PACKAGE_TYPE_COLIS_VOLUMINEUX = 'colis_volumineux';

    const PAYMENT_METHOD_CASH = 'cash';

    const PAYMENT_METHOD_WALLET = 'wallet';

    protected function casts(): array
    {
        return [
            'receiver_latitude' => 'float',
            'receiver_longitude' => 'float',
            'pickup_latitude' => 'float',
            'pickup_longitude' => 'float',
            'distance_km' => 'float',
            'accepted_at' => 'datetime',
            'picked_up_at' => 'datetime',
            'delivered_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_ACCEPTED], true);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }
}
