<?php

namespace App\Models;

use Database\Factories\InsurancePolicyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'car_id', 'driver_id', 'insurance_provider_id', 'coverage_type', 'plan_name',
    'annual_premium', 'commission_amount', 'commission_rate', 'policy_number',
    'starts_at', 'ends_at', 'status',
    'vehicle_category', 'vehicle_make', 'vehicle_model', 'vehicle_plate_number',
    'vehicle_power_cv', 'vehicle_seats', 'vehicle_age_bracket', 'vehicle_usage_type',
    'carte_grise_front_path', 'carte_grise_back_path',
])]
class InsurancePolicy extends Model
{
    /** @use HasFactory<InsurancePolicyFactory> */
    use HasFactory;

    const COVERAGE_TIERS_SIMPLE = 'tiers_simple';

    const COVERAGE_TIERS_COLLISION = 'tiers_collision';

    const COVERAGE_TOUS_RISQUES = 'tous_risques';

    const STATUS_ACTIVE = 'active';

    const STATUS_EXPIRED = 'expired';

    const STATUS_CANCELLED = 'cancelled';

    const VEHICLE_CATEGORY_CAR = 'car';

    const VEHICLE_CATEGORY_MOTORCYCLE = 'motorcycle';

    const AGE_BRACKET_UNDER_5 = 'under_5';

    const AGE_BRACKET_FROM_5_TO_10 = 'from_5_to_10';

    const AGE_BRACKET_OVER_10 = 'over_10';

    const USAGE_TYPE_PERSONAL = 'personal';

    const USAGE_TYPE_PROFESSIONAL = 'professional';

    protected function casts(): array
    {
        return [
            'commission_rate' => 'decimal:2',
            'starts_at' => 'date',
            'ends_at' => 'date',
        ];
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE && $this->ends_at->isFuture();
    }

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(InsuranceProvider::class, 'insurance_provider_id');
    }
}
