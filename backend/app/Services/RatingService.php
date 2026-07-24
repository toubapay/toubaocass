<?php

namespace App\Services;

use App\Models\AnandoRide;
use App\Models\Rating;
use App\Models\User;

class RatingService
{
    /**
     * Record (or update) a rater's review of a ratee for a completed Anando
     * ride, then recompute the ratee's anando_rating average from scratch —
     * a straight aggregate rather than an incremental running average, so a
     * later score edit (re-rating) can never drift the stored average.
     */
    public function submitAnandoRating(AnandoRide $ride, User $rater, User $ratee, int $score, ?string $comment): Rating
    {
        $rating = Rating::updateOrCreate(
            ['anando_ride_id' => $ride->id, 'rater_id' => $rater->id, 'ratee_id' => $ratee->id],
            ['score' => $score, 'comment' => $comment],
        );

        $this->recomputeAnandoRating($ratee);

        return $rating;
    }

    private function recomputeAnandoRating(User $ratee): void
    {
        $stats = Rating::where('ratee_id', $ratee->id)->selectRaw('avg(score) as avg_score, count(*) as total')->first();

        $ratee->update([
            'anando_rating' => $stats->total > 0 ? round((float) $stats->avg_score, 2) : null,
            'anando_ratings_count' => (int) $stats->total,
        ]);
    }
}
