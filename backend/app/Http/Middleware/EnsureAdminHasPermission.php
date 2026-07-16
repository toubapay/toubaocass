<?php

namespace App\Http\Middleware;

use App\Models\AdminUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminHasPermission
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $admin = $request->user();

        if (! $admin instanceof AdminUser || ! $admin->isActive()) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        if (! $admin->hasPermission($permission)) {
            return response()->json(['message' => "Vous n'avez pas la permission requise pour cette action."], 403);
        }

        return $next($request);
    }
}
