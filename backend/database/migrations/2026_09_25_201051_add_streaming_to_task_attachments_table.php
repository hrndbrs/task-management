<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_attachments', function (Blueprint $table) {
            $table->string('stream_status')->nullable()->after('scanned_at');
            $table->string('stream_path')->nullable()->after('stream_status');
            $table->decimal('duration', 10, 3)->unsigned()->nullable()->after('stream_path');
        });
    }

    public function down(): void
    {
        Schema::table('task_attachments', function (Blueprint $table) {
            $table->dropColumn(['stream_status', 'stream_path', 'duration']);
        });
    }
};
