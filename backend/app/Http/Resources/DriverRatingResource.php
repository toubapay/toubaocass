<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DriverRatingResource extends JsonResource
{
    const TYPE_LABELS = [
        'App\\Models\\Trip' => 'trip',
        'App\\Models\\DemLeguiTrip' => 'dem_legui_trip',
        'App\\Models\\Delivery' => 'delivery',
    ];

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'score' => $this->score,
            'comment' => $this->comment,
            'rater_name' => $this->rater?->name,
            'rateable_type' => self::TYPE_LABELS[$this->rateable_type] ?? $this->rateable_type,
            'created_at' => $this->created_at,
        ];
    }
}
