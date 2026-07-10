<?php

namespace App\Services\Push;

use App\Contracts\PushGateway;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends push notifications through Firebase Cloud Messaging's HTTP v1 API.
 *
 * The v1 API requires an OAuth2 access token minted from a service account,
 * so this class signs its own JWT (RS256, via openssl) and exchanges it for
 * a token at Google's OAuth endpoint rather than pulling in the full
 * google/apiclient dependency tree just for this one call.
 */
class FcmPushGateway implements PushGateway
{
    private const TOKEN_CACHE_KEY = 'fcm:access_token';

    private const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    public function __construct(
        private readonly string $projectId,
        private readonly array $credentials,
    ) {}

    public function send(string $token, string $title, string $body, array $data = []): bool
    {
        $accessToken = $this->getAccessToken();

        if (! $accessToken) {
            Log::warning('FCM push skipped: unable to obtain access token');

            return false;
        }

        $response = Http::withToken($accessToken)
            ->post("https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send", [
                'message' => [
                    'token' => $token,
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                    ],
                    'data' => array_map('strval', $data),
                ],
            ]);

        if ($response->failed()) {
            Log::warning('FCM push delivery failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        }

        return true;
    }

    private function getAccessToken(): ?string
    {
        // Only cache a token we actually got — CACHE_STORE=database persists
        // across redeploys, so caching a failure here via Cache::remember()
        // (which stores whatever the closure returns, null included) would
        // silently block every send for the full TTL even after the
        // underlying problem (bad credentials, network blip) was fixed.
        $cached = Cache::get(self::TOKEN_CACHE_KEY);

        if ($cached) {
            return $cached;
        }

        $jwt = $this->buildSignedJwt();

        if (! $jwt) {
            Log::warning('FCM push skipped: could not build a signed JWT from the configured credentials');

            return null;
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        if ($response->failed()) {
            Log::warning('FCM OAuth token exchange failed', ['status' => $response->status(), 'body' => $response->body()]);

            return null;
        }

        $accessToken = $response->json('access_token');

        if ($accessToken) {
            Cache::put(self::TOKEN_CACHE_KEY, $accessToken, 3000);
        }

        return $accessToken;
    }

    private function buildSignedJwt(): ?string
    {
        $clientEmail = $this->credentials['client_email'] ?? null;
        $privateKey = $this->credentials['private_key'] ?? null;

        if (! $clientEmail || ! $privateKey) {
            return null;
        }

        $now = time();

        $header = $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claims = $this->base64UrlEncode(json_encode([
            'iss' => $clientEmail,
            'scope' => self::SCOPE,
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $signature = '';
        $success = openssl_sign("{$header}.{$claims}", $signature, $privateKey, 'sha256WithRSAEncryption');

        if (! $success) {
            return null;
        }

        return $header.'.'.$claims.'.'.$this->base64UrlEncode($signature);
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
