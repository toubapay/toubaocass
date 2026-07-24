<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE anando_rides DROP CONSTRAINT anando_rides_status_check');
        DB::statement("ALTER TABLE anando_rides ADD CONSTRAINT anando_rides_status_check CHECK (status IN ('open', 'full', 'in_progress', 'cancelled', 'completed'))");

        Schema::table('anando_rides', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable()->after('departure_at');
        });
    }

    public function down(): void
    {
        Schema::table('anando_rides', function (Blueprint $table) {
            $table->dropColumn('started_at');
        });

        DB::statement('ALTER TABLE anando_rides DROP CONSTRAINT anando_rides_status_check');
        DB::statement("ALTER TABLE anando_rides ADD CONSTRAINT anando_rides_status_check CHECK (status IN ('open', 'full', 'cancelled', 'completed'))");
    }
};
