<?php

namespace App\Http\Requests\Rider;

use App\Models\Delivery;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDeliveryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'receiver_name' => ['required', 'string', 'max:100'],
            'receiver_phone' => ['required', 'string', 'max:30'],
            'receiver_address_line' => ['required', 'string', 'max:255'],
            'receiver_latitude' => ['required', 'numeric', 'between:-90,90'],
            'receiver_longitude' => ['required', 'numeric', 'between:-180,180'],
            'pickup_address_line' => ['required', 'string', 'max:255'],
            'pickup_latitude' => ['required', 'numeric', 'between:-90,90'],
            'pickup_longitude' => ['required', 'numeric', 'between:-180,180'],
            'package_type' => ['required', Rule::in([
                Delivery::PACKAGE_TYPE_DOCUMENT,
                Delivery::PACKAGE_TYPE_COLIS_LEGER,
                Delivery::PACKAGE_TYPE_COLIS_MOYEN,
                Delivery::PACKAGE_TYPE_COLIS_VOLUMINEUX,
            ])],
            'notes' => ['nullable', 'string', 'max:500'],
            'payment_method' => ['sometimes', Rule::in([Delivery::PAYMENT_METHOD_CASH, Delivery::PAYMENT_METHOD_WALLET])],
        ];
    }
}
