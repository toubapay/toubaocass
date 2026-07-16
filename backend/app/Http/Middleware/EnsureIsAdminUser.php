<?php

namespace App\Http\Middleware;

use App\Models\AdminUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the routes every authenticated admin may reach regardless of role
 * (fetching their own profile, logging out) — no specific permission is
 * required, just proof the Sanctum token belongs to an AdminUser and not a
 * rider/driver User.
 */
class EnsureIsAdminUser
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $admin = $request->user();

        if (! $admin instanceof AdminUser || ! $admin->isActive()) {
            return response()->json(['message' => 'Accès non autorisé.'], 403);
        }

        return $next($request);
    }
}
