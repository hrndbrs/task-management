<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreChunkedUploadRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('task'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $allowed = config('attachments.allowed_extensions');

        return [
            'file_name' => [
                'required',
                'string',
                'max:255',
                function (string $attribute, mixed $value, Closure $fail) use ($allowed) {
                    if (! in_array(strtolower(pathinfo($value, PATHINFO_EXTENSION)), $allowed, true)) {
                        $fail('The :attribute must be a file of type: '.implode(', ', $allowed).'.');
                    }
                },
            ],
            'file_size' => [
                'required',
                'integer',
                'min:1',
                'max:'.config('attachments.chunked.max_size') * 1024,
            ],
            'attachment_id' => [
                'nullable',
                'integer',
                Rule::exists('task_attachments', 'id')->where('task_id', $this->route('task')->id),
            ],
        ];
    }
}
