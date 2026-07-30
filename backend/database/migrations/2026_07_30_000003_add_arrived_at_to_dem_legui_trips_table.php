<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dem_legui_trips', function (Blueprint $table) {
            $table->timestamp('arrived_at')->nullable()->after('current_location_updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('dem_legui_trips', function (Blueprint $table) {
            $table->dropColumn('arrived_at');
        });
    }
};
