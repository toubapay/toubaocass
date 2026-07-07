<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Driver\StoreCarRequest;
use App\Http\Requests\Driver\UpdateCarRequest;
use App\Http\Resources\CarResource;
use App\Models\Car;
use Illuminate\Http\Request;

class CarController extends Controller
{
    public function index(Request $request)
    {
        return CarResource::collection(
            $request->user()->cars()->latest()->get()
        );
    }

    public function store(StoreCarRequest $request)
    {
        $data = $request->safe()->except('photo');

        if ($request->hasFile('photo')) {
            $data['photo_path'] = $request->file('photo')->store('cars', 'public');
        }

        $car = $request->user()->cars()->create($data);

        return new CarResource($car);
    }

    public function update(UpdateCarRequest $request, Car $car)
    {
        $this->authorize('update', $car);

        $data = $request->safe()->except('photo');

        if ($request->hasFile('photo')) {
            $data['photo_path'] = $request->file('photo')->store('cars', 'public');
        }

        $car->update($data);

        return new CarResource($car->fresh());
    }

    public function destroy(Request $request, Car $car)
    {
        $this->authorize('delete', $car);

        $car->delete();

        return response()->json(['message' => 'Car removed.']);
    }
}
