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
 * with header "Token: <api key>" and JSON body {from, to, content}. The
 * documented success response is {"msgid": "...", "errorcode": "200"}, but
 * the live API actually responds with an array of per-part results instead,
 * e.g. [{"errorCode":"200","id":"..."}, {"errorCode":"200","id":"..."}] for
 * a message split into multiple parts — note the capital C in "errorCode"
 * here, vs. lowercase in the docs. allSucceeded() below normalizes both
 * shapes and checks every part.
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

        if ($response->failed() || ! $this->allSucceeded($response->json())) {
            Log::warning('Promobile SMS delivery failed', [
                'phone' => $phone,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }
    }

    private function allSucceeded(mixed $payload): bool
    {
        $parts = is_array($payload) && array_is_list($payload) ? $payload : [$payload];

        if (empty($parts)) {
            return false;
        }

        foreach ($parts as $part) {
            $code = is_array($part) ? ($part['errorCode'] ?? $part['errorcode'] ?? null) : null;

            if ($code !== '200') {
                return false;
            }
        }

        return true;
    }
}
