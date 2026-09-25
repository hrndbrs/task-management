<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class TaskAssigned extends Notification implements ShouldQueueAfterCommit
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 60];

    public bool $deleteWhenMissingModels = true;

    /**
     * Create a new notification instance.
     */
    public function __construct(public Task $task, public User $assignedBy) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject("You've been assigned: {$this->task->title}")
            ->greeting("Hi {$notifiable->name},")
            ->line("{$this->assignedBy->name} assigned you a task.")
            ->line("**{$this->task->title}**")
            ->line('Priority: '.Str::headline($this->task->priority->value))
            ->line('Status: '.Str::headline($this->task->status->value));

        if ($this->task->due_date) {
            $mail->line('Due: '.$this->task->due_date->toFormattedDayDateString());
        }

        if ($this->task->description) {
            $mail->line(Str::limit($this->task->description, 300));
        }

        return $mail->action('View task', config('app.frontend_url')."/tasks/{$this->task->id}");
    }
}
