<?php

namespace App\Models;

use Database\Factories\SecurityAlertFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['type', 'severity', 'message', 'user_id', 'metadata', 'status', 'acknowledged_by_admin_id', 'acknowledged_at'])]
class SecurityAlert extends Model
{
    /** @use HasFactory<SecurityAlertFactory> */
    use HasFactory;

    const TYPE_REPEATED_OTP_FAILURES = 'repeated_otp_failures';

    const TYPE_KYC_REJECTED = 'kyc_rejected';

    const TYPE_RIDER_SOS = 'rider_sos';

    const SEVERITY_LOW = 'low';

    const SEVERITY_MEDIUM = 'medium';

    const SEVERITY_HIGH = 'high';

    const STATUS_OPEN = 'open';

    const STATUS_ACKNOWLEDGED = 'acknowledged';

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'acknowledged_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'acknowledged_by_admin_id');
    }
}
