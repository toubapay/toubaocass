<?php

namespace App\Models;

use Database\Factories\InsuranceProviderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'description', 'api_base_url', 'api_key', 'commission_rate', 'is_active'])]
#[Hidden(['api_key'])]
class InsuranceProvider extends Model
{
    /** @use HasFactory<InsuranceProviderFactory> */
    use HasFactory;

    const CODE_ASS_SENEGAL = 'ass_senegal';

    const CODE_AMSA = 'amsa';

    const CODE_PROVIDENCE = 'providence';

    const CODE_INTOUCH_AGGREGATOR = 'intouch_aggregator';

    protected function casts(): array
    {
        return [
            'commission_rate' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * True once real integration details have been configured — until
     * then, this provider's client operates in simulated-quote mode.
     */
    public function isLiveIntegrated(): bool
    {
        return filled($this->api_base_url) && filled($this->api_key);
    }

    public function policies(): HasMany
    {
        return $this->hasMany(InsurancePolicy::class);
    }
}
