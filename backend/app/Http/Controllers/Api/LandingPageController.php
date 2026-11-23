<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LandingService;
use App\Models\LandingSlide;
use App\Models\LandingStep;
use App\Models\LandingTrustItem;
use App\Services\LandingPageSettingsService;
use Illuminate\Support\Facades\Cache;

class LandingPageController extends Controller
{
    public function __construct(private readonly LandingPageSettingsService $landingSettings) {}

    /**
     * Public, unauthenticated aggregate payload for the /lending marketing
     * page — one request instead of five, since every visitor is
     * anonymous. Only active rows are returned, already ordered, so the
     * frontend just maps over them.
     *
     * Cached whole: 'settings' already goes through
     * LandingPageSettingsService -> PlatformSettingsService, which is
     * itself cached and invalidated on write, so re-caching it here too is
     * harmless (a fast array read, not a second query). The 4 admin
     * controllers for slides/services/trust-items/steps each forget this
     * same key on every create/update/delete/reorder.
     */
    public function index()
    {
        return response()->json(Cache::rememberForever('landing_page:public', fn () => [
            'settings' => $this->landingSettings->get(),
            'slides' => LandingSlide::query()->where('is_active', true)->orderBy('sort_order')->get(),
            'services' => LandingService::query()->where('is_active', true)->orderBy('sort_order')->get(),
            'trust_items' => LandingTrustItem::query()->where('is_active', true)->orderBy('sort_order')->get(),
            'steps' => LandingStep::query()->where('is_active', true)->orderBy('sort_order')->get(),
        ]));
    }
}
