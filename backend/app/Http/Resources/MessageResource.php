<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'booking_id' => $this->booking_id,
            'dem_legui_request_id' => $this->dem_legui_request_id,
            'body' => $this->body,
            'sender_id' => $this->sender_id,
            'sender_name' => $this->sender->name,
            'is_mine' => $this->sender_id === $request->user()->id,
            'read_at' => $this->read_at,
            'created_at' => $this->created_at,
        ];
    }
}
