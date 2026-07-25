<?php

namespace App\Events;

use App\Models\DemLeguiRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DemLeguiRequestPosted
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly DemLeguiRequest $request) {}
}
