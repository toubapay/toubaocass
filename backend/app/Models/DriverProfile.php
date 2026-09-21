<?php

namespace App\Models;

use Database\Factories\DriverProfileFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id', 'license_number', 'license_expiry', 'national_id_number',
    'id_document_path', 'license_document_path', 'selfie_path',
    'kyc_status', 'kyc_rejection_reason', 'rating', 'ratings_count', 'approved_at',
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

    const TIER_DEBUTANT = 'debutant';

    const TIER_SILVER = 'silver';

    const TIER_GOLD = 'gold';

    /**
     * Below this many real ratings, a driver stays Débutant regardless of
     * their (possibly seeded, unearned) rating average — there just isn't
     * enough feedback yet to trust it.
     */
    const MIN_RATINGS_FOR_TIER = 5;

    const SILVER_RATING_THRESHOLD = 3.50;

    const GOLD_RATING_THRESHOLD = 4.50;

    protected function casts(): array
    {
        return [
            'license_expiry' => 'date',
            'approved_at' => 'datetime',
            'rating' => 'decimal:2',
            'ratings_count' => 'integer',
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

    /**
     * Rule-based classification — Débutant / Silver / Gold — derived from
     * the driver's real rating average and how many ratings back it up.
     * Recomputed on the fly rather than stored, so it's never out of sync
     * with the numbers it's based on.
     */
    protected function tier(): Attribute
    {
        return Attribute::make(get: function () {
            if ($this->ratings_count < self::MIN_RATINGS_FOR_TIER) {
                return self::TIER_DEBUTANT;
            }

            $rating = (float) $this->rating;

            if ($rating >= self::GOLD_RATING_THRESHOLD) {
                return self::TIER_GOLD;
            }

            if ($rating >= self::SILVER_RATING_THRESHOLD) {
                return self::TIER_SILVER;
            }

            return self::TIER_DEBUTANT;
        });
    }
}
