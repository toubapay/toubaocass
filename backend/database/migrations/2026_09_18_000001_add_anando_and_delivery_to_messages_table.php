<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            // Anando is peer-to-peer and a single ride can have several
            // joiners, so a thread is scoped to one joiner's booking (the
            // poster ↔ that joiner) rather than the whole ride — keeps the
            // existing single read_at column meaningful (always exactly 2
            // participants per thread, same as booking/dem_legui chat).
            $table->foreignId('anando_ride_booking_id')->nullable()->after('dem_legui_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('delivery_id')->nullable()->after('anando_ride_booking_id')->constrained()->cascadeOnDelete();

            $table->index(['anando_ride_booking_id', 'created_at']);
            $table->index(['delivery_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['anando_ride_booking_id']);
            $table->dropIndex(['anando_ride_booking_id', 'created_at']);
            $table->dropColumn('anando_ride_booking_id');

            $table->dropForeign(['delivery_id']);
            $table->dropIndex(['delivery_id', 'created_at']);
            $table->dropColumn('delivery_id');
        });
    }
};
