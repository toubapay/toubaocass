<?php

namespace App\Events;

use App\Models\AnandoRide;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AnandoRidePosted
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly AnandoRide $anandoRide) {}
}
