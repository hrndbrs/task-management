<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->index('created_at');
            $table->index(['status', 'created_at']);
            $table->index(['assigned_user_id', 'created_at']);
        });

        Schema::table('task_comments', function (Blueprint $table) {
            $table->index(['task_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('task_comments', function (Blueprint $table) {
            $table->dropIndex(['task_id', 'created_at']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['assigned_user_id', 'created_at']);
            $table->dropIndex(['status', 'created_at']);
            $table->dropIndex(['created_at']);
        });
    }
};
