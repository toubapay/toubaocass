<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnandoRideResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'poster' => [
                'id' => $this->poster->id,
                'name' => $this->poster->name,
                'phone' => $this->poster->phone,
                'role' => $this->poster->role,
                'anando_rating' => $this->poster->anando_rating,
                'anando_ratings_count' => $this->poster->anando_ratings_count,
            ],
            'origin_city' => new CityResource($this->whenLoaded('originCity')),
            'destination_city' => new CityResource($this->whenLoaded('destinationCity')),
            'departure_point' => $this->departure_point,
            'departure_latitude' => $this->departure_latitude,
            'departure_longitude' => $this->departure_longitude,
            'departure_at' => $this->departure_at,
            'started_at' => $this->started_at,
            'price_per_seat' => $this->price_per_seat,
            'total_seats' => $this->total_seats,
            'available_seats' => $this->available_seats,
            'vehicle_info' => $this->vehicle_info,
            'notes' => $this->notes,
            'status' => $this->status,
            'is_joinable' => $this->isJoinable(),
            'is_mine' => $request->user() && $request->user()->id === $this->user_id,
            'created_at' => $this->created_at,
            'bookings' => AnandoRideBookingResource::collection($this->whenLoaded('bookings')),
            'my_booking' => $this->when($this->relationLoaded('myBooking'), fn () => $this->myBooking ? [
                'id' => $this->myBooking->id,
                'seats_booked' => $this->myBooking->seats_booked,
                'price_total' => $this->myBooking->price_total,
                'payment_method' => $this->myBooking->payment_method,
                'status' => $this->myBooking->status,
            ] : null),
            // Ratings the *current* requester has already submitted for this
            // ride (scoped server-side via `ratings` => rater_id = viewer),
            // so the frontend can show "already rated" vs. a rating prompt
            // without a second round trip.
            'my_ratings_given' => $this->when($this->relationLoaded('ratings'), fn () => $this->ratings->map(fn ($r) => [
                'ratee_id' => $r->ratee_id,
                'score' => $r->score,
                'comment' => $r->comment,
            ])->values()),
        ];
    }
}
