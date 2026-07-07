<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->decimal('departure_latitude', 10, 7)->nullable()->after('destination_city_id');
            $table->decimal('departure_longitude', 10, 7)->nullable()->after('departure_latitude');
            $table->string('departure_address')->nullable()->after('departure_longitude');

            $table->index(['departure_latitude', 'departure_longitude']);
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropIndex(['departure_latitude', 'departure_longitude']);
            $table->dropColumn(['departure_latitude', 'departure_longitude', 'departure_address']);
        });
    }
};
