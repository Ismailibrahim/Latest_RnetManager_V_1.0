# Testing Checklist for RentApplication

This document provides a comprehensive manual testing checklist for all pages and CRUD operations in the RentApplication system.

## Testing Prerequisites

1. Run database seeders: `php artisan db:seed`
2. Clear cache: `php artisan cache:clear`
3. Start backend server: `php artisan serve`
4. Start frontend dev server: `npm run dev`
5. Login with test credentials (owner@rentapp.test / Password123!)

## Core Property Management Pages

### Properties Page (`/properties`)

#### List View
- [ ] View all properties displays correctly
- [ ] Pagination works (if more than default page size)
- [ ] Search functionality filters properties by name/address
- [ ] Filter by property type (residential/commercial) works
- [ ] Empty state displays when no properties exist
- [ ] Loading state displays while fetching data
- [ ] Responsive design works on mobile/tablet

#### Create Property
- [ ] "New Property" button/link navigates to create form
- [ ] Form displays all required fields (name, address, type)
- [ ] Validation works for required fields (shows error if empty)
- [ ] Validation works for property type (must be residential/commercial)
- [ ] Submit creates property and redirects to list/detail
- [ ] Success message displays after creation
- [ ] Cancel button returns to list without saving

#### Read Property
- [ ] Clicking property from list navigates to detail page
- [ ] All property fields display correctly (name, address, type)
- [ ] Associated units list displays (if any)
- [ ] Edit button/link is visible
- [ ] Delete button/link is visible (owner/admin only)

#### Update Property
- [ ] Edit button navigates to edit form
- [ ] Form pre-fills with existing data
- [ ] Can update name, address, and type
- [ ] Validation works (required fields, valid types)
- [ ] Submit saves changes and redirects
- [ ] Success message displays after update
- [ ] Changes persist after page refresh

#### Delete Property
- [ ] Delete button shows confirmation dialog
- [ ] Confirmation cancels deletion
- [ ] Confirmation proceeds with deletion
- [ ] Property removed from list after deletion
- [ ] Associated units cascade (verify behavior)
- [ ] Error handling if deletion fails (e.g., has units)

### Units Page (`/units`)

#### List View
- [ ] View all units displays correctly
- [ ] Pagination works
- [ ] Search by unit number works
- [ ] Filter by property works
- [ ] Filter by occupancy status works
- [ ] Sort by columns works (unit number, rent, etc.)
- [ ] Responsive design (cards on mobile, table on desktop)

#### Create Unit
- [ ] Form displays all fields (unit number, property, type, rent, deposit)
- [ ] Property dropdown populates correctly
- [ ] Unit type dropdown populates correctly
- [ ] Validation for required fields
- [ ] Validation for numeric fields (rent, deposit)
- [ ] Validation for unique unit number per property
- [ ] Submit creates unit successfully
- [ ] Success message and redirect

#### Read Unit
- [ ] Unit detail page displays all information
- [ ] Associated property link works
- [ ] Current tenant assignment displays (if any)
- [ ] Assets list displays (if any)
- [ ] Maintenance history displays (if any)

#### Update Unit
- [ ] Edit form pre-fills correctly
- [ ] Can update rent amount
- [ ] Can update security deposit
- [ ] Can change occupancy status
- [ ] Can update unit type
- [ ] Changes persist correctly

#### Delete Unit
- [ ] Delete confirmation works
- [ ] Unit removed after deletion
- [ ] Error if unit has active tenant assignment

#### Bulk Import
- [ ] "Import" button/link navigates to import page
- [ ] Template download works
- [ ] CSV upload validates file type
- [ ] CSV validation shows errors for invalid data
- [ ] Successful import shows summary (X units created)
- [ ] Imported units appear in list

### Tenants Page (`/tenants`)

#### List View
- [ ] All tenants display in list
- [ ] Search by name works
- [ ] Search by email works
- [ ] Search by mobile works
- [ ] Filter by status (active/inactive) works
- [ ] Pagination works

#### Create Tenant
- [ ] Form has all required fields (name, email, mobile, nationality)
- [ ] Nationality dropdown populates
- [ ] Email validation works
- [ ] Mobile validation works
- [ ] Document upload works (if applicable)
- [ ] Submit creates tenant successfully

#### Read Tenant
- [ ] Tenant profile displays all information
- [ ] Tenant units list displays
- [ ] Payment history displays
- [ ] Documents list displays
- [ ] Edit and delete buttons visible

#### Update Tenant
- [ ] Edit form pre-fills correctly
- [ ] Can update all fields
- [ ] Status change (active/inactive) works
- [ ] Changes persist

#### Delete Tenant
- [ ] Delete confirmation works
- [ ] Error if tenant has active assignments
- [ ] Tenant removed after deletion

#### Bulk Import
- [ ] Import template downloads correctly
- [ ] CSV import validates and creates tenants
- [ ] Error messages for invalid rows

#### Documents
- [ ] Upload document works
- [ ] Document list displays
- [ ] Download document works
- [ ] Delete document works

### Tenant Units Page (`/tenant-units`)

#### List View
- [ ] All assignments display
- [ ] Filter by status works
- [ ] Filter by unit works
- [ ] Filter by tenant works
- [ ] Search functionality works

#### Create Assignment
- [ ] Form has tenant and unit selectors
- [ ] Lease start/end date pickers work
- [ ] Monthly rent field pre-fills from unit
- [ ] Can override rent amount
- [ ] Submit creates assignment successfully
- [ ] Unit occupancy status updates automatically

#### Read Assignment
- [ ] Assignment details display correctly
- [ ] Lease dates display
- [ ] Rent amount displays
- [ ] Payment history displays
- [ ] Pending charges display

#### Update Assignment
- [ ] Can modify lease dates
- [ ] Can update rent amount
- [ ] Can change status
- [ ] Changes persist

#### End Lease
- [ ] "End Lease" button works
- [ ] Confirmation dialog appears
- [ ] Lease end date sets correctly
- [ ] Status changes to "ended"
- [ ] Unit becomes available

#### Advance Rent
- [ ] "Collect Advance Rent" button works
- [ ] Form accepts amount and date
- [ ] Submit creates advance rent record
- [ ] Advance rent applies to future invoices

#### Pending Charges
- [ ] "View Pending Charges" link works
- [ ] Pending charges calculate correctly
- [ ] Breakdown shows all line items

## Financial Management Pages

### Rent Invoices Page (`/rent-invoices`)

#### List View
- [ ] All invoices display
- [ ] Filter by status (generated, paid, overdue) works
- [ ] Filter by date range works
- [ ] Filter by tenant works
- [ ] Search by invoice number works
- [ ] Status badges display correctly

#### Create Invoice
- [ ] "Generate Invoice" button works
- [ ] Form has tenant unit selector
- [ ] Invoice date and due date pickers work
- [ ] Rent amount pre-fills
- [ ] Can add late fee
- [ ] Submit generates invoice
- [ ] Invoice number format is correct

#### Bulk Generate
- [ ] "Bulk Generate" button works
- [ ] Can select multiple tenant units
- [ ] Date range selection works
- [ ] Submit generates invoices for all selected
- [ ] Summary shows count of generated invoices

#### Read Invoice
- [ ] Invoice detail displays all information
- [ ] Amounts calculate correctly
- [ ] Payment information displays (if paid)
- [ ] Export/Download button works

#### Update Invoice
- [ ] Can mark as paid
- [ ] Payment method selection works
- [ ] Payment date picker works
- [ ] Can add/update late fee
- [ ] Status updates correctly

#### Export Invoice
- [ ] Export button generates PDF/download
- [ ] PDF contains all invoice details
- [ ] Format is correct

#### Status Transitions
- [ ] Generated → Paid transition works
- [ ] Paid → Voided transition works (if allowed)
- [ ] Status badges update correctly

### Unified Payments Page (`/unified-payments`)

#### List View
- [ ] All payment types display (rent, maintenance, refunds)
- [ ] Unified view shows all transactions
- [ ] Payment type badges display correctly
- [ ] Flow direction (income/outgoing) displays

#### Filters
- [ ] Filter by payment_type works
- [ ] Filter by flow_direction works
- [ ] Filter by status works
- [ ] Filter by date range works
- [ ] Filter by tenant_unit works
- [ ] Multiple filters combine correctly

#### Search
- [ ] Search by tenant name works
- [ ] Search by unit number works
- [ ] Search by reference number works

#### Pagination
- [ ] Pagination controls work
- [ ] Page size selection works
- [ ] Large datasets paginate correctly

#### Sorting
- [ ] Sort by date works
- [ ] Sort by amount works
- [ ] Sort by tenant name works
- [ ] Sort order toggles correctly

### Collect Payment Page (`/payments/collect`)

#### Payment Type Selection
- [ ] All payment types display (rent, maintenance, refund, fee, etc.)
- [ ] Income vs Outgoing categories clear
- [ ] Selection navigates to form

#### Form Validation
- [ ] Required fields validate per payment type
- [ ] Tenant/Unit selection required for rent payments
- [ ] Amount field validates (positive number)
- [ ] Date fields validate (not in past for future payments)

#### Tenant/Unit Selection
- [ ] Search-as-you-type works
- [ ] Dropdown populates with results
- [ ] Selection updates form

#### Review & Submit
- [ ] Summary panel shows all entered data
- [ ] Amount displays correctly
- [ ] Payment type displays correctly
- [ ] Submit button creates payment
- [ ] Loading state displays during submission

#### Success Flow
- [ ] Success message displays
- [ ] Redirect to unified payments page works
- [ ] New payment appears in list

#### Error Handling
- [ ] Validation errors display inline
- [ ] Network errors show error message
- [ ] Retry option works

### Security Deposit Refunds Page (`/security-deposit-refunds`)

#### List View
- [ ] All refunds display
- [ ] Filter by status works
- [ ] Filter by date works
- [ ] Search works

#### Create Refund
- [ ] Form has tenant unit selector
- [ ] Original deposit pre-fills from unit
- [ ] Can add deductions
- [ ] Deduction reasons can be added
- [ ] Refund amount calculates correctly
- [ ] Refund number auto-generates
- [ ] Submit creates refund

#### Read Refund
- [ ] All refund details display
- [ ] Calculations show correctly
- [ ] Receipt information displays (if generated)

#### Update Refund
- [ ] Can update status
- [ ] Can update amounts
- [ ] Can mark receipt as generated
- [ ] Receipt number auto-generates when marked

#### Delete Refund
- [ ] Delete button visible (owner only)
- [ ] Confirmation works
- [ ] Refund removed after deletion

### Finances Page (`/finances`)

#### Dashboard
- [ ] Summary cards display correctly
- [ ] Total income displays
- [ ] Total expenses display
- [ ] Net cash flow displays
- [ ] Outstanding amounts display

#### Cash Flow
- [ ] Chart/graph displays
- [ ] Date range filter works
- [ ] Data updates based on filters

#### Collection Pipeline
- [ ] Rent collection data displays
- [ ] Invoice count displays
- [ ] Status breakdown displays

#### Date Filters
- [ ] Date range picker works
- [ ] Filter updates all widgets
- [ ] Default range is reasonable (e.g., current month)

## Maintenance Management Pages

### Maintenance Requests Page (`/maintenance`)

#### List View
- [ ] All requests display
- [ ] Filter by unit works
- [ ] Filter by status works
- [ ] Filter by type works
- [ ] Search works

#### Create Request
- [ ] Form has unit selector
- [ ] Asset selector works (optional)
- [ ] Type selection (repair, replacement, service)
- [ ] Cost field validates
- [ ] Billing options (billed to tenant) work
- [ ] Tenant share field shows when billed to tenant
- [ ] Submit creates request

#### Read Request
- [ ] All request details display
- [ ] Cost breakdown displays
- [ ] Linked asset displays (if any)
- [ ] Linked invoice displays (if any)

#### Update Request
- [ ] Can update status
- [ ] Can add notes
- [ ] Can modify costs
- [ ] Changes persist

#### Delete Request
- [ ] Delete button works
- [ ] Confirmation works
- [ ] Request removed

### Maintenance Invoices Page (`/maintenance-invoices`)

#### List View
- [ ] All invoices display
- [ ] Filter by status works
- [ ] Filter by date works
- [ ] Filter by vendor works

#### Create Invoice
- [ ] Form has maintenance request selector (optional)
- [ ] Line items can be added
- [ ] Labor cost, parts cost, tax, misc fields work
- [ ] Grand total calculates correctly
- [ ] Submit creates invoice

#### Read Invoice
- [ ] All invoice details display
- [ ] Line items display correctly
- [ ] Calculations are correct
- [ ] Linked request displays (if any)

#### Update Invoice
- [ ] Can update status
- [ ] Can update payment info
- [ ] Can modify line items
- [ ] Changes persist

#### Delete Invoice
- [ ] Delete button works
- [ ] Confirmation works
- [ ] Invoice removed

## Asset Management Pages

### Assets Page (`/assets`)

#### List View
- [ ] All assets display
- [ ] Filter by unit works
- [ ] Filter by type works
- [ ] Filter by ownership works
- [ ] Search works

#### Create Asset
- [ ] Form has unit selector
- [ ] Asset type selector works
- [ ] Ownership selection (landlord/tenant) works
- [ ] Tenant selector shows when ownership is tenant
- [ ] Submit creates asset

#### Read Asset
- [ ] Asset details display
- [ ] Maintenance history displays
- [ ] Ownership information displays

#### Update Asset
- [ ] Can update asset info
- [ ] Can change ownership
- [ ] Can reassign to different unit
- [ ] Changes persist

#### Delete Asset
- [ ] Delete button works
- [ ] Confirmation works
- [ ] Asset removed

### Asset Types Page (`/asset-types`)

#### List View
- [ ] All types display
- [ ] Filter by category works
- [ ] Search works

#### Create Type
- [ ] Form has name and category fields
- [ ] Validation works
- [ ] Submit creates type

#### Update Type
- [ ] Can update name
- [ ] Can update category
- [ ] Changes persist

#### Delete Type
- [ ] Delete button works
- [ ] Error if type has associated assets
- [ ] Type removed if no assets

## Settings Pages

### System Settings (`/settings/system`)

#### Company Info
- [ ] Company name field works
- [ ] Address fields work
- [ ] Contact information fields work
- [ ] Save updates correctly

#### Currency
- [ ] Currency selector works
- [ ] Currency symbol updates
- [ ] Exchange rate displays (if applicable)

#### Invoice Numbering
- [ ] Format configuration works
- [ ] Prefix/suffix fields work
- [ ] Number sequence works
- [ ] Preview shows format

#### Payment Terms
- [ ] Default terms field works
- [ ] Terms options display
- [ ] Save works

#### Tax Settings
- [ ] Tax rate fields work
- [ ] Tax calculation method works
- [ ] Save works

#### Email Settings
- [ ] Provider selection works
- [ ] Connection test works
- [ ] Credentials save securely
- [ ] Test email sends

#### SMS Settings
- [ ] Provider configuration works
- [ ] Connection test works
- [ ] Test SMS sends

#### Telegram Settings
- [ ] Bot token field works
- [ ] Chat ID field works
- [ ] Connection test works
- [ ] Test message sends

#### Auto Invoice
- [ ] Enable/disable toggle works
- [ ] Generation day selection works
- [ ] Save works

### Account Settings (`/settings/account`)

#### Profile
- [ ] Personal information fields work
- [ ] Email field validates
- [ ] Mobile field validates
- [ ] Save updates profile

#### Password
- [ ] Current password field works
- [ ] New password field validates (strength requirements)
- [ ] Confirm password matches
- [ ] Save updates password
- [ ] Login with new password works

#### Delegates
- [ ] Delegate list displays
- [ ] Add delegate form works
- [ ] Edit delegate works
- [ ] Remove delegate works
- [ ] Permissions assignment works

## Other Pages

### Overview Page (`/`)

#### Dashboard
- [ ] All widgets load correctly
- [ ] Statistics display accurately
- [ ] Charts/graphs render
- [ ] Loading states work

#### Statistics
- [ ] Total properties count correct
- [ ] Total units count correct
- [ ] Occupancy rate calculates correctly
- [ ] Total revenue calculates correctly

#### Recent Activity
- [ ] Activity feed displays
- [ ] Recent items show correctly
- [ ] Links to details work

### Snapshot Page (`/snapshot`)

#### Charts
- [ ] All charts render correctly
- [ ] Data displays accurately
- [ ] Chart types appropriate

#### Filters
- [ ] Date range filter works
- [ ] Property filter works
- [ ] Filters update charts

#### Data Accuracy
- [ ] Calculations are correct
- [ ] Totals match detail views
- [ ] Percentages calculate correctly

### Reports Page (`/reports`)

#### If Exists
- [ ] Report generation works
- [ ] Report types available
- [ ] Data displays correctly

#### Filters
- [ ] All filter options work
- [ ] Date ranges work
- [ ] Property/unit filters work

#### Export
- [ ] Export button works
- [ ] PDF export generates
- [ ] CSV export generates
- [ ] Exported data is correct

### Notifications Page (`/notifications`)

#### List
- [ ] All notifications display
- [ ] Unread notifications highlighted
- [ ] Pagination works

#### Mark Read
- [ ] Mark as read button works
- [ ] Notification updates to read
- [ ] Badge count updates

#### Delete
- [ ] Delete button works
- [ ] Notification removed
- [ ] List updates

### Vendors Page (`/vendors`)

#### List
- [ ] All vendors display
- [ ] Search works
- [ ] Filter by category works

#### Create
- [ ] Form has all fields
- [ ] Category selection works
- [ ] Submit creates vendor

#### Update
- [ ] Edit form works
- [ ] Can update all fields
- [ ] Changes persist

#### Delete
- [ ] Delete button works
- [ ] Confirmation works
- [ ] Vendor removed

## Common Functionality Tests

### Authentication & Authorization
- [ ] Login works with valid credentials
- [ ] Login fails with invalid credentials
- [ ] Logout works
- [ ] Session persists across page refreshes
- [ ] Unauthorized access redirects to login
- [ ] Role-based access control works (owner, admin, manager, agent)

### Responsive Design
- [ ] Mobile view (< 768px) displays correctly
- [ ] Tablet view (768px - 1024px) displays correctly
- [ ] Desktop view (> 1024px) displays correctly
- [ ] Navigation menu works on mobile
- [ ] Forms are usable on mobile
- [ ] Tables convert to cards on mobile

### Error Handling
- [ ] 404 errors display friendly message
- [ ] 500 errors display friendly message
- [ ] Network errors show retry option
- [ ] Validation errors display inline
- [ ] API errors display user-friendly messages

### Performance
- [ ] Pages load within reasonable time (< 3 seconds)
- [ ] Large lists paginate correctly
- [ ] Search results appear quickly
- [ ] No console errors
- [ ] No memory leaks

## Test Data Requirements

Before testing, ensure the database has:
- At least 5 properties
- At least 20 units
- At least 10 tenants
- At least 8 tenant unit assignments
- 12+ months of rent invoices
- Various maintenance requests and invoices
- Security deposit refunds
- Payment methods configured
- Assets and asset types

Run: `php artisan db:seed --class=ComprehensiveReportDataSeeder`

## Notes

- Mark each item as complete when tested
- Note any bugs or issues found
- Test edge cases (empty states, large datasets, etc.)
- Test with different user roles
- Verify data persistence after page refreshes
- Test browser back/forward navigation

