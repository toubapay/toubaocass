<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Booking;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    /**
     * Chat thread for a booking — shared between the rider who booked and
     * the driver of that trip. Fetching the thread also marks the other
     * party's messages as read.
     */
    public function index(Request $request, Booking $booking)
    {
        $this->authorize('chat', $booking);

        $messages = $booking->messages()->with('sender')->orderBy('created_at')->get();

        $booking->messages()
            ->where('sender_id', '!=', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return MessageResource::collection($messages);
    }

    public function store(StoreMessageRequest $request, Booking $booking)
    {
        $this->authorize('chat', $booking);

        $message = $booking->messages()->create([
            'sender_id' => $request->user()->id,
            'body' => $request->validated('body'),
        ]);

        MessageSent::dispatch($message);

        return new MessageResource($message->load('sender'));
    }
}
