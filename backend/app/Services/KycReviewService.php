<?php

namespace App\Services;

use App\Models\AdminUser;
use App\Models\DriverProfile;

class KycReviewService
{
    const MODE_KEY = 'kyc_review_mode';

    const MODE_AUTOMATIC = 'automatic';

    const MODE_MANUAL = 'manual';

    public function __construct(private readonly PlatformSettingsService $settings) {}

    public function mode(): string
    {
        return $this->settings->get(self::MODE_KEY, self::MODE_MANUAL);
    }

    public function setMode(string $mode, ?AdminUser $admin = null): void
    {
        $this->settings->set(self::MODE_KEY, $mode, $admin);
    }

    public function isAutomatic(): bool
    {
        return $this->mode() === self::MODE_AUTOMATIC;
    }

    /**
     * Completeness/expiry check only — no document-content or identity
     * verification. All three documents are already required at submission
     * time, so in practice this only ever blocks on an already-expired
     * license.
     */
    public function passesAutomaticRule(DriverProfile $profile): bool
    {
        return filled($profile->id_document_path)
            && filled($profile->license_document_path)
            && filled($profile->selfie_path)
            && $profile->license_expiry !== null
            && $profile->license_expiry->isFuture();
    }

    /**
     * Called right after a driver submits KYC. Auto-approves when the
     * platform is in automatic mode and the profile passes the rule;
     * otherwise leaves it in "submitted" for manual review.
     */
    public function maybeAutoReview(DriverProfile $profile): DriverProfile
    {
        if ($this->isAutomatic() && $this->passesAutomaticRule($profile)) {
            return $this->approve($profile);
        }

        return $profile;
    }

    public function approve(DriverProfile $profile): DriverProfile
    {
        $profile->update([
            'kyc_status' => DriverProfile::STATUS_APPROVED,
            'kyc_rejection_reason' => null,
            'approved_at' => now(),
        ]);

        return $profile->fresh();
    }

    public function reject(DriverProfile $profile, string $reason): DriverProfile
    {
        $profile->update([
            'kyc_status' => DriverProfile::STATUS_REJECTED,
            'kyc_rejection_reason' => $reason,
            'approved_at' => null,
        ]);

        return $profile->fresh();
    }
}
