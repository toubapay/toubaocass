<?php

namespace App\Services;

use App\Models\AdminUser;
use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

class AuditLogService
{
    public function record(AdminUser $admin, string $action, string $description, ?Model $subject = null, array $metadata = []): AuditLog
    {
        return AuditLog::create([
            'admin_id' => $admin->id,
            'action' => $action,
            'description' => $description,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'metadata' => $metadata,
        ]);
    }
}
