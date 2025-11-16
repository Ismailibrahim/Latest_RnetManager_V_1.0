<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRentInvoiceRequest;
use App\Http\Requests\UpdateRentInvoiceRequest;
use App\Http\Resources\RentInvoiceResource;
use App\Models\RentInvoice;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;
use Mpdf\Mpdf;

class RentInvoiceController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', RentInvoice::class);

        $perPage = $this->resolvePerPage($request);

        $query = RentInvoice::query()
            ->where('landlord_id', $request->user()->landlord_id)
            ->with('tenantUnit.tenant:id,full_name')
            ->latest('invoice_date');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('tenant_unit_id')) {
            $query->where('tenant_unit_id', $request->integer('tenant_unit_id'));
        }

        $invoices = $query
            ->paginate($perPage)
            ->withQueryString();

        return RentInvoiceResource::collection($invoices);
    }

    public function store(StoreRentInvoiceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['landlord_id'] = $request->user()->landlord_id;
        $data['status'] = $data['status'] ?? 'generated';

        $invoice = RentInvoice::create($data);
        $invoice->load('tenantUnit.tenant:id,full_name');

        return RentInvoiceResource::make($invoice)
            ->response()
            ->setStatusCode(201);
    }

    public function show(RentInvoice $rentInvoice)
    {
        $this->authorize('view', $rentInvoice);

        $rentInvoice->load('tenantUnit.tenant:id,full_name');

        return RentInvoiceResource::make($rentInvoice);
    }

    public function export(RentInvoice $rentInvoice)
    {
        $this->authorize('view', $rentInvoice);

        $rentInvoice->load([
            'tenantUnit.tenant',
            'tenantUnit.unit.property',
        ]);

        $filename = Str::slug($rentInvoice->invoice_number ?? 'rent-invoice') . '.pdf';

        $html = View::make('pdf.rent_invoice', [
            'invoice' => $rentInvoice,
            'tenantUnit' => $rentInvoice->tenantUnit,
            'tenant' => $rentInvoice->tenantUnit?->tenant,
            'unit' => $rentInvoice->tenantUnit?->unit,
            'property' => $rentInvoice->tenantUnit?->unit?->property,
        ])->render();

        $mpdf = new Mpdf([
            'format' => 'A4',
            'mode' => 'utf-8',
            'margin_top' => 15,
            'margin_bottom' => 15,
            'margin_left' => 15,
            'margin_right' => 15,
        ]);

        $mpdf->WriteHTML($html);
        $binary = $mpdf->Output('', 'S');

        return Response::make($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function update(UpdateRentInvoiceRequest $request, RentInvoice $rentInvoice)
    {
        $validated = $request->validated();

        if (! empty($validated)) {
            $rentInvoice->update($validated);
        }

        $rentInvoice->load('tenantUnit.tenant:id,full_name');

        return RentInvoiceResource::make($rentInvoice);
    }

    public function destroy(RentInvoice $rentInvoice)
    {
        $this->authorize('delete', $rentInvoice);

        $rentInvoice->delete();

        return response()->noContent();
    }
}
