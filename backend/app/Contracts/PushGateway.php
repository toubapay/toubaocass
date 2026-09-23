<?php

namespace App\Contracts;

interface PushGateway
{
    /**
     * @param  array<string, mixed>  $data
     * @param  array{tag?: string}|null  $osDisplay  When set, the message
     *      includes a native/OS-displayed notification block (Android
     *      `notification`+`collapse_key`, iOS `apns.payload.aps.alert`) in
     *      addition to the usual data payload, so the OS shows/updates it
     *      without the app needing to be running — required for anything
     *      that must appear on a locked/backgrounded phone (e.g. a Dem
     *      Légui driver-approach ETA). `tag` makes repeated sends for the
     *      same subject (e.g. one Dem Légui trip) replace the previous
     *      notification in place instead of stacking. Every other
     *      notification in this app stays data-only (the default, `null`)
     *      to preserve the existing single-display-path behavior — see
     *      FcmPushGateway's own comment on why that matters for web.
     */
    public function send(string $token, string $title, string $body, array $data = [], ?array $osDisplay = null): PushSendResult;
}
