<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLandingSlideRequest;
use App\Http\Requests\Admin\UpdateLandingSlideRequest;
use App\Http\Resources\Admin\LandingSlideResource;
use App\Models\LandingSlide;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class LandingSlideController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index()
    {
        return LandingSlideResource::collection(LandingSlide::query()->orderBy('sort_order')->get());
    }

    public function store(StoreLandingSlideRequest $request)
    {
        $data = $request->validated();
        $data['sort_order'] = $data['sort_order'] ?? ((LandingSlide::max('sort_order') ?? 0) + 1);
        $data['is_active'] = $data['is_active'] ?? true;

        $slide = LandingSlide::create($data);
        $this->auditLog->record($request->user(), 'landing_page.slide.create', "Diapositive \"{$slide->title_fr}\" créée.", $slide);

        return new LandingSlideResource($slide);
    }

    public function update(UpdateLandingSlideRequest $request, LandingSlide $landingSlide)
    {
        $landingSlide->update($request->validated());
        $this->auditLog->record($request->user(), 'landing_page.slide.update', "Diapositive \"{$landingSlide->title_fr}\" modifiée.", $landingSlide, $request->validated());

        return new LandingSlideResource($landingSlide->fresh());
    }

    public function destroy(Request $request, LandingSlide $landingSlide)
    {
        $title = $landingSlide->title_fr;
        $landingSlide->delete();

        $this->auditLog->record($request->user(), 'landing_page.slide.delete', "Diapositive \"{$title}\" supprimée.");

        return response()->json(null, 204);
    }

    public function reorder(Request $request)
    {
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];

        foreach ($ids as $index => $id) {
            LandingSlide::whereKey($id)->update(['sort_order' => $index + 1]);
        }

        $this->auditLog->record($request->user(), 'landing_page.slide.reorder', 'Diapositives réordonnées.');

        return LandingSlideResource::collection(LandingSlide::query()->orderBy('sort_order')->get());
    }
}
