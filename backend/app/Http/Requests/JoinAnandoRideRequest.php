<?php

namespace App\Http\Requests;

use App\Models\AnandoRideBooking;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class JoinAnandoRideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'seats' => ['required', 'integer', 'min:1', 'max:8'],
            'payment_method' => ['sometimes', Rule::in([
                AnandoRideBooking::PAYMENT_METHOD_CASH,
                AnandoRideBooking::PAYMENT_METHOD_WALLET,
            ])],
        ];
    }
}
