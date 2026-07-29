<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->decimal('current_latitude', 10, 7)->nullable()->after('departure_address');
            $table->decimal('current_longitude', 10, 7)->nullable()->after('current_latitude');
            $table->timestamp('current_location_updated_at')->nullable()->after('current_longitude');
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropColumn(['current_latitude', 'current_longitude', 'current_location_updated_at']);
        });
    }
};
