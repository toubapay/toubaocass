<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->foreignId('booking_id')->nullable()->change();
            $table->foreignId('dem_legui_request_id')->nullable()->after('booking_id')->constrained()->cascadeOnDelete();

            $table->index(['dem_legui_request_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['dem_legui_request_id']);
            $table->dropIndex(['dem_legui_request_id', 'created_at']);
            $table->dropColumn('dem_legui_request_id');
            $table->foreignId('booking_id')->nullable(false)->change();
        });
    }
};
