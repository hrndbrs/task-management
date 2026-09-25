<?php

use App\Enums\ScanStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('task_attachments', function (Blueprint $table) {
            $table->string('scan_status')->default(ScanStatus::Pending->value)->after('mime_type');
            $table->timestamp('scanned_at')->nullable()->after('scan_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_attachments', function (Blueprint $table) {
            $table->dropColumn(['scan_status', 'scanned_at']);
        });
    }
};
