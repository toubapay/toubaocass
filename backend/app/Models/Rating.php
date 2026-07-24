<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single rater -> ratee review left after a completed Anando ride. Both
 * directions use the same table: the poster rates each rider who booked a
 * seat, and each rider rates the poster. One row per (ride, rater, ratee)
 * triple — re-rating updates the existing row rather than creating a new
 * one (see RatingService::submitAnandoRating).
 */
#[Fillable(['anando_ride_id', 'rater_id', 'ratee_id', 'score', 'comment'])]
class Rating extends Model
{
    public function anandoRide(): BelongsTo
    {
        return $this->belongsTo(AnandoRide::class);
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
