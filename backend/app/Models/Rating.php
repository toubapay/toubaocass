<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * A single rater -> ratee review left after a completed ride/delivery.
 * Polymorphic over what was rated (AnandoRide, Trip, DemLeguiTrip, Delivery)
 * so the same table backs every product's feedback: Anando is bidirectional
 * (poster rates each rider, each rider rates the poster), the other three
 * are one-directional (rider/sender rates the driver only). One row per
 * (rateable, rater, ratee) triple — re-rating updates the existing row
 * rather than creating a new one (see RatingService::submitRating).
 */
#[Fillable(['rateable_type', 'rateable_id', 'rater_id', 'ratee_id', 'score', 'comment'])]
class Rating extends Model
{
    public function rateable(): MorphTo
    {
        return $this->morphTo();
    }

    public function rater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rater_id');
    }

    public function ratee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ratee_id');
    }
}
