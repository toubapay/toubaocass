<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['wallet_id', 'type', 'amount', 'booking_id', 'description'])]
class WalletTransaction extends Model
{
    const TYPE_TOP_UP = 'top_up';

    const TYPE_PAYMENT = 'payment';

    const TYPE_EARNING = 'earning';

    const TYPE_REFUND = 'refund';

    const TYPE_REFUND_REVERSAL = 'refund_reversal';

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
