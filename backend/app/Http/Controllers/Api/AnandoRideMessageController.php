<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\AnandoRideBooking;
use Illuminate\Http\Request;

class AnandoRideMessageController extends Controller
{
    /**
     * Chat thread for an Anando booking — shared between the joiner and
     * the poster of the ride. Fetching the thread also marks the other
     * party's messages as read.
     */
    public function index(Request $request, AnandoRideBooking $anandoRideBooking)
    {
        $this->authorize('chat', $anandoRideBooking);

        $messages = $anandoRideBooking->messages()->with('sender')->orderBy('created_at')->get();

        $anandoRideBooking->messages()
            ->where('sender_id', '!=', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return MessageResource::collection($messages);
    }

    public function store(StoreMessageRequest $request, AnandoRideBooking $anandoRideBooking)
    {
        $this->authorize('chat', $anandoRideBooking);

        $message = $anandoRideBooking->messages()->create([
            'sender_id' => $request->user()->id,
            'body' => $request->validated('body'),
        ]);

        MessageSent::dispatch($message);

        return new MessageResource($message->load('sender'));
    }
}
