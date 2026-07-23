<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Module;

class ModuleStatusController extends Controller
{
    /**
     * Public key => is_enabled map so client apps can hide the UI entry
     * point for a module an admin has disabled, without needing admin
     * credentials. A key absent from the response should be treated as
     * enabled by the caller, mirroring ModuleRegistry's fail-open default.
     */
    public function index()
    {
        return Module::query()->pluck('is_enabled', 'key');
    }
}
