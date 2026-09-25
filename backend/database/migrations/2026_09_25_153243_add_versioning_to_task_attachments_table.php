<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('task_attachments', function (Blueprint $table) {
            $table->uuid('version_group')->nullable()->after('task_id');
            $table->unsignedInteger('version')->default(1)->after('version_group');
        });

        // Every existing attachment becomes version 1 of its own file.
        DB::table('task_attachments')->whereNull('version_group')->lazyById()->each(
            fn (object $attachment) => DB::table('task_attachments')
                ->where('id', $attachment->id)
                ->update(['version_group' => (string) Str::uuid()]),
        );

        Schema::table('task_attachments', function (Blueprint $table) {
            $table->uuid('version_group')->nullable(false)->change();
            $table->unique(['version_group', 'version']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('task_attachments', function (Blueprint $table) {
            $table->dropUnique(['version_group', 'version']);
            $table->dropColumn(['version_group', 'version']);
        });
    }
};
