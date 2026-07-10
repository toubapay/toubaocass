<?php

namespace App\Services\Sms;

use App\Contracts\SmsGateway;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends SMS via Promobile's BULKSMS CPaaS REST API (the "Facili" account).
 * Configure PROMOBILE_TOKEN and PROMOBILE_FROM in .env and set
 * SMS_DRIVER=promobile to activate.
 *
 * API docs: POST https://bulksms.promobile.sn/api/service/enterprise-service/external/sms
 * with header "Token: <api key>" and JSON body {from, to, content}. A
 * successful response is {"msgid": "...", "errorcode": "200"} — note
 * errorcode is a string mirroring an HTTP status, not an actual HTTP status
 * code, so it has to be checked separately from $response->failed().
 */
class PromobileSmsGateway implements SmsGateway
{
    private const ENDPOINT = 'https://bulksms.promobile.sn/api/service/enterprise-service/external/sms';

    public function __construct(
        private readonly string $token,
        private readonly string $from,
    ) {}

    public function send(string $phone, string $message): void
    {
        $response = Http::withHeaders(['Token' => $this->token])
            ->post(self::ENDPOINT, [
                'from' => $this->from,
                'to' => ltrim($phone, '+'),
                'content' => $message,
            ]);

        if ($response->failed() || $response->json('errorcode') !== '200') {
            Log::warning('Promobile SMS delivery failed', [
                'phone' => $phone,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }
    }
}
