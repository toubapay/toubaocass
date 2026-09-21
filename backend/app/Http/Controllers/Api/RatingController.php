<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DriverRatingResource;
use App\Models\Delivery;
use App\Models\DemLeguiTrip;
use App\Models\Rating;
use App\Models\Trip;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    /**
     * Driver-facing: the reviews riders/senders have left them, across
     * Trip, Dem Légui, and Delivery — the same three rateable types
     * DriverProfile::rating aggregates (Anando's peer ratings live
     * separately on users.anando_rating and never show up here).
     */
    public function mine(Request $request)
    {
        $ratings = Rating::where('ratee_id', $request->user()->id)
            ->whereIn('rateable_type', [Trip::class, DemLeguiTrip::class, Delivery::class])
            ->with('rater')
            ->latest()
            ->paginate(20);

        return DriverRatingResource::collection($ratings);
    }
}
