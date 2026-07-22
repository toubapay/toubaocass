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

    public function isEnabled(string $key): bool
    {
        return Cache::rememberForever(
            self::CACHE_PREFIX.$key,
            fn () => Module::where('key', $key)->value('is_enabled') ?? true,
        );
    }

    public function forget(string $key): void
    {
        Cache::forget(self::CACHE_PREFIX.$key);
    }
}
