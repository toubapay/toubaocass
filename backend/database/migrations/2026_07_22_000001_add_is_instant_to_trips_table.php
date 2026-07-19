<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->boolean('is_instant')->default(false)->after('status');
            $table->index(['is_instant', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropIndex(['is_instant', 'status']);
            $table->dropColumn('is_instant');
        });
    }
};
