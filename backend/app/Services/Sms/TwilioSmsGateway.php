<?php

namespace App\Services\Sms;

use App\Contracts\SmsGateway;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends SMS via the Twilio REST API using plain HTTP (no vendor SDK required).
 * Configure TWILIO_SID, TWILIO_TOKEN and TWILIO_FROM in .env and set
 * SMS_DRIVER=twilio to activate.
 */
class TwilioSmsGateway implements SmsGateway
{
    public function __construct(
        private readonly string $sid,
        private readonly string $token,
        private readonly string $from,
    ) {}

    public function send(string $phone, string $message): void
    {
        $response = Http::asForm()
            ->withBasicAuth($this->sid, $this->token)
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$this->sid}/Messages.json", [
                'To' => $phone,
                'From' => $this->from,
                'Body' => $message,
            ]);

        if ($response->failed()) {
            Log::warning('Twilio SMS delivery failed', [
                'phone' => $phone,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }
    }
}
