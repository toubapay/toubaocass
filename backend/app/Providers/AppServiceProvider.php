<?php

namespace App\Providers;

use App\Contracts\DocumentOcrClient;
use App\Contracts\PushGateway;
use App\Contracts\SmsGateway;
use App\Services\Geo\CityDistanceService;
use App\Services\Ocr\SimulatedDocumentOcrClient;
use App\Services\Push\FcmPushGateway;
use App\Services\Push\LogPushGateway;
use App\Services\Sms\LogSmsGateway;
use App\Services\Sms\PromobileSmsGateway;
use App\Services\Sms\TwilioSmsGateway;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SmsGateway::class, function () {
            if (config('services.sms.driver') === 'twilio') {
                return new TwilioSmsGateway(
                    (string) config('services.sms.twilio.sid'),
                    (string) config('services.sms.twilio.token'),
                    (string) config('services.sms.twilio.from'),
                );
            }

            if (config('services.sms.driver') === 'promobile') {
                return new PromobileSmsGateway(
                    (string) config('services.sms.promobile.token'),
                    (string) config('services.sms.promobile.from'),
                );
            }

            return new LogSmsGateway;
        });

        $this->app->singleton(PushGateway::class, function () {
            if (config('services.push.driver') === 'fcm') {
                $credentialsPath = config('services.push.fcm.credentials_path');
                $credentials = $credentialsPath && file_exists($credentialsPath)
                    ? json_decode(file_get_contents($credentialsPath), true)
                    : [];

                return new FcmPushGateway(
                    (string) config('services.push.fcm.project_id'),
                    $credentials ?? [],
                );
            }

            return new LogPushGateway;
        });

        // Singleton so its per-request memo cache actually avoids duplicate
        // city_distances lookups across the trips in one paginated listing.
        $this->app->singleton(CityDistanceService::class);

        $this->app->singleton(DocumentOcrClient::class, function () {
            // No other driver exists yet — adding a real vendor means a
            // new branch here, same shape as SmsGateway above.
            return new SimulatedDocumentOcrClient;
        });
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();

        // Keyed by phone+IP so a single number can't be SMS-bombed and a
        // single IP can't brute-force OTP codes across many numbers.
        RateLimiter::for('otp', function (Request $request) {
            $key = mb_strtolower((string) $request->input('phone')).'|'.$request->ip();

            return Limit::perMinute(5)->by($key);
        });
    }
}
