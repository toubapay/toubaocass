<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LandingService;
use App\Models\LandingSlide;
use App\Models\LandingStep;
use App\Models\LandingTrustItem;
use App\Services\LandingPageSettingsService;

class LandingPageController extends Controller
{
    public function __construct(private readonly LandingPageSettingsService $landingSettings) {}

    /**
     * Public, unauthenticated aggregate payload for the /lending marketing
     * page — one request instead of five, since every visitor is
     * anonymous. Only active rows are returned, already ordered, so the
     * frontend just maps over them.
     */
    public function index()
    {
        return response()->json([
            'settings' => $this->landingSettings->get(),
            'slides' => LandingSlide::query()->where('is_active', true)->orderBy('sort_order')->get(),
            'services' => LandingService::query()->where('is_active', true)->orderBy('sort_order')->get(),
            'trust_items' => LandingTrustItem::query()->where('is_active', true)->orderBy('sort_order')->get(),
            'steps' => LandingStep::query()->where('is_active', true)->orderBy('sort_order')->get(),
        ]);
    }
}
