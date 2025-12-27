<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('paystack_customer_code')->nullable();
            $table->string('paystack_auth_code')->nullable(); // For recurring charges
            $table->json('settings_sync')->nullable(); // To store synced VerseVision settings
            $table->string('api_token', 80)->unique()->nullable()->default(null);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['paystack_customer_code', 'paystack_auth_code', 'settings_sync', 'api_token']);
        });
    }
};
