<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CityResource;
use App\Models\City;
use Illuminate\Support\Facades\Cache;

class CityController extends Controller
{
    /**
     * Cached forever — there is no admin-facing write path for cities
     * anywhere in this app (seeded once, read everywhere), so there's
     * nothing in the running app that could ever make this stale. If a
     * city-management feature is added later, forget('cities:active') at
     * its write path, same as ModuleRegistry/PlatformSettingsService do.
     */
    public function index()
    {
        $cities = Cache::rememberForever(
            'cities:active',
            fn () => City::where('is_active', true)->orderBy('name')->get(),
        );

        return CityResource::collection($cities);
    }
}
