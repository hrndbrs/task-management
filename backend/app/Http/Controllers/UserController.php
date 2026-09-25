<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Cache::remember(
            User::DIRECTORY_CACHE_KEY,
            User::DIRECTORY_CACHE_TTL_SECONDS,
            fn () => UserResource::collection(User::query()->orderBy('name')->get())->response()->getData(true),
        ));
    }
}
