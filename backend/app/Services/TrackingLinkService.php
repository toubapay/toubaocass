<?php

namespace App\Services;

use Illuminate\Support\Facades\URL;

/**
 * Builds the "share my live position with family" link used by the SOS
 * button on Trip/Anando/Dem Légui detail pages. The link points at the web
 * app's public /track/{type}/{id} page (no login required) rather than the
 * API directly, so opening it from WhatsApp/SMS shows a real page — but the
 * expires/signature query params are still validated by this same backend's
 * signed-route mechanism when that page fetches its data.
 */
class TrackingLinkService
{
    public const EXPIRY_HOURS = 24;

    public function generateUrl(string $type, int $id): string
    {
        $signed = URL::temporarySignedRoute('public.track', now()->addHours(self::EXPIRY_HOURS), [
            'type' => $type,
            'id' => $id,
        ]);

        $query = parse_url($signed, PHP_URL_QUERY);
        $frontendUrl = rtrim(config('services.web_frontend.url'), '/');

        return "{$frontendUrl}/track/{$type}/{$id}?{$query}";
    }
}
