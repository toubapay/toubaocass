<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->unsignedInteger('commission_amount')->nullable()->after('fare_total');
            $table->decimal('commission_rate', 5, 2)->nullable()->after('commission_amount');
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->unsignedInteger('commission_amount')->nullable()->after('fee');
            $table->decimal('commission_rate', 5, 2)->nullable()->after('commission_amount');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['commission_amount', 'commission_rate']);
        });

        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn(['commission_amount', 'commission_rate']);
        });
    }
};
