<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('modules', function (Blueprint $table) {
            $table->boolean('enabled_for_rider')->default(true)->after('is_enabled');
            $table->boolean('enabled_for_driver')->default(true)->after('enabled_for_rider');
        });

        // Anando (instant ride-sharing between users) is a rider-facing
        // feature — turn it off on the driver app specifically, requested
        // directly. The master is_enabled switch stays on, so it keeps
        // working for riders.
        DB::table('modules')->where('key', 'anando')->update(['enabled_for_driver' => false]);
    }

    public function down(): void
    {
        Schema::table('modules', function (Blueprint $table) {
            $table->dropColumn(['enabled_for_rider', 'enabled_for_driver']);
        });
    }
};
