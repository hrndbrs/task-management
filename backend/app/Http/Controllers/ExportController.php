<?php

namespace App\Http\Controllers;

use App\Enums\ExportStatus;
use App\Http\Requests\StoreExportRequest;
use App\Http\Resources\ExportResource;
use App\Jobs\GenerateTaskExport;
use App\Models\Export;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return ExportResource::collection(
            $request->user()->exports()->latest()->latest('id')->paginate(15),
        );
    }

    public function store(StoreExportRequest $request): JsonResponse
    {
        $export = $request->user()->exports()->create([
            'format' => $request->string('format')->toString(),
            'filters' => $request->filters(),
        ]);

        GenerateTaskExport::dispatch($export);

        return ExportResource::make($export)
            ->response()
            ->setStatusCode(202);
    }

    public function show(Export $export): ExportResource
    {
        Gate::authorize('view', $export);

        return ExportResource::make($export);
    }

    public function download(Export $export): StreamedResponse
    {
        Gate::authorize('view', $export);

        abort_if($export->status === ExportStatus::Failed, 410, 'This export failed. Please request a new one.');
        abort_unless($export->status === ExportStatus::Completed, 409, 'This export is still being generated.');

        return Storage::disk(config('exports.disk'))->download($export->file_path, $export->downloadName());
    }
}
