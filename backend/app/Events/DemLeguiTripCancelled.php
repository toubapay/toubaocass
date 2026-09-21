<?php

namespace App\Events;

use App\Models\DemLeguiTrip;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DemLeguiTripCancelled
{
    use Dispatchable, SerializesModels;

    /**
     * @param  Collection<int, \App\Models\DemLeguiRequest>  $cancelledRequests  The requests this
     *   cancellation just moved to STATUS_CANCELLED — not every request ever
     *   attached to the trip, so a rider who'd already left independently
     *   isn't told about a cancellation that no longer concerns them.
     */
    public function __construct(
        public readonly DemLeguiTrip $trip,
        public readonly Collection $cancelledRequests,
    ) {}
}
