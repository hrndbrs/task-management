<?php

namespace App\Http\Requests;

use App\Enums\TaskStatus;
use App\Models\Task;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class BulkUpdateTaskStatusRequest extends FormRequest
{
    public const MAX_TASKS = 1000;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'task_ids' => ['required', 'array', 'min:1', 'max:'.self::MAX_TASKS],
            'task_ids.*' => ['integer', 'distinct'],
            'status' => ['required', Rule::enum(TaskStatus::class)],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $missing = array_diff($this->taskIds(), Task::whereKey($this->taskIds())->pluck('id')->all());

                if ($missing) {
                    $validator->errors()->add('task_ids', 'These tasks do not exist: '.implode(', ', $missing).'.');
                }
            },
        ];
    }

    /**
     * @return list<int>
     */
    public function taskIds(): array
    {
        return array_map('intval', $this->input('task_ids'));
    }
}
