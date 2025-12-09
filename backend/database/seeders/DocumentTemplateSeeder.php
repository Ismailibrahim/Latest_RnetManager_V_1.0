<?php

namespace Database\Seeders;

use App\Models\DocumentTemplate;
use Illuminate\Database\Seeder;

class DocumentTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $templates = [
            [
                'type' => 'rent_invoice',
                'name' => 'Default Rent Invoice Template',
                'template_html' => $this->getRentInvoiceTemplate(),
                'is_default' => true,
            ],
            [
                'type' => 'maintenance_invoice',
                'name' => 'Default Maintenance Invoice Template',
                'template_html' => $this->getMaintenanceInvoiceTemplate(),
                'is_default' => true,
            ],
            [
                'type' => 'security_deposit_slip',
                'name' => 'Default Security Deposit Slip Template',
                'template_html' => $this->getSecurityDepositSlipTemplate(),
                'is_default' => true,
            ],
            [
                'type' => 'advance_rent_receipt',
                'name' => 'Default Advance Rent Receipt Template',
                'template_html' => $this->getAdvanceRentReceiptTemplate(),
                'is_default' => true,
            ],
            [
                'type' => 'fee_collection_receipt',
                'name' => 'Default Fee Collection Receipt Template',
                'template_html' => $this->getFeeCollectionReceiptTemplate(),
                'is_default' => true,
            ],
            [
                'type' => 'security_deposit_refund',
                'name' => 'Default Security Deposit Refund Template',
                'template_html' => $this->getSecurityDepositRefundTemplate(),
                'is_default' => true,
            ],
            [
                'type' => 'other_income_receipt',
                'name' => 'Default Other Income Receipt Template',
                'template_html' => $this->getOtherIncomeReceiptTemplate(),
                'is_default' => true,
            ],
            [
                'type' => 'payment_voucher',
                'name' => 'Default Payment Voucher Template',
                'template_html' => $this->getPaymentVoucherTemplate(),
                'is_default' => true,
            ],
            [
                'type' => 'unified_payment_entry',
                'name' => 'Default Unified Payment Entry Template',
                'template_html' => $this->getUnifiedPaymentEntryTemplate(),
                'is_default' => true,
            ],
        ];

        foreach ($templates as $template) {
            DocumentTemplate::updateOrCreate(
                [
                    'landlord_id' => null,
                    'type' => $template['type'],
                    'is_default' => true,
                ],
                $template
            );
        }
    }

    private function getRentInvoiceTemplate(): string
    {
        return '<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{document.number}}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 12px;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
        }
        h1, h2, h3 { margin: 0; font-weight: 600; }
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
        .badge--paid { background-color: #dcfce7; color: #047857; }
        .badge--overdue { background-color: #fee2e2; color: #b91c1c; }
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
        .totals td { font-weight: 600; }
        .section { margin-top: 24px; }
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 18px;
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
            <h1 style="font-size:22px;">{{company.name}}</h1>
            <p style="margin-top:6px;color:#64748b;font-size:12px;">
                {{company.address}}<br>
                {{company.phone}} {{company.email}}
            </p>
        </div>
        <div style="text-align:right;">
            <span style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Invoice</span>
            <h2 style="margin-top:6px;font-size:20px;">{{document.number}}</h2>
            <span class="badge badge--{{document.status}}">{{document.status}}</span>
        </div>
    </header>

    <section class="section meta-grid">
        <div>
            <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin-bottom:6px;">Bill to</h3>
            <p style="font-size:14px;font-weight:600;margin:0;color:#0f172a;">{{customer.name}}</p>
            <p style="margin:4px 0 0;color:#64748b;font-size:12px;">
                Unit {{unit.number}} {{property.name}}
            </p>
        </div>
        <div>
            <span style="font-size:11px;text-transform:uppercase;color:#64748b;">Invoice date</span>
            <span style="display:block;margin-top:4px;">{{document.date}}</span>
        </div>
        <div>
            <span style="font-size:11px;text-transform:uppercase;color:#64748b;">Due date</span>
            <span style="display:block;margin-top:4px;">{{document.due_date}}</span>
        </div>
    </section>

    <section class="section">
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align:right;">Amount ({{amount.currency}})</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Monthly rent</td>
                    <td style="text-align:right;">{{amount.rent}}</td>
                </tr>
                <tr>
                    <td>Late fee</td>
                    <td style="text-align:right;">{{amount.late_fee}}</td>
                </tr>
                <tr class="totals">
                    <td style="text-align:right;text-transform:uppercase;color:#475569;">Total</td>
                    <td style="text-align:right;">{{amount.total}}</td>
                </tr>
                <tr class="totals">
                    <td style="text-align:right;text-transform:uppercase;color:#475569;">Amount due</td>
                    <td style="text-align:right;font-size:14px;">{{amount.amount_due}}</td>
                </tr>
            </tbody>
        </table>
    </section>

    <footer>
        Generated by RentApplicaiton on ' . date('d M Y H:i') . '
    </footer>
</body>
</html>';
    }

    private function getMaintenanceInvoiceTemplate(): string
    {
        return '<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{document.number}}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 12px;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
        }
        h1, h2, h3 { margin: 0; font-weight: 600; }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }
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
        .totals td { font-weight: 600; }
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
            <h1 style="font-size:22px;">{{company.name}}</h1>
            <p style="margin-top:6px;color:#64748b;font-size:12px;">
                {{company.address}}<br>
                {{company.phone}}
            </p>
        </div>
        <div style="text-align:right;">
            <span style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Maintenance Invoice</span>
            <h2 style="margin-top:6px;font-size:20px;">{{document.number}}</h2>
        </div>
    </header>

    <section style="margin-bottom:24px;">
        <h3 style="font-size:13px;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Bill to</h3>
        <p style="font-size:14px;font-weight:600;margin:0;">{{customer.name}}</p>
        <p style="margin:4px 0 0;color:#64748b;font-size:12px;">
            Unit {{unit.number}} · {{property.name}}
        </p>
    </section>

    <section>
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align:right;">Amount ({{amount.currency}})</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Labor cost</td>
                    <td style="text-align:right;">{{amount.labor_cost}}</td>
                </tr>
                <tr>
                    <td>Parts cost</td>
                    <td style="text-align:right;">{{amount.parts_cost}}</td>
                </tr>
                <tr>
                    <td>Tax</td>
                    <td style="text-align:right;">{{amount.tax}}</td>
                </tr>
                <tr>
                    <td>Discount</td>
                    <td style="text-align:right;">-{{amount.discount}}</td>
                </tr>
                <tr class="totals">
                    <td style="text-align:right;text-transform:uppercase;color:#475569;">Total</td>
                    <td style="text-align:right;font-size:14px;">{{amount.total}}</td>
                </tr>
            </tbody>
        </table>
    </section>

    <footer>
        Generated by RentApplicaiton on ' . date('d M Y H:i') . '
    </footer>
</body>
</html>';
    }

    private function getSecurityDepositSlipTemplate(): string
    {
        return '<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Security Deposit Receipt</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 12px;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
        }
        h1, h2 { margin: 0; font-weight: 600; }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .receipt-body {
            max-width: 500px;
            margin: 0 auto;
        }
        .receipt-line {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .receipt-line.total {
            font-weight: 600;
            font-size: 14px;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="receipt-body">
        <header class="header">
            <h1>{{company.name}}</h1>
            <p>{{company.address}}</p>
            <p>{{company.phone}}</p>
            <h2 style="margin-top:24px;">SECURITY DEPOSIT RECEIPT</h2>
        </header>

        <div class="receipt-line">
            <span>Receipt #:</span>
            <span>{{document.number}}</span>
        </div>
        <div class="receipt-line">
            <span>Date:</span>
            <span>{{document.date}}</span>
        </div>
        <div class="receipt-line">
            <span>Customer:</span>
            <span>{{customer.name}}</span>
        </div>
        <div class="receipt-line">
            <span>Unit:</span>
            <span>{{unit.number}}</span>
        </div>
        <div class="receipt-line">
            <span>Property:</span>
            <span>{{property.name}}</span>
        </div>
        <div class="receipt-line">
            <span>Payment Method:</span>
            <span>{{document.payment_method}}</span>
        </div>
        <div class="receipt-line total">
            <span>Amount Received:</span>
            <span>{{amount.currency}} {{amount.total}}</span>
        </div>
    </div>
</body>
</html>';
    }

    private function getAdvanceRentReceiptTemplate(): string
    {
        return '<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Advance Rent Receipt</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 12px;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
        }
        h1, h2 { margin: 0; font-weight: 600; }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .receipt-body {
            max-width: 500px;
            margin: 0 auto;
        }
        .receipt-line {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .receipt-line.total {
            font-weight: 600;
            font-size: 14px;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="receipt-body">
        <header class="header">
            <h1>{{company.name}}</h1>
            <p>{{company.address}}</p>
            <p>{{company.phone}}</p>
            <h2 style="margin-top:24px;">ADVANCE RENT RECEIPT</h2>
        </header>

        <div class="receipt-line">
            <span>Receipt #:</span>
            <span>{{document.number}}</span>
        </div>
        <div class="receipt-line">
            <span>Date:</span>
            <span>{{document.date}}</span>
        </div>
        <div class="receipt-line">
            <span>Customer:</span>
            <span>{{customer.name}}</span>
        </div>
        <div class="receipt-line">
            <span>Unit:</span>
            <span>{{unit.number}}</span>
        </div>
        <div class="receipt-line">
            <span>Months:</span>
            <span>{{advance_rent.months}}</span>
        </div>
        <div class="receipt-line">
            <span>Payment Method:</span>
            <span>{{document.payment_method}}</span>
        </div>
        <div class="receipt-line total">
            <span>Amount Received:</span>
            <span>{{amount.currency}} {{amount.total}}</span>
        </div>
    </div>
</body>
</html>';
    }

    private function getFeeCollectionReceiptTemplate(): string
    {
        return '<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Fee Collection Receipt</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 12px;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
        }
        h1, h2 { margin: 0; font-weight: 600; }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .receipt-body {
            max-width: 500px;
            margin: 0 auto;
        }
        .receipt-line {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .receipt-line.total {
            font-weight: 600;
            font-size: 14px;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="receipt-body">
        <header class="header">
            <h1>{{company.name}}</h1>
            <p>{{company.address}}</p>
            <p>{{company.phone}}</p>
            <h2 style="margin-top:24px;">FEE COLLECTION RECEIPT</h2>
        </header>

        <div class="receipt-line">
            <span>Receipt #:</span>
            <span>{{document.number}}</span>
        </div>
        <div class="receipt-line">
            <span>Date:</span>
            <span>{{document.date}}</span>
        </div>
        <div class="receipt-line">
            <span>Customer:</span>
            <span>{{customer.name}}</span>
        </div>
        <div class="receipt-line">
            <span>Description:</span>
            <span>{{payment.description}}</span>
        </div>
        <div class="receipt-line">
            <span>Payment Method:</span>
            <span>{{document.payment_method}}</span>
        </div>
        <div class="receipt-line total">
            <span>Amount Received:</span>
            <span>{{amount.currency}} {{amount.total}}</span>
        </div>
    </div>
</body>
</html>';
    }

    private function getSecurityDepositRefundTemplate(): string
    {
        return '<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Security Deposit Refund</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 12px;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
        }
        h1, h2 { margin: 0; font-weight: 600; }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .receipt-body {
            max-width: 500px;
            margin: 0 auto;
        }
        .receipt-line {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .receipt-line.total {
            font-weight: 600;
            font-size: 14px;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="receipt-body">
        <header class="header">
            <h1>{{company.name}}</h1>
            <p>{{company.address}}</p>
            <p>{{company.phone}}</p>
            <h2 style="margin-top:24px;">SECURITY DEPOSIT REFUND</h2>
        </header>

        <div class="receipt-line">
            <span>Refund #:</span>
            <span>{{document.number}}</span>
        </div>
        <div class="receipt-line">
            <span>Date:</span>
            <span>{{document.date}}</span>
        </div>
        <div class="receipt-line">
            <span>Customer:</span>
            <span>{{customer.name}}</span>
        </div>
        <div class="receipt-line">
            <span>Original Deposit:</span>
            <span>{{amount.currency}} {{amount.original_deposit}}</span>
        </div>
        <div class="receipt-line">
            <span>Deductions:</span>
            <span>{{amount.currency}} {{amount.deductions}}</span>
        </div>
        <div class="receipt-line">
            <span>Payment Method:</span>
            <span>{{document.payment_method}}</span>
        </div>
        <div class="receipt-line total">
            <span>Refund Amount:</span>
            <span>{{amount.currency}} {{amount.total}}</span>
        </div>
    </div>
</body>
</html>';
    }

    private function getOtherIncomeReceiptTemplate(): string
    {
        return '<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Other Income Receipt</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 12px;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
        }
        h1, h2 { margin: 0; font-weight: 600; }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .receipt-body {
            max-width: 500px;
            margin: 0 auto;
        }
        .receipt-line {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .receipt-line.total {
            font-weight: 600;
            font-size: 14px;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="receipt-body">
        <header class="header">
            <h1>{{company.name}}</h1>
            <p>{{company.address}}</p>
            <p>{{company.phone}}</p>
            <h2 style="margin-top:24px;">OTHER INCOME RECEIPT</h2>
        </header>

        <div class="receipt-line">
            <span>Receipt #:</span>
            <span>{{document.number}}</span>
        </div>
        <div class="receipt-line">
            <span>Date:</span>
            <span>{{document.date}}</span>
        </div>
        <div class="receipt-line">
            <span>Customer:</span>
            <span>{{customer.name}}</span>
        </div>
        <div class="receipt-line">
            <span>Description:</span>
            <span>{{payment.description}}</span>
        </div>
        <div class="receipt-line">
            <span>Payment Method:</span>
            <span>{{document.payment_method}}</span>
        </div>
        <div class="receipt-line total">
            <span>Amount Received:</span>
            <span>{{amount.currency}} {{amount.total}}</span>
        </div>
    </div>
</body>
</html>';
    }

    private function getPaymentVoucherTemplate(): string
    {
        return '<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Payment Voucher</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 12px;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
        }
        h1, h2 { margin: 0; font-weight: 600; }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .receipt-body {
            max-width: 500px;
            margin: 0 auto;
        }
        .receipt-line {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .receipt-line.total {
            font-weight: 600;
            font-size: 14px;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="receipt-body">
        <header class="header">
            <h1>{{company.name}}</h1>
            <p>{{company.address}}</p>
            <p>{{company.phone}}</p>
            <h2 style="margin-top:24px;">PAYMENT VOUCHER</h2>
        </header>

        <div class="receipt-line">
            <span>Voucher #:</span>
            <span>{{document.number}}</span>
        </div>
        <div class="receipt-line">
            <span>Date:</span>
            <span>{{document.date}}</span>
        </div>
        <div class="receipt-line">
            <span>Payee:</span>
            <span>{{customer.name}}</span>
        </div>
        <div class="receipt-line">
            <span>Type:</span>
            <span>{{payment.type}}</span>
        </div>
        <div class="receipt-line">
            <span>Description:</span>
            <span>{{payment.description}}</span>
        </div>
        <div class="receipt-line">
            <span>Payment Method:</span>
            <span>{{document.payment_method}}</span>
        </div>
        <div class="receipt-line total">
            <span>Amount Paid:</span>
            <span>{{amount.currency}} {{amount.total}}</span>
        </div>
    </div>
</body>
</html>';
    }

    private function getUnifiedPaymentEntryTemplate(): string
    {
        return '<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{document.type}}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 12px;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            line-height: 1.5;
        }
        h1, h2 { margin: 0; font-weight: 600; }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .receipt-body {
            max-width: 500px;
            margin: 0 auto;
        }
        .receipt-line {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .receipt-line.total {
            font-weight: 600;
            font-size: 14px;
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="receipt-body">
        <header class="header">
            <h1>{{company.name}}</h1>
            <p>{{company.address}}</p>
            <p>{{company.phone}}</p>
            <h2 style="margin-top:24px;">{{document.type}}</h2>
        </header>

        <div class="receipt-line">
            <span>Number:</span>
            <span>{{document.number}}</span>
        </div>
        <div class="receipt-line">
            <span>Date:</span>
            <span>{{document.date}}</span>
        </div>
        <div class="receipt-line">
            <span>{{payment.flow_direction}} === "income" ? "Customer" : "Payee"}}:</span>
            <span>{{customer.name}}</span>
        </div>
        <div class="receipt-line">
            <span>Type:</span>
            <span>{{payment.type}}</span>
        </div>
        <div class="receipt-line">
            <span>Description:</span>
            <span>{{payment.description}}</span>
        </div>
        <div class="receipt-line">
            <span>Payment Method:</span>
            <span>{{document.payment_method}}</span>
        </div>
        <div class="receipt-line total">
            <span>Amount:</span>
            <span>{{amount.currency}} {{amount.total}}</span>
        </div>
    </div>
</body>
</html>';
    }
}
