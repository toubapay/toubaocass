<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLandingStepRequest;
use App\Http\Requests\Admin\UpdateLandingStepRequest;
use App\Http\Resources\Admin\LandingStepResource;
use App\Models\LandingStep;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class LandingStepController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index()
    {
        return LandingStepResource::collection(LandingStep::query()->orderBy('sort_order')->get());
    }

    public function store(StoreLandingStepRequest $request)
    {
        $data = $request->validated();
        $data['sort_order'] = $data['sort_order'] ?? ((LandingStep::max('sort_order') ?? 0) + 1);
        $data['is_active'] = $data['is_active'] ?? true;

        $step = LandingStep::create($data);
        $this->auditLog->record($request->user(), 'landing_page.step.create', "Étape \"{$step->title_fr}\" créée.", $step);

        return new LandingStepResource($step);
    }

    public function update(UpdateLandingStepRequest $request, LandingStep $landingStep)
    {
        $landingStep->update($request->validated());
        $this->auditLog->record($request->user(), 'landing_page.step.update', "Étape \"{$landingStep->title_fr}\" modifiée.", $landingStep, $request->validated());

        return new LandingStepResource($landingStep->fresh());
    }

    public function destroy(Request $request, LandingStep $landingStep)
    {
        $title = $landingStep->title_fr;
        $landingStep->delete();

        $this->auditLog->record($request->user(), 'landing_page.step.delete', "Étape \"{$title}\" supprimée.");

        return response()->json(null, 204);
    }

    public function reorder(Request $request)
    {
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];

        foreach ($ids as $index => $id) {
            LandingStep::whereKey($id)->update(['sort_order' => $index + 1]);
        }

        $this->auditLog->record($request->user(), 'landing_page.step.reorder', 'Étapes réordonnées.');

        return LandingStepResource::collection(LandingStep::query()->orderBy('sort_order')->get());
    }
}
