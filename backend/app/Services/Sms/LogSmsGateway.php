<?php

namespace App\Services\Sms;

use App\Contracts\SmsGateway;
use Illuminate\Support\Facades\Log;

/**
 * Default SMS gateway for local/dev environments: writes the message to the
 * log instead of calling a paid SMS provider. Swap to TwilioSmsGateway (or
 * another provider) in production via the SMS_DRIVER env var.
 */
class LogSmsGateway implements SmsGateway
{
    public function send(string $phone, string $message): void
    {
        Log::channel(config('logging.default'))
            ->info("[SMS] to {$phone}: {$message}");
    }
}
