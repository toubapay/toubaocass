<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\SecurityAlertResource;
use App\Models\SecurityAlert;
use App\Services\SecurityAlertService;
use Illuminate\Http\Request;

class SecurityAlertController extends Controller
{
    public function __construct(private readonly SecurityAlertService $securityAlerts) {}

    public function index(Request $request)
    {
        $alerts = SecurityAlert::query()
            ->with(['user', 'acknowledgedBy'])
            ->when($request->string('status')->isNotEmpty(), fn ($query) => $query->where('status', $request->string('status')))
            ->latest('id')
            ->paginate(20);

        return SecurityAlertResource::collection($alerts);
    }

    public function acknowledge(Request $request, SecurityAlert $securityAlert)
    {
        $alert = $this->securityAlerts->acknowledge($securityAlert, $request->user());

        return new SecurityAlertResource($alert->load(['user', 'acknowledgedBy']));
    }
}
