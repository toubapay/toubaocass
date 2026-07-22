<?php

namespace App\Support;

use App\Models\AdminUser;

class AdminPermissions
{
    const MANAGE_ADMINS = 'manage_admins';

    const MANAGE_USERS = 'manage_users';

    const MANAGE_KYC = 'manage_kyc';

    const MANAGE_FARES = 'manage_fares';

    const MANAGE_SYSTEM_SETTINGS = 'manage_system_settings';

    const VIEW_DASHBOARD = 'view_dashboard';

    const VIEW_FINANCIALS = 'view_financials';

    const MANAGE_BACKUPS = 'manage_backups';

    const VIEW_SECURITY_ALERTS = 'view_security_alerts';

    const MODERATE_CONTENT = 'moderate_content';

    const MANAGE_INSURANCE = 'manage_insurance';

    const MANAGE_MODULES = 'manage_modules';

    /**
     * Small, fixed role set — a hardcoded map is simpler and easier to audit
     * than a granular DB-backed permissions package for 6 roles.
     */
    private const MATRIX = [
        AdminUser::ROLE_SUPER_ADMIN => [
            self::MANAGE_ADMINS, self::MANAGE_USERS, self::MANAGE_KYC, self::MANAGE_FARES,
            self::MANAGE_SYSTEM_SETTINGS, self::VIEW_DASHBOARD, self::VIEW_FINANCIALS,
            self::MANAGE_BACKUPS, self::VIEW_SECURITY_ALERTS, self::MODERATE_CONTENT, self::MANAGE_INSURANCE,
            self::MANAGE_MODULES,
        ],
        AdminUser::ROLE_ADMIN => [
            self::MANAGE_USERS, self::MANAGE_KYC, self::MANAGE_FARES,
            self::VIEW_DASHBOARD, self::VIEW_FINANCIALS, self::VIEW_SECURITY_ALERTS, self::MODERATE_CONTENT,
            self::MANAGE_INSURANCE, self::MANAGE_MODULES,
        ],
        AdminUser::ROLE_CONTROLLERS => [
            self::VIEW_DASHBOARD, self::VIEW_SECURITY_ALERTS, self::MANAGE_KYC,
        ],
        AdminUser::ROLE_SUPPORT => [
            self::MANAGE_USERS, self::VIEW_DASHBOARD, self::MODERATE_CONTENT,
        ],
        AdminUser::ROLE_ACCOUNTANT => [
            self::VIEW_DASHBOARD, self::VIEW_FINANCIALS, self::MANAGE_FARES, self::MANAGE_INSURANCE,
        ],
        AdminUser::ROLE_SUPERVISEUR => [
            self::VIEW_DASHBOARD, self::VIEW_SECURITY_ALERTS, self::MANAGE_USERS, self::MODERATE_CONTENT,
        ],
    ];

    public static function roleHas(string $role, string $permission): bool
    {
        return in_array($permission, self::MATRIX[$role] ?? [], true);
    }

    public static function forRole(string $role): array
    {
        return self::MATRIX[$role] ?? [];
    }
}
