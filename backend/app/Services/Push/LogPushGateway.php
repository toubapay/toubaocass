<?php

namespace App\Services\Push;

use App\Contracts\PushGateway;
use App\Contracts\PushSendResult;
use Illuminate\Support\Facades\Log;

/**
 * Default push gateway for local/dev environments: writes the notification
 * to the log instead of calling Firebase. Swap to FcmPushGateway in
 * production via the PUSH_DRIVER env var.
 */
class LogPushGateway implements PushGateway
{
    public function send(string $token, string $title, string $body, array $data = [], ?array $osDisplay = null): PushSendResult
    {
        $suffix = $osDisplay !== null ? ' [os-displayed, tag='.($osDisplay['tag'] ?? 'none').']' : '';
        Log::info("[PUSH] to {$token}: {$title} - {$body}{$suffix}", $data);

        return PushSendResult::success();
    }
}
