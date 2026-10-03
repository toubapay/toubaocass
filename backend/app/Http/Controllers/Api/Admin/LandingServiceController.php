<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLandingServiceRequest;
use App\Http\Requests\Admin\UpdateLandingServiceRequest;
use App\Http\Resources\Admin\LandingServiceResource;
use App\Models\LandingService;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class LandingServiceController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index()
    {
        return LandingServiceResource::collection(LandingService::query()->orderBy('sort_order')->get());
    }

    public function store(StoreLandingServiceRequest $request)
    {
        $data = $request->validated();
        $data['sort_order'] = $data['sort_order'] ?? ((LandingService::max('sort_order') ?? 0) + 1);
        $data['is_active'] = $data['is_active'] ?? true;

        $service = LandingService::create($data);
        $this->auditLog->record($request->user(), 'landing_page.service.create', "Service \"{$service->title_fr}\" créé.", $service);

        return new LandingServiceResource($service);
    }

    public function update(UpdateLandingServiceRequest $request, LandingService $landingService)
    {
        $landingService->update($request->validated());
        $this->auditLog->record($request->user(), 'landing_page.service.update', "Service \"{$landingService->title_fr}\" modifié.", $landingService, $request->validated());

        return new LandingServiceResource($landingService->fresh());
    }

    public function destroy(Request $request, LandingService $landingService)
    {
        $title = $landingService->title_fr;
        $landingService->delete();

        $this->auditLog->record($request->user(), 'landing_page.service.delete', "Service \"{$title}\" supprimé.");

        return response()->json(null, 204);
    }

    public function reorder(Request $request)
    {
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];

        foreach ($ids as $index => $id) {
            LandingService::whereKey($id)->update(['sort_order' => $index + 1]);
        }

        $this->auditLog->record($request->user(), 'landing_page.service.reorder', 'Services réordonnés.');

        return LandingServiceResource::collection(LandingService::query()->orderBy('sort_order')->get());
    }
}
