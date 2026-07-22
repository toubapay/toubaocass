<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreModuleRequest;
use App\Http\Requests\Admin\UpdateModuleRequest;
use App\Http\Requests\Admin\UpdateModuleStatusRequest;
use App\Http\Resources\Admin\ModuleResource;
use App\Models\Module;
use App\Services\AuditLogService;
use App\Services\ModuleRegistry;
use Illuminate\Http\Request;

class ModuleController extends Controller
{
    public function __construct(
        private readonly ModuleRegistry $modules,
        private readonly AuditLogService $auditLog,
    ) {}

    public function index()
    {
        return ModuleResource::collection(Module::query()->orderBy('key')->paginate(50));
    }

    public function store(StoreModuleRequest $request)
    {
        $data = $request->validated();
        $data['is_enabled'] = $data['is_enabled'] ?? true;
        $data['enabled_at'] = $data['is_enabled'] ? now() : null;

        $module = Module::create($data);
        $this->modules->forget($module->key);

        $this->auditLog->record($request->user(), 'module.create', "Module \"{$module->name}\" ({$module->key}) créé.", $module);

        return new ModuleResource($module);
    }

    public function update(UpdateModuleRequest $request, Module $module)
    {
        $module->update($request->validated());

        $this->auditLog->record($request->user(), 'module.update', "Module \"{$module->name}\" ({$module->key}) modifié.", $module, $request->validated());

        return new ModuleResource($module->fresh());
    }

    public function updateStatus(UpdateModuleStatusRequest $request, Module $module)
    {
        $enabled = $request->boolean('is_enabled');

        $module->update([
            'is_enabled' => $enabled,
            'enabled_at' => $enabled ? now() : $module->enabled_at,
            'disabled_at' => $enabled ? null : now(),
        ]);

        $this->modules->forget($module->key);

        $action = $enabled ? 'activé' : 'désactivé';
        $this->auditLog->record($request->user(), 'module.status.update', "Module \"{$module->name}\" ({$module->key}) {$action}.", $module);

        return new ModuleResource($module->fresh());
    }

    public function destroy(Request $request, Module $module)
    {
        $key = $module->key;
        $name = $module->name;
        $module->delete();

        $this->modules->forget($key);

        $this->auditLog->record($request->user(), 'module.delete', "Module \"{$name}\" ({$key}) supprimé.");

        return response()->json(null, 204);
    }
}
