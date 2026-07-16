<?php

namespace App\Services;

use App\Models\AdminUser;
use App\Models\SecurityAlert;
use App\Models\User;

class SecurityAlertService
{
    public function record(string $type, string $severity, string $message, ?User $user = null, array $metadata = []): SecurityAlert
    {
        return SecurityAlert::create([
            'type' => $type,
            'severity' => $severity,
            'message' => $message,
            'user_id' => $user?->id,
            'metadata' => $metadata,
            'status' => SecurityAlert::STATUS_OPEN,
        ]);
    }

    public function acknowledge(SecurityAlert $alert, AdminUser $admin): SecurityAlert
    {
        $alert->update([
            'status' => SecurityAlert::STATUS_ACKNOWLEDGED,
            'acknowledged_by_admin_id' => $admin->id,
            'acknowledged_at' => now(),
        ]);

        return $alert->fresh();
    }
}
