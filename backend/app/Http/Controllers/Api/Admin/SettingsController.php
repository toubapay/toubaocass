<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateKycModeRequest;
use App\Services\KycReviewService;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function __construct(private readonly KycReviewService $kycReviewService) {}

    public function kycMode()
    {
        return response()->json(['mode' => $this->kycReviewService->mode()]);
    }

    public function updateKycMode(UpdateKycModeRequest $request)
    {
        $this->kycReviewService->setMode($request->string('mode'), $request->user());

        return response()->json(['mode' => $this->kycReviewService->mode()]);
    }
}
