<?php

namespace App\Services;

use App\Models\Module;
use Illuminate\Support\Facades\Cache;

/**
 * Cached lookup for whether a platform module/service is enabled. Unknown
 * keys (a module the admin has never touched, or a code path referencing a
 * key that was later deleted) fail OPEN — treated as enabled — so gating a
 * route with a module key never breaks it unless an admin has explicitly
 * disabled that module.
 */
class ModuleRegistry
{
    private const CACHE_PREFIX = 'module_enabled:';

    /**
     * @return array{is_enabled: bool, enabled_for_rider: bool, enabled_for_driver: bool}
     */
    private function flags(string $key): array
    {
        return Cache::rememberForever(self::CACHE_PREFIX.$key, function () use ($key) {
            $module = Module::where('key', $key)->first();

            if (! $module) {
                return ['is_enabled' => true, 'enabled_for_rider' => true, 'enabled_for_driver' => true];
            }

            return [
                'is_enabled' => $module->is_enabled,
                'enabled_for_rider' => $module->enabled_for_rider,
                'enabled_for_driver' => $module->enabled_for_driver,
            ];
        });
    }

    /**
     * $role narrows the check to a single app ('rider' or 'driver') — the
     * master is_enabled switch always applies first (an admin's blanket
     * kill-switch), then, if a role is given, that app's own flag on top of
     * it. Passing no role checks only the master switch.
     */
    public function isEnabled(string $key, ?string $role = null): bool
    {
        $flags = $this->flags($key);

        if (! $flags['is_enabled']) {
            return false;
        }

        return match ($role) {
            'rider' => $flags['enabled_for_rider'],
            'driver' => $flags['enabled_for_driver'],
            default => true,
        };
    }

    public function forget(string $key): void
    {
        Cache::forget(self::CACHE_PREFIX.$key);
    }
}
