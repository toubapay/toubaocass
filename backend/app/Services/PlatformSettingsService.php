<?php

namespace App\Services;

use App\Models\AdminUser;
use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Cache;

/**
 * Thin key-value store for admin-configurable platform settings (KYC review
 * mode, fare/commission rates in a later phase, etc). Reads are cached
 * forever and invalidated on write — these values change rarely (an admin
 * flips a toggle) but are read on nearly every relevant request.
 */
class PlatformSettingsService
{
    private const CACHE_PREFIX = 'platform_setting:';

    public function get(string $key, ?string $default = null): ?string
    {
        return Cache::rememberForever(
            self::CACHE_PREFIX.$key,
            fn () => PlatformSetting::where('key', $key)->value('value') ?? $default,
        );
    }

    public function set(string $key, string $value, ?AdminUser $admin = null): void
    {
        PlatformSetting::updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'updated_by_admin_id' => $admin?->id],
        );

        Cache::forget(self::CACHE_PREFIX.$key);
    }
}
