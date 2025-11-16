<?php

namespace Tests\Traits;

use App\Models\Asset;
use App\Models\AssetType;
use App\Models\FinancialRecord;
use App\Models\Landlord;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\RentInvoice;
use App\Models\Tenant;
use App\Models\TenantUnit;
use App\Models\Unit;
use App\Models\UnitType;

/**
 * Trait for creating test data in tests.
 * 
 * This trait provides helper methods for creating common test entities
 * with sensible defaults. Use this in your test classes to reduce
 * boilerplate when setting up test data.
 */
trait CreatesTestData
{
    /**
     * Create a complete property setup with unit and tenant.
     * 
     * @return array{landlord: Landlord, property: Property, unit: Unit, tenant: Tenant, tenantUnit: TenantUnit}
     */
    protected function createPropertyWithTenant(array $attributes = []): array
    {
        $landlord = $attributes['landlord'] ?? Landlord::factory()->create();
        $property = Property::factory()->create([
            'landlord_id' => $landlord->id,
            ...($attributes['property'] ?? []),
        ]);

        $unitType = UnitType::factory()->create();
        $unit = Unit::factory()->create([
            'landlord_id' => $landlord->id,
            'property_id' => $property->id,
            'unit_type_id' => $unitType->id,
            ...($attributes['unit'] ?? []),
        ]);

        $tenant = Tenant::factory()->create([
            'landlord_id' => $landlord->id,
            ...($attributes['tenant'] ?? []),
        ]);

        $tenantUnit = TenantUnit::factory()->create([
            'tenant_id' => $tenant->id,
            'unit_id' => $unit->id,
            'landlord_id' => $landlord->id,
            'status' => 'active',
            'lease_start' => now()->subYear(),
            'lease_end' => now()->addMonths(6),
            ...($attributes['tenantUnit'] ?? []),
        ]);

        return [
            'landlord' => $landlord,
            'property' => $property,
            'unit' => $unit,
            'tenant' => $tenant,
            'tenantUnit' => $tenantUnit,
        ];
    }

    /**
     * Create a financial record for a tenant unit.
     */
    protected function createFinancialRecord(
        TenantUnit $tenantUnit,
        array $attributes = []
    ): FinancialRecord {
        return FinancialRecord::factory()->create([
            'landlord_id' => $tenantUnit->landlord_id,
            'tenant_unit_id' => $tenantUnit->id,
            ...$attributes,
        ]);
    }

    /**
     * Create a rent invoice for a tenant unit.
     */
    protected function createRentInvoice(
        TenantUnit $tenantUnit,
        array $attributes = []
    ): RentInvoice {
        return RentInvoice::factory()->create([
            'landlord_id' => $tenantUnit->landlord_id,
            'tenant_unit_id' => $tenantUnit->id,
            ...$attributes,
        ]);
    }

    /**
     * Create a maintenance request for a unit.
     */
    protected function createMaintenanceRequest(
        Unit $unit,
        array $attributes = []
    ): MaintenanceRequest {
        return MaintenanceRequest::factory()->create([
            'landlord_id' => $unit->landlord_id,
            'unit_id' => $unit->id,
            ...$attributes,
        ]);
    }

    /**
     * Create an asset for a unit.
     */
    protected function createAsset(
        Unit $unit,
        array $attributes = []
    ): Asset {
        $assetType = AssetType::factory()->create();
        
        return Asset::factory()->create([
            'landlord_id' => $unit->landlord_id,
            'unit_id' => $unit->id,
            'asset_type_id' => $assetType->id,
            ...$attributes,
        ]);
    }
}

