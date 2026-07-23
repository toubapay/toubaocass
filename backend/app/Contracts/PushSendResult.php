<?php

namespace App\Contracts;

/**
 * Distinguishes "the push wasn't delivered" from "the token itself is dead"
 * so FcmChannel can clear a stale fcm_token instead of retrying it forever —
 * without this, a rotated/uninstalled-app token silently blocks every
 * future notification to that user with no way to recover short of them
 * manually re-enabling push.
 */
class PushSendResult
{
    public function __construct(
        public readonly bool $sent,
        public readonly bool $tokenInvalid = false,
    ) {}

    public static function success(): self
    {
        return new self(sent: true);
    }

    public static function failed(bool $tokenInvalid = false): self
    {
        return new self(sent: false, tokenInvalid: $tokenInvalid);
    }
}
