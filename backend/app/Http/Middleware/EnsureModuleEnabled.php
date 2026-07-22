<?php

namespace App\Http\Middleware;

use App\Services\ModuleRegistry;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleEnabled
{
    public function __construct(private readonly ModuleRegistry $modules) {}

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $key): Response
    {
        if (! $this->modules->isEnabled($key)) {
            return response()->json(['message' => 'Ce service est temporairement désactivé.'], 403);
        }

        return $next($request);
    }
}
