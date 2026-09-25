<?php

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
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
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default(TaskStatus::Pending->value);
            $table->string('priority')->default(TaskPriority::Medium->value);
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            // restrictOnDelete: a task must keep an accountable creator, so deleting that user is blocked while they still have tasks.
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->date('due_date')->nullable();
            $table->timestamps();

            $table->index(['status', 'priority']);
            $table->index('due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
