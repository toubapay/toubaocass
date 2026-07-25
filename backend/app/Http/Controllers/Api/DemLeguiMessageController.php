<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\DemLeguiRequest;
use Illuminate\Http\Request;

class DemLeguiMessageController extends Controller
{
    /**
     * Chat thread for a Dem Légui request — shared between the rider who
     * made it and the driver of the trip it's matched to. Fetching the
     * thread also marks the other party's messages as read.
     */
    public function index(Request $request, DemLeguiRequest $demLeguiRequest)
    {
        $this->authorize('chat', $demLeguiRequest);

        $messages = $demLeguiRequest->messages()->with('sender')->orderBy('created_at')->get();

        $demLeguiRequest->messages()
            ->where('sender_id', '!=', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return MessageResource::collection($messages);
    }

    public function store(StoreMessageRequest $request, DemLeguiRequest $demLeguiRequest)
    {
        $this->authorize('chat', $demLeguiRequest);

        $message = $demLeguiRequest->messages()->create([
            'sender_id' => $request->user()->id,
            'body' => $request->validated('body'),
        ]);

        MessageSent::dispatch($message);

        return new MessageResource($message->load('sender'));
    }
}
