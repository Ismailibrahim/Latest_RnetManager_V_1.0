<?php

namespace Database\Seeders;

use App\Models\HelpContent;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class HelpContentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $helpContents = [
            [
                'page_route' => '/',
                'title' => 'Dashboard Overview',
                'content_json' => [
                    'quickGuide' => [
                        [
                            'step' => 1,
                            'title' => 'View Key Metrics',
                            'description' => 'The dashboard shows important metrics like active properties, tenants, rent collected, and upcoming renewals. Monitor your portfolio at a glance.',
                        ],
                        [
                            'step' => 2,
                            'title' => 'Navigate to Sections',
                            'description' => 'Use the sidebar menu to navigate to different sections like Properties, Tenants, Payments, and Reports.',
                        ],
                        [
                            'step' => 3,
                            'title' => 'Monitor Maintenance',
                            'description' => 'Check the Maintenance Queue section to see active maintenance requests that need attention.',
                        ],
                        [
                            'step' => 4,
                            'title' => 'Track Financial Summary',
                            'description' => 'Review your financial summary including total rent collected, pending payments, and upcoming invoices.',
                        ],
                    ],
                    'faqs' => [
                        [
                            'question' => 'How do I filter dashboard data?',
                            'answer' => 'Dashboard data is automatically filtered based on your role and permissions. Contact your administrator if you need access to additional data.',
                        ],
                        [
                            'question' => 'What do the different status indicators mean?',
                            'answer' => 'Green indicates good status, yellow indicates warnings (like invoices due), and red indicates critical issues (like outstanding rent).',
                        ],
                        [
                            'question' => 'How often does the dashboard update?',
                            'answer' => 'Dashboard metrics update automatically as data changes in the system. Refresh the page to see the latest information.',
                        ],
                    ],
                    'featureHighlights' => [
                        [
                            'title' => 'Real-time Updates',
                            'description' => 'Dashboard metrics update automatically as data changes in the system.',
                        ],
                        [
                            'title' => 'Role-based Views',
                            'description' => 'The dashboard adapts to show relevant information based on your role (Owner, Admin, Manager, Agent).',
                        ],
                        [
                            'title' => 'Quick Actions',
                            'description' => 'Access frequently used features directly from the dashboard for faster workflow.',
                        ],
                    ],
                    'relatedPages' => [
                        ['title' => 'Properties', 'route' => '/properties'],
                        ['title' => 'Tenants', 'route' => '/tenants'],
                        ['title' => 'Reports', 'route' => '/reports'],
                        ['title' => 'Snapshot', 'route' => '/snapshot'],
                    ],
                ],
            ],
            [
                'page_route' => '/tenants',
                'title' => 'Tenants Management',
                'content_json' => [
                    'quickGuide' => [
                        [
                            'step' => 1,
                            'title' => 'Add a New Tenant',
                            'description' => 'Click the "Add Tenant" button in the top right to create a new tenant record. Fill in all required information including name, email, phone, and contact details.',
                        ],
                        [
                            'step' => 2,
                            'title' => 'Search and Filter',
                            'description' => 'Use the search bar to find tenants by name, email, or phone. Use the status filter to view active, inactive, or former tenants.',
                        ],
                        [
                            'step' => 3,
                            'title' => 'View Tenant Details',
                            'description' => 'Click on any tenant row to view their full profile, lease history, payment records, and related documents.',
                        ],
                        [
                            'step' => 4,
                            'title' => 'Edit Tenant Information',
                            'description' => 'Click the edit icon on a tenant row to update their information, contact details, or status.',
                        ],
                    ],
                    'faqs' => [
                        [
                            'question' => 'How do I filter tenants by status?',
                            'answer' => 'Use the status dropdown at the top of the page to filter by Active, Inactive, or Former tenants.',
                        ],
                        [
                            'question' => 'Can I bulk edit multiple tenants?',
                            'answer' => 'Currently, tenant editing is done individually. Select multiple tenants to perform bulk actions if available.',
                        ],
                        [
                            'question' => 'How do I assign a tenant to a unit?',
                            'answer' => 'Go to the Tenant Assignments page from the sidebar menu to create a new tenant-unit assignment.',
                        ],
                        [
                            'question' => 'What information is required when adding a tenant?',
                            'answer' => 'Required fields typically include name, email, and phone number. Additional information like address and emergency contacts are recommended.',
                        ],
                    ],
                    'featureHighlights' => [
                        [
                            'title' => 'Quick Search',
                            'description' => 'Search across tenant names, emails, and phone numbers instantly.',
                        ],
                        [
                            'title' => 'Status Management',
                            'description' => 'Easily track tenant status (Active, Inactive, Former) and filter accordingly.',
                        ],
                        [
                            'title' => 'Comprehensive Profiles',
                            'description' => 'View complete tenant information including lease history, payment records, and documents.',
                        ],
                    ],
                    'relatedPages' => [
                        ['title' => 'Tenant Units', 'route' => '/tenant-units'],
                        ['title' => 'Rent Invoices', 'route' => '/rent-invoices'],
                        ['title' => 'Collect Payment', 'route' => '/payments/collect'],
                    ],
                ],
            ],
            [
                'page_route' => '/properties',
                'title' => 'Properties Management',
                'content_json' => [
                    'quickGuide' => [
                        [
                            'step' => 1,
                            'title' => 'Add a New Property',
                            'description' => 'Click "Add Property" to create a new property. Enter the property name, address, and other details like property type and owner.',
                        ],
                        [
                            'step' => 2,
                            'title' => 'View Property Details',
                            'description' => 'Click on any property to view its details, units, tenants, financial information, and maintenance history.',
                        ],
                        [
                            'step' => 3,
                            'title' => 'Manage Units',
                            'description' => 'From a property\'s detail page, you can add, edit, or view all units associated with that property.',
                        ],
                        [
                            'step' => 4,
                            'title' => 'Track Property Finances',
                            'description' => 'View rent collection, expenses, and financial summaries for each property.',
                        ],
                    ],
                    'faqs' => [
                        [
                            'question' => 'How do I add units to a property?',
                            'answer' => 'Navigate to the property detail page and use the Units section to add new units or manage existing ones.',
                        ],
                        [
                            'question' => 'Can I track multiple properties?',
                            'answer' => 'Yes, you can manage multiple properties from the Properties page. Each property maintains its own units and tenant records.',
                        ],
                        [
                            'question' => 'How do I assign an owner to a property?',
                            'answer' => 'When creating or editing a property, select the owner from the owner dropdown. Make sure the owner is created in the Owners section first.',
                        ],
                    ],
                    'featureHighlights' => [
                        [
                            'title' => 'Property Portfolio',
                            'description' => 'Manage your entire property portfolio from one central location.',
                        ],
                        [
                            'title' => 'Unit Management',
                            'description' => 'Each property can have multiple units, each with its own tenant assignments and lease details.',
                        ],
                        [
                            'title' => 'Financial Tracking',
                            'description' => 'Track income, expenses, and profitability for each property individually.',
                        ],
                    ],
                    'relatedPages' => [
                        ['title' => 'Units', 'route' => '/units'],
                        ['title' => 'Owners', 'route' => '/owners'],
                        ['title' => 'Reports', 'route' => '/reports'],
                    ],
                ],
            ],
            [
                'page_route' => '/units',
                'title' => 'Units Management',
                'content_json' => [
                    'quickGuide' => [
                        [
                            'step' => 1,
                            'title' => 'Add a New Unit',
                            'description' => 'Click "Add Unit" to create a new unit. Select the property, enter unit number, type, and rent amount.',
                        ],
                        [
                            'step' => 2,
                            'title' => 'View Unit Details',
                            'description' => 'Click on any unit to view its details, current tenant, lease information, and payment history.',
                        ],
                        [
                            'step' => 3,
                            'title' => 'Assign Tenants',
                            'description' => 'Use the Tenant Assignments page to link tenants to specific units and manage lease agreements.',
                        ],
                        [
                            'step' => 4,
                            'title' => 'Track Unit Status',
                            'description' => 'Monitor unit availability, occupancy status, and maintenance requirements.',
                        ],
                    ],
                    'faqs' => [
                        [
                            'question' => 'How do I mark a unit as available or occupied?',
                            'answer' => 'Unit status is automatically updated based on tenant assignments. A unit is occupied when it has an active tenant assignment.',
                        ],
                        [
                            'question' => 'Can I set different rent amounts for different units?',
                            'answer' => 'Yes, each unit can have its own rent amount. Set this when creating or editing the unit.',
                        ],
                        [
                            'question' => 'How do I view all units for a specific property?',
                            'answer' => 'Navigate to the Properties page, click on a property, and view its units section.',
                        ],
                    ],
                    'featureHighlights' => [
                        [
                            'title' => 'Unit Organization',
                            'description' => 'Organize units by property and track each unit\'s status and details.',
                        ],
                        [
                            'title' => 'Tenant Assignment',
                            'description' => 'Easily assign tenants to units and manage lease agreements.',
                        ],
                        [
                            'title' => 'Rent Management',
                            'description' => 'Set and track rent amounts for each unit individually.',
                        ],
                    ],
                    'relatedPages' => [
                        ['title' => 'Properties', 'route' => '/properties'],
                        ['title' => 'Tenant Units', 'route' => '/tenant-units'],
                        ['title' => 'Rent Invoices', 'route' => '/rent-invoices'],
                    ],
                ],
            ],
            [
                'page_route' => '/payments/collect',
                'title' => 'Collect Payment',
                'content_json' => [
                    'quickGuide' => [
                        [
                            'step' => 1,
                            'title' => 'Select Tenant',
                            'description' => 'Choose the tenant for whom you want to collect payment. You can search by name or select from the list.',
                        ],
                        [
                            'step' => 2,
                            'title' => 'Choose Payment Type',
                            'description' => 'Select the type of payment: Rent, Deposit, Maintenance, or Other. The system will show outstanding invoices if applicable.',
                        ],
                        [
                            'step' => 3,
                            'title' => 'Enter Payment Details',
                            'description' => 'Enter the payment amount, select payment method, and add any notes or reference numbers.',
                        ],
                        [
                            'step' => 4,
                            'title' => 'Record Payment',
                            'description' => 'Click "Record Payment" to save. The payment will be recorded and any related invoices will be updated automatically.',
                        ],
                    ],
                    'faqs' => [
                        [
                            'question' => 'What payment methods are available?',
                            'answer' => 'Available payment methods include Cash, Bank Transfer, Check, Credit Card, and others configured in Payment Methods settings.',
                        ],
                        [
                            'question' => 'Can I record partial payments?',
                            'answer' => 'Yes, you can record partial payments. The system will track the remaining balance on the invoice.',
                        ],
                        [
                            'question' => 'How do I apply a payment to a specific invoice?',
                            'answer' => 'When selecting a payment type, if there are outstanding invoices, you can select which invoice to apply the payment to.',
                        ],
                    ],
                    'featureHighlights' => [
                        [
                            'title' => 'Multiple Payment Methods',
                            'description' => 'Support for various payment methods including cash, bank transfer, and digital payments.',
                        ],
                        [
                            'title' => 'Invoice Integration',
                            'description' => 'Automatically link payments to outstanding invoices for accurate accounting.',
                        ],
                        [
                            'title' => 'Payment History',
                            'description' => 'All payments are recorded and can be viewed in the tenant\'s payment history.',
                        ],
                    ],
                    'relatedPages' => [
                        ['title' => 'Rent Invoices', 'route' => '/rent-invoices'],
                        ['title' => 'Unified Payments', 'route' => '/unified-payments'],
                        ['title' => 'Payment Methods', 'route' => '/payment-methods'],
                    ],
                ],
            ],
            [
                'page_route' => '/rent-invoices',
                'title' => 'Rent Invoices',
                'content_json' => [
                    'quickGuide' => [
                        [
                            'step' => 1,
                            'title' => 'View Invoices',
                            'description' => 'Browse all rent invoices. Use filters to view by status (Paid, Pending, Overdue), tenant, or date range.',
                        ],
                        [
                            'step' => 2,
                            'title' => 'Generate New Invoice',
                            'description' => 'Click "Create Invoice" to generate a new rent invoice for a tenant. Select the tenant, unit, amount, and due date.',
                        ],
                        [
                            'step' => 3,
                            'title' => 'View Invoice Details',
                            'description' => 'Click on any invoice to view full details including payment history, due dates, and related documents.',
                        ],
                        [
                            'step' => 4,
                            'title' => 'Mark as Paid',
                            'description' => 'When a payment is received, the invoice status will automatically update. You can also manually mark invoices as paid.',
                        ],
                    ],
                    'faqs' => [
                        [
                            'question' => 'How are rent invoices generated automatically?',
                            'answer' => 'Rent invoices can be generated automatically based on tenant-unit assignments and lease agreements. Check your settings for automatic invoice generation.',
                        ],
                        [
                            'question' => 'Can I edit an invoice after it\'s created?',
                            'answer' => 'Yes, you can edit invoices that are still pending. Once paid, invoices are typically locked to maintain accounting accuracy.',
                        ],
                        [
                            'question' => 'What happens when an invoice becomes overdue?',
                            'answer' => 'Overdue invoices are highlighted in red and can trigger notifications to tenants and property managers.',
                        ],
                    ],
                    'featureHighlights' => [
                        [
                            'title' => 'Automated Generation',
                            'description' => 'Generate rent invoices automatically based on lease agreements and tenant assignments.',
                        ],
                        [
                            'title' => 'Payment Tracking',
                            'description' => 'Track payment status and history for each invoice in real-time.',
                        ],
                        [
                            'title' => 'Invoice Management',
                            'description' => 'Create, edit, and manage rent invoices with full payment tracking.',
                        ],
                    ],
                    'relatedPages' => [
                        ['title' => 'Collect Payment', 'route' => '/payments/collect'],
                        ['title' => 'Tenants', 'route' => '/tenants'],
                        ['title' => 'Reports', 'route' => '/reports'],
                    ],
                ],
            ],
            [
                'page_route' => '/maintenance',
                'title' => 'Maintenance Expenses',
                'content_json' => [
                    'quickGuide' => [
                        [
                            'step' => 1,
                            'title' => 'Add Maintenance Expense',
                            'description' => 'Click "Add Expense" to record a new maintenance expense. Select the property, unit, vendor, and enter expense details.',
                        ],
                        [
                            'step' => 2,
                            'title' => 'Categorize Expenses',
                            'description' => 'Assign categories to expenses (plumbing, electrical, HVAC, etc.) for better tracking and reporting.',
                        ],
                        [
                            'step' => 3,
                            'title' => 'Attach Receipts',
                            'description' => 'Upload receipts or invoices related to the maintenance expense for record-keeping.',
                        ],
                        [
                            'step' => 4,
                            'title' => 'Track Expenses by Property',
                            'description' => 'View and filter maintenance expenses by property, unit, date range, or category.',
                        ],
                    ],
                    'faqs' => [
                        [
                            'question' => 'How do I link a maintenance expense to a maintenance request?',
                            'answer' => 'When creating an expense, you can link it to an existing maintenance request if one was created for that issue.',
                        ],
                        [
                            'question' => 'Can I track expenses by vendor?',
                            'answer' => 'Yes, select a vendor when creating the expense. You can then filter and report expenses by vendor.',
                        ],
                        [
                            'question' => 'How do I view maintenance expense reports?',
                            'answer' => 'Navigate to the Reports section to view detailed maintenance expense reports by property, time period, or category.',
                        ],
                    ],
                    'featureHighlights' => [
                        [
                            'title' => 'Expense Tracking',
                            'description' => 'Track all maintenance expenses with detailed categorization and vendor information.',
                        ],
                        [
                            'title' => 'Receipt Management',
                            'description' => 'Attach and store receipts for all maintenance expenses for accounting purposes.',
                        ],
                        [
                            'title' => 'Property-level Reporting',
                            'description' => 'View maintenance expenses by property to understand maintenance costs and trends.',
                        ],
                    ],
                    'relatedPages' => [
                        ['title' => 'Maintenance Invoices', 'route' => '/maintenance-invoices'],
                        ['title' => 'Vendors', 'route' => '/vendors'],
                        ['title' => 'Reports', 'route' => '/reports'],
                    ],
                ],
            ],
            [
                'page_route' => '/reports',
                'title' => 'Reports & Analytics',
                'content_json' => [
                    'quickGuide' => [
                        [
                            'step' => 1,
                            'title' => 'Select Report Type',
                            'description' => 'Choose from available report types: Financial Reports, Tenant Reports, Property Reports, or Maintenance Reports.',
                        ],
                        [
                            'step' => 2,
                            'title' => 'Set Date Range',
                            'description' => 'Select the date range for the report. You can choose predefined ranges (This Month, Last Month) or custom dates.',
                        ],
                        [
                            'step' => 3,
                            'title' => 'Apply Filters',
                            'description' => 'Filter reports by property, tenant, status, or other relevant criteria depending on the report type.',
                        ],
                        [
                            'step' => 4,
                            'title' => 'Export Report',
                            'description' => 'Generate and export reports in PDF or Excel format for sharing or record-keeping.',
                        ],
                    ],
                    'faqs' => [
                        [
                            'question' => 'What types of reports are available?',
                            'answer' => 'Available reports include Financial Summary, Rent Collection, Tenant Ledger, Property Performance, Maintenance Expenses, and more.',
                        ],
                        [
                            'question' => 'Can I schedule automatic report generation?',
                            'answer' => 'Some reports can be scheduled for automatic generation. Check report settings for scheduling options.',
                        ],
                        [
                            'question' => 'How do I export reports?',
                            'answer' => 'After generating a report, use the Export button to download it as PDF or Excel file.',
                        ],
                    ],
                    'featureHighlights' => [
                        [
                            'title' => 'Comprehensive Analytics',
                            'description' => 'Access detailed reports on finances, tenants, properties, and maintenance.',
                        ],
                        [
                            'title' => 'Customizable Filters',
                            'description' => 'Filter reports by date range, property, tenant, and other criteria for targeted insights.',
                        ],
                        [
                            'title' => 'Export Options',
                            'description' => 'Export reports in multiple formats for sharing and record-keeping.',
                        ],
                    ],
                    'relatedPages' => [
                        ['title' => 'Dashboard', 'route' => '/'],
                        ['title' => 'Snapshot', 'route' => '/snapshot'],
                        ['title' => 'Finances', 'route' => '/finances'],
                    ],
                ],
            ],
            [
                'page_route' => '/settings',
                'title' => 'Settings',
                'content_json' => [
                    'quickGuide' => [
                        [
                            'step' => 1,
                            'title' => 'Account Settings',
                            'description' => 'Update your profile information, change password, and manage account preferences.',
                        ],
                        [
                            'step' => 2,
                            'title' => 'System Settings',
                            'description' => 'Configure system-wide settings including currency, date formats, notification preferences, and email settings.',
                        ],
                        [
                            'step' => 3,
                            'title' => 'Billing & Subscription',
                            'description' => 'View your subscription plan, billing history, and manage payment methods.',
                        ],
                        [
                            'step' => 4,
                            'title' => 'Document Templates',
                            'description' => 'Manage document templates for leases, invoices, and other documents.',
                        ],
                    ],
                    'faqs' => [
                        [
                            'question' => 'How do I change my password?',
                            'answer' => 'Go to Account Settings and use the Change Password option. You\'ll need to enter your current password and new password.',
                        ],
                        [
                            'question' => 'Can I customize email notifications?',
                            'answer' => 'Yes, navigate to Notification Settings to customize which email notifications you receive.',
                        ],
                        [
                            'question' => 'How do I update my subscription plan?',
                            'answer' => 'Go to Billing & Subscription section to view available plans and upgrade or downgrade your subscription.',
                        ],
                    ],
                    'featureHighlights' => [
                        [
                            'title' => 'Centralized Configuration',
                            'description' => 'Manage all system settings from one central location.',
                        ],
                        [
                            'title' => 'Customizable Preferences',
                            'description' => 'Customize notifications, display preferences, and system behavior to match your workflow.',
                        ],
                        [
                            'title' => 'Security Settings',
                            'description' => 'Manage account security, password, and access controls.',
                        ],
                    ],
                    'relatedPages' => [
                        ['title' => 'Dashboard', 'route' => '/'],
                        ['title' => 'Notifications', 'route' => '/notifications'],
                    ],
                ],
            ],
        ];

        foreach ($helpContents as $content) {
            HelpContent::updateOrCreate(
                ['page_route' => $content['page_route']],
                [
                    'title' => $content['title'],
                    'content_json' => $content['content_json'],
                ]
            );
        }

        $this->command->info('Help content seeded successfully!');
    }
}
