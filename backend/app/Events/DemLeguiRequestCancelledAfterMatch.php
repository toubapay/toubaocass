<?php

namespace App\Events;

use App\Models\DemLeguiRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired only when the cancelled request had already been matched to a
 * driver's trip — an unmatched (still-pending) cancellation has nobody on
 * the driver side to tell.
 */
class DemLeguiRequestCancelledAfterMatch
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly DemLeguiRequest $request) {}
}
