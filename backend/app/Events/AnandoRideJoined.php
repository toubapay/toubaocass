<?php

namespace App\Events;

use App\Models\AnandoRideBooking;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AnandoRideJoined
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly AnandoRideBooking $booking) {}
}
