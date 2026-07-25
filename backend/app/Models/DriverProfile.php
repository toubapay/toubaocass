<?php

namespace App\Models;

use Database\Factories\DriverProfileFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id', 'license_number', 'license_expiry', 'national_id_number',
    'id_document_path', 'license_document_path', 'selfie_path',
    'kyc_status', 'kyc_rejection_reason', 'rating', 'approved_at',
    'is_online', 'last_seen_at', 'current_latitude', 'current_longitude',
])]
class DriverProfile extends Model
{
    /** @use HasFactory<DriverProfileFactory> */
    use HasFactory;

    const STATUS_PENDING = 'pending';

    const STATUS_SUBMITTED = 'submitted';

    const STATUS_APPROVED = 'approved';

    const STATUS_REJECTED = 'rejected';

    protected function casts(): array
    {
        return [
            'license_expiry' => 'date',
            'approved_at' => 'datetime',
            'rating' => 'decimal:2',
            'is_online' => 'boolean',
            'last_seen_at' => 'datetime',
            'current_latitude' => 'float',
            'current_longitude' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isAvailableForDispatch(): bool
    {
        return $this->is_online && $this->kyc_status === self::STATUS_APPROVED;
    }
}
