<?php

namespace App\Http\Requests;

use App\Models\ChunkedUpload;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreUploadChunkRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->upload());
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['index' => $this->route('index')]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'index' => ['required', 'integer', 'min:0', 'max:'.($this->upload()->total_chunks - 1)],
            'chunk' => ['required', 'file'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->hasAny(['index', 'chunk'])) {
                    return;
                }

                $expected = $this->upload()->expectedChunkSize($this->integer('index'));

                if ($this->file('chunk')->getSize() !== $expected) {
                    $validator->errors()->add('chunk', "The chunk must be exactly {$expected} bytes.");
                }
            },
        ];
    }

    public function upload(): ChunkedUpload
    {
        return $this->route('upload');
    }
}
