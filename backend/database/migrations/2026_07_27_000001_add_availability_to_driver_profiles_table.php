<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('driver_profiles', function (Blueprint $table) {
            $table->boolean('is_online')->default(false)->after('approved_at');
            $table->timestamp('last_seen_at')->nullable()->after('is_online');
            $table->decimal('current_latitude', 10, 7)->nullable()->after('last_seen_at');
            $table->decimal('current_longitude', 10, 7)->nullable()->after('current_latitude');
        });
    }

    public function down(): void
    {
        Schema::table('driver_profiles', function (Blueprint $table) {
            $table->dropColumn(['is_online', 'last_seen_at', 'current_latitude', 'current_longitude']);
        });
    }
};
