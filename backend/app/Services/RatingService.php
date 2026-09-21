<?php

namespace App\Services;

use App\Models\AnandoRide;
use App\Models\Delivery;
use App\Models\DemLeguiTrip;
use App\Models\Rating;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class RatingService
{
    /**
     * The rateable types that represent a professional driver's job
     * performance (Trip, Dem Légui, Delivery) — kept separate from Anando's
     * peer-to-peer carpooling ratings, which stay on users.anando_rating and
     * never feed a driver's tier. A driver can be rated through any of these
     * three; the tier is computed from all of them combined.
     */
    private const DRIVER_RATEABLE_TYPES = [Trip::class, DemLeguiTrip::class, Delivery::class];

    /**
     * Record (or update) a rater's review of a ratee for a completed
     * ride/delivery, then recompute the ratee's stored aggregate from
     * scratch — a straight aggregate rather than an incremental running
     * average, so a later score edit (re-rating) can never drift it.
     */
    public function submitRating(Model $rateable, User $rater, User $ratee, int $score, ?string $comment): Rating
    {
        $rating = Rating::updateOrCreate(
            ['rateable_type' => $rateable::class, 'rateable_id' => $rateable->getKey(), 'rater_id' => $rater->id, 'ratee_id' => $ratee->id],
            ['score' => $score, 'comment' => $comment],
        );

        if ($rateable instanceof AnandoRide) {
            $this->recomputeAnandoRating($ratee);
        } else {
            $this->recomputeDriverRating($ratee);
        }

        return $rating;
    }

    /** @deprecated kept as a thin alias so existing Anando call sites don't need to change */
    public function submitAnandoRating(AnandoRide $ride, User $rater, User $ratee, int $score, ?string $comment): Rating
    {
        return $this->submitRating($ride, $rater, $ratee, $score, $comment);
    }

    private function recomputeAnandoRating(User $ratee): void
    {
        $stats = Rating::where('ratee_id', $ratee->id)
            ->where('rateable_type', AnandoRide::class)
            ->selectRaw('avg(score) as avg_score, count(*) as total')
            ->first();

        $ratee->update([
            'anando_rating' => $stats->total > 0 ? round((float) $stats->avg_score, 2) : null,
            'anando_ratings_count' => (int) $stats->total,
        ]);
    }

    /**
     * Only meaningful for a ratee with a driver profile (Trip/Dem
     * Légui/Delivery ratees are always drivers by construction, but this
     * stays a no-op guard rather than an assumption).
     */
    private function recomputeDriverRating(User $ratee): void
    {
        $driverProfile = $ratee->driverProfile;

        if (! $driverProfile) {
            return;
        }

        $stats = Rating::where('ratee_id', $ratee->id)
            ->whereIn('rateable_type', self::DRIVER_RATEABLE_TYPES)
            ->selectRaw('avg(score) as avg_score, count(*) as total')
            ->first();

        if ($stats->total > 0) {
            $driverProfile->update([
                'rating' => round((float) $stats->avg_score, 2),
                'ratings_count' => (int) $stats->total,
            ]);
        }
    }
}
