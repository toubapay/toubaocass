<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Delivery;
use Illuminate\Http\Request;

class DeliveryMessageController extends Controller
{
    /**
     * Chat thread for a delivery — shared between the sender and the
     * assigned driver. Fetching the thread also marks the other party's
     * messages as read.
     */
    public function index(Request $request, Delivery $delivery)
    {
        $this->authorize('chat', $delivery);

        $messages = $delivery->messages()->with('sender')->orderBy('created_at')->get();

        $delivery->messages()
            ->where('sender_id', '!=', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return MessageResource::collection($messages);
    }

    public function store(StoreMessageRequest $request, Delivery $delivery)
    {
        $this->authorize('chat', $delivery);

        $message = $delivery->messages()->create([
            'sender_id' => $request->user()->id,
            'body' => $request->validated('body'),
        ]);

        MessageSent::dispatch($message);

        return new MessageResource($message->load('sender'));
    }
}
