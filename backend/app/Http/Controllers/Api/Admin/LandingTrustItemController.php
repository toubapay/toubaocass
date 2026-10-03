<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLandingTrustItemRequest;
use App\Http\Requests\Admin\UpdateLandingTrustItemRequest;
use App\Http\Resources\Admin\LandingTrustItemResource;
use App\Models\LandingTrustItem;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class LandingTrustItemController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index()
    {
        return LandingTrustItemResource::collection(LandingTrustItem::query()->orderBy('sort_order')->get());
    }

    public function store(StoreLandingTrustItemRequest $request)
    {
        $data = $request->validated();
        $data['sort_order'] = $data['sort_order'] ?? ((LandingTrustItem::max('sort_order') ?? 0) + 1);
        $data['is_active'] = $data['is_active'] ?? true;

        $item = LandingTrustItem::create($data);
        $this->auditLog->record($request->user(), 'landing_page.trust_item.create', "Repère de confiance \"{$item->text_fr}\" créé.", $item);

        return new LandingTrustItemResource($item);
    }

    public function update(UpdateLandingTrustItemRequest $request, LandingTrustItem $landingTrustItem)
    {
        $landingTrustItem->update($request->validated());
        $this->auditLog->record($request->user(), 'landing_page.trust_item.update', "Repère de confiance \"{$landingTrustItem->text_fr}\" modifié.", $landingTrustItem, $request->validated());

        return new LandingTrustItemResource($landingTrustItem->fresh());
    }

    public function destroy(Request $request, LandingTrustItem $landingTrustItem)
    {
        $text = $landingTrustItem->text_fr;
        $landingTrustItem->delete();

        $this->auditLog->record($request->user(), 'landing_page.trust_item.delete', "Repère de confiance \"{$text}\" supprimé.");

        return response()->json(null, 204);
    }

    public function reorder(Request $request)
    {
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];

        foreach ($ids as $index => $id) {
            LandingTrustItem::whereKey($id)->update(['sort_order' => $index + 1]);
        }

        $this->auditLog->record($request->user(), 'landing_page.trust_item.reorder', 'Repères de confiance réordonnés.');

        return LandingTrustItemResource::collection(LandingTrustItem::query()->orderBy('sort_order')->get());
    }
}
