<?php

namespace App\Services;

use App\Models\AdminUser;
use App\Models\DriverProfile;
use App\Models\SecurityAlert;

class KycReviewService
{
    const MODE_KEY = 'kyc_review_mode';

    const MODE_AUTOMATIC = 'automatic';

    const MODE_MANUAL = 'manual';

    public function __construct(
        private readonly PlatformSettingsService $settings,
        private readonly SecurityAlertService $securityAlerts,
        private readonly AuditLogService $auditLog,
    ) {}

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

    public function approve(DriverProfile $profile, ?AdminUser $admin = null): DriverProfile
    {
        $profile->update([
            'kyc_status' => DriverProfile::STATUS_APPROVED,
            'kyc_rejection_reason' => null,
            'approved_at' => now(),
        ]);

        if ($admin !== null) {
            $this->auditLog->record($admin, 'kyc.approve', "Dossier KYC approuvé pour le chauffeur #{$profile->user_id}.", $profile);
        }

        return $profile->fresh();
    }

    public function reject(DriverProfile $profile, string $reason, ?AdminUser $admin = null): DriverProfile
    {
        $profile->update([
            'kyc_status' => DriverProfile::STATUS_REJECTED,
            'kyc_rejection_reason' => $reason,
            'approved_at' => null,
        ]);

        $this->securityAlerts->record(
            SecurityAlert::TYPE_KYC_REJECTED,
            SecurityAlert::SEVERITY_LOW,
            "Dossier KYC rejeté pour le chauffeur #{$profile->user_id}.",
            $profile->user,
            ['driver_profile_id' => $profile->id, 'reason' => $reason],
        );

        if ($admin !== null) {
            $this->auditLog->record($admin, 'kyc.reject', "Dossier KYC rejeté pour le chauffeur #{$profile->user_id}.", $profile, ['reason' => $reason]);
        }

        return $profile->fresh();
    }
}
