<?php

namespace App\Events;

use App\Models\DemLeguiTrip;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DemLeguiDriverArrivedAtPickup
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly DemLeguiTrip $trip) {}
}
