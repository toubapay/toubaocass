<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CityResource;
use App\Models\City;

class CityController extends Controller
{
    public function index()
    {
        return CityResource::collection(
            City::where('is_active', true)->orderBy('name')->get()
        );
    }
}
