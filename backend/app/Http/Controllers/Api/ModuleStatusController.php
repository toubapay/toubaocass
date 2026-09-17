<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Module;
use Illuminate\Http\Request;

class ModuleStatusController extends Controller
{
    /**
     * Public key => enabled map so client apps can hide the UI entry point
     * for a module an admin has disabled, without needing admin
     * credentials. A key absent from the response should be treated as
     * enabled by the caller, mirroring ModuleRegistry's fail-open default.
     *
     * ?app=rider|driver folds that app's own enabled_for_* flag into the
     * result on top of the master is_enabled switch, so each app only sees
     * what's actually enabled for it — a module can be on for riders and
     * off for drivers (or vice versa) without either app needing its own
     * endpoint. Omitting it (unknown caller) returns the master switch only.
     */
    public function index(Request $request)
    {
        $app = $request->query('app');

        return Module::query()->get(['key', 'is_enabled', 'enabled_for_rider', 'enabled_for_driver'])
            ->mapWithKeys(fn (Module $module) => [
                $module->key => $module->is_enabled && match ($app) {
                    'rider' => $module->enabled_for_rider,
                    'driver' => $module->enabled_for_driver,
                    default => true,
                },
            ]);
    }
}
