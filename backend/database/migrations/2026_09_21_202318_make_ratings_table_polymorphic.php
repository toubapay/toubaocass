<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Ratings were Anando-only (a hardcoded anando_ride_id FK). Trip, Dem Légui
 * trip, and Delivery ratings need the same table, so this replaces that FK
 * with a polymorphic rateable_type/rateable_id pair — existing rows are
 * backfilled to point at their AnandoRide before the old column is dropped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->string('rateable_type')->nullable()->after('id');
            $table->unsignedBigInteger('rateable_id')->nullable()->after('rateable_type');
        });

        DB::table('ratings')->update([
            'rateable_type' => \App\Models\AnandoRide::class,
            'rateable_id' => DB::raw('anando_ride_id'),
        ]);

        Schema::table('ratings', function (Blueprint $table) {
            $table->dropUnique(['anando_ride_id', 'rater_id', 'ratee_id']);
            $table->dropForeign(['anando_ride_id']);
            $table->dropColumn('anando_ride_id');

            $table->string('rateable_type')->nullable(false)->change();
            $table->unsignedBigInteger('rateable_id')->nullable(false)->change();

            $table->unique(['rateable_type', 'rateable_id', 'rater_id', 'ratee_id']);
            $table->index(['rateable_type', 'rateable_id']);
        });
    }

    public function down(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->dropUnique(['rateable_type', 'rateable_id', 'rater_id', 'ratee_id']);
            $table->dropIndex(['rateable_type', 'rateable_id']);

            $table->foreignId('anando_ride_id')->nullable()->after('id')->constrained('anando_rides')->cascadeOnDelete();
        });

        DB::table('ratings')->update(['anando_ride_id' => DB::raw('rateable_id')]);

        Schema::table('ratings', function (Blueprint $table) {
            $table->foreignId('anando_ride_id')->nullable(false)->change();
            $table->dropColumn(['rateable_type', 'rateable_id']);
            $table->unique(['anando_ride_id', 'rater_id', 'ratee_id']);
        });
    }
};
