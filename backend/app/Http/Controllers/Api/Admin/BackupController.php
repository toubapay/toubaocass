<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Spatie\Backup\BackupDestination\Backup;
use Spatie\Backup\BackupDestination\BackupDestination;

class BackupController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index()
    {
        $destination = $this->destination();

        return response()->json([
            'disk' => $destination->diskName(),
            'reachable' => $destination->isReachable(),
            'backups' => $destination->backups()->map(fn (Backup $backup) => [
                'path' => $backup->path(),
                'date' => $backup->date(),
                'size_bytes' => (int) $backup->sizeInBytes(),
            ])->values(),
        ]);
    }

    public function store(Request $request)
    {
        Artisan::call('backup:run');

        $this->auditLog->record($request->user(), 'backup.run', 'Sauvegarde manuelle déclenchée.');

        return response()->json(['output' => Artisan::output()]);
    }

    public function download(Request $request, string $path)
    {
        $destination = $this->destination();
        $decodedPath = base64_decode($path, true);

        abort_if($decodedPath === false, 404);
        abort_unless(
            $destination->backups()->contains(fn (Backup $backup) => $backup->path() === $decodedPath),
            404,
        );

        return Storage::disk($destination->diskName())->download($decodedPath);
    }

    private function destination(): BackupDestination
    {
        return BackupDestination::create(
            config('backup.backup.destination.disks')[0],
            config('backup.backup.name'),
        );
    }
}
