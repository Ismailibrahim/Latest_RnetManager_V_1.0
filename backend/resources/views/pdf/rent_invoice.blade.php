<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $invoice->invoice_number ?? 'Rent Invoice' }}</title>
    <style>
        *, *::before, *::after {
            box-sizing: border-box;
        }

        body {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 12px;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
        }

        h1, h2, h3, h4, h5 {
            margin: 0;
            font-weight: 600;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }

        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            text-transform: uppercase;
        }

        .badge--generated { background-color: #eff6ff; color: #1d4ed8; }
        .badge--sent { background-color: #e0f2fe; color: #0369a1; }
        .badge--paid { background-color: #dcfce7; color: #047857; }
        .badge--overdue { background-color: #fee2e2; color: #b91c1c; }
        .badge--cancelled { background-color: #e2e8f0; color: #475569; }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
        }

        th, td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
        }

        th {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #64748b;
            background-color: #f8fafc;
        }

        .totals td {
            font-weight: 600;
        }

        .section {
            margin-top: 24px;
        }

        .meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 18px;
        }

        .meta-item span {
            display: block;
        }

        .meta-item span:first-child {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
        }

        footer {
            margin-top: 32px;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px dashed #e2e8f0;
            padding-top: 12px;
        }
    </style>
</head>
<body>
    <header class="header">
        <div>
            <h1 style="font-size:22px;">Rental Management Suite</h1>
            <p style="margin-top:6px;color:#64748b;font-size:12px;">
                RentApplicaiton · Maldives portfolio · Rent billing department
            </p>
        </div>
        <div style="text-align:right;">
            <span style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Invoice</span>
            <h2 style="margin-top:6px;font-size:20px;">{{ $invoice->invoice_number ?? 'Rent Invoice' }}</h2>
            @php
                $status = $invoice->status ?? 'generated';
                $statusClass = [
                    'generated' => 'badge--generated',
                    'sent' => 'badge--sent',
                    'paid' => 'badge--paid',
                    'overdue' => 'badge--overdue',
                    'cancelled' => 'badge--cancelled',
                ][$status] ?? 'badge--generated';
            @endphp
            <span class="badge {{ $statusClass }}">{{ strtoupper($status) }}</span>
        </div>
    </header>

    <section class="section meta-grid">
        <div>
            <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:6px;">
                Bill to
            </h3>
            <p style="font-size:14px;font-weight:600;margin:0;color:#0f172a;">
                {{ $tenant?->full_name ?? 'Tenant' }}
            </p>
            <p style="margin:4px 0 0;color:#64748b;font-size:12px;">
                Unit {{ $unit?->unit_number ?? $tenantUnit?->unit_id ?? 'N/A' }}
                @if($property?->name)
                    · {{ $property->name }}
                @endif
            </p>
        </div>
        <div class="meta-item">
            <span>Invoice date</span>
            <span>{{ optional($invoice->invoice_date)->format('d M Y') ?? '—' }}</span>
        </div>
        <div class="meta-item">
            <span>Due date</span>
            <span>{{ optional($invoice->due_date)->format('d M Y') ?? '—' }}</span>
        </div>
        <div class="meta-item">
            <span>Payment method</span>
            <span>{{ $invoice->payment_method ? strtoupper(str_replace('_', ' ', $invoice->payment_method)) : '—' }}</span>
        </div>
        @if($invoice->paid_date)
            <div class="meta-item">
                <span>Paid date</span>
                <span>{{ optional($invoice->paid_date)->format('d M Y') ?? '—' }}</span>
            </div>
        @endif
    </section>

    <section class="section">
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align:right;">Amount (MVR)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        Monthly rent
                        @if($invoice->invoice_date)
                            · {{ optional($invoice->invoice_date)->format('F Y') }}
                        @endif
                    </td>
                    <td style="text-align:right;">
                        {{ number_format((float) $invoice->rent_amount, 2) }}
                    </td>
                </tr>
                @if($invoice->late_fee && (float) $invoice->late_fee > 0)
                    <tr>
                        <td>Late fee</td>
                        <td style="text-align:right;">
                            {{ number_format((float) $invoice->late_fee, 2) }}
                        </td>
                    </tr>
                @endif
                <tr class="totals">
                    <td style="text-align:right;text-transform:uppercase;color:#475569;">Total due</td>
                    <td style="text-align:right;font-size:14px;">
                        {{ number_format((float) $invoice->rent_amount + (float) $invoice->late_fee, 2) }}
                    </td>
                </tr>
            </tbody>
        </table>
    </section>

    <section class="section" style="background:#f8fafc;padding:16px;border-radius:12px;margin-top:28px;">
        <h4 style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:6px;">
            Payment instructions
        </h4>
        <p style="margin:0;font-size:12px;color:#475569;">
            Please remit payment to the landlord treasury account and include the invoice number in your reference
            for automated reconciliation. Late payments may incur additional fees according to the lease agreement.
        </p>
        @if(($invoice->status ?? '') === 'overdue')
            <p style="margin-top:10px;font-weight:600;color:#b91c1c;">
                This invoice is overdue. Please settle the outstanding amount immediately to avoid further penalties.
            </p>
        @endif
    </section>

    <footer>
        Generated by RentApplicaiton on {{ now()->format('d M Y H:i') }} · {{ config('app.url') }}
    </footer>
</body>
</html>

