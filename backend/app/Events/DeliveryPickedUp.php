<?php

namespace App\Events;

use App\Models\Delivery;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DeliveryPickedUp
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Delivery $delivery) {}
}
