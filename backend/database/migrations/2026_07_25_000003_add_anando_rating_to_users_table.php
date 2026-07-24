<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('anando_rating', 3, 2)->nullable()->after('status');
            $table->unsignedInteger('anando_ratings_count')->default(0)->after('anando_rating');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['anando_rating', 'anando_ratings_count']);
        });
    }
};
