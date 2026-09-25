<?php

namespace App\Http\Requests;

use App\Enums\ExportFormat;
use App\Models\Task;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreExportRequest extends ListTasksRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...Arr::except(parent::rules(), 'per_page'),
            'format' => ['required', Rule::enum(ExportFormat::class)],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty() || $this->enum('format', ExportFormat::class) !== ExportFormat::Pdf) {
                    return;
                }

                $limit = config('exports.pdf_max_rows');
                $count = Task::query()->filtered($this->filters())->count();

                if ($count > $limit) {
                    $validator->errors()->add(
                        'format',
                        "PDF exports are limited to {$limit} tasks, but these filters match {$count}. Use CSV or narrow the filters.",
                    );
                }
            },
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function filters(): array
    {
        return Arr::except($this->validated(), 'format');
    }
}
