<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateLandingLogoRequest;
use App\Http\Requests\Admin\UpdateLandingPageSettingsRequest;
use App\Services\AuditLogService;
use App\Services\LandingPageSettingsService;
use Illuminate\Http\Request;

class LandingPageSettingsController extends Controller
{
    public function __construct(
        private readonly LandingPageSettingsService $landingSettings,
        private readonly AuditLogService $auditLog,
    ) {}

    public function show()
    {
        return response()->json($this->landingSettings->get());
    }

    public function update(UpdateLandingPageSettingsRequest $request)
    {
        $settings = $this->landingSettings->update($request->validated(), $request->user());

        $this->auditLog->record($request->user(), 'landing_page.settings.update', 'Mise à jour du contenu de la page de présentation.', metadata: $request->validated());

        return response()->json($settings);
    }

    public function updateLogo(UpdateLandingLogoRequest $request)
    {
        $settings = $this->landingSettings->updateLogo($request->file('logo'), $request->user());

        $this->auditLog->record($request->user(), 'landing_page.logo.update', 'Logo de la page de présentation mis à jour.');

        return response()->json($settings);
    }

    public function destroyLogo(Request $request)
    {
        $settings = $this->landingSettings->removeLogo($request->user());

        $this->auditLog->record($request->user(), 'landing_page.logo.delete', 'Logo de la page de présentation supprimé.');

        return response()->json($settings);
    }
}
