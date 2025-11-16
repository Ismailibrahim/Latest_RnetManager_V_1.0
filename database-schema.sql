-- Complete Rental Management System Database Schema

-- Table of Contents
-- 1. Business Entities
-- 2. Property Management
-- 3. Tenant Management
-- 4. Financial Management
-- 5. Maintenance Management
-- 6. Asset Management
-- 7. Notifications
-- 8. Views & Reports

-- 1. Business Entities

-- 1.1 Landlords (Business Accounts)
DROP TABLE IF EXISTS landlords;
CREATE TABLE landlords (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  subscription_tier ENUM('basic', 'pro', 'enterprise') DEFAULT 'basic',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_landlord_company (company_name),
  INDEX idx_landlord_tier (subscription_tier)
);

-- 1.2 Users (Team Members)
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  landlord_id BIGINT UNSIGNED NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255),
  role ENUM('owner', 'admin', 'manager', 'agent') DEFAULT 'owner',
  is_active BOOLEAN DEFAULT TRUE,
  email_verified_at TIMESTAMP NULL,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
  INDEX idx_user_landlord (landlord_id),
  INDEX idx_user_email (email),
  INDEX idx_user_role (role)
);

-- 1.3 Subscription Limits
DROP TABLE IF EXISTS subscription_limits;
CREATE TABLE subscription_limits (
  tier ENUM('basic', 'pro', 'enterprise') PRIMARY KEY,
  max_properties INT NOT NULL,
  max_units INT NOT NULL,
  max_users INT NOT NULL,
  monthly_price DECIMAL(10, 2) NOT NULL,
  features JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO subscription_limits (tier, max_properties, max_units, max_users, monthly_price, features) VALUES
  ('basic', 1, 5, 1, 0.00, '["basic_reports", "email_support"]'),
  ('pro', 10, 50, 5, 999.00, '["advanced_reports", "phone_support", "maintenance_tracking"]'),
  ('enterprise', 100, 1000, 50, 4999.00, '["all_features", "dedicated_support", "api_access", "custom_reports"]');

-- 1.4 Subscription Invoices
DROP TABLE IF EXISTS subscription_invoices;
CREATE TABLE subscription_invoices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  landlord_id BIGINT UNSIGNED NOT NULL,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  period_start DATE NULL,
  period_end DATE NULL,
  issued_at DATETIME NOT NULL,
  due_at DATETIME NULL,
  paid_at DATETIME NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency CHAR(3) DEFAULT 'USD',
  status ENUM('paid', 'pending', 'overdue', 'void') DEFAULT 'pending',
  download_url VARCHAR(500),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
  INDEX idx_subscription_invoices_landlord (landlord_id),
  INDEX idx_subscription_invoices_status (status),
  INDEX idx_subscription_invoices_issued (issued_at)
);

-- 2. Property Management

-- 2.1 Properties
DROP TABLE IF EXISTS properties;
CREATE TABLE properties (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  landlord_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  type ENUM('residential', 'commercial') NOT NULL DEFAULT 'residential',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
  INDEX idx_property_landlord (landlord_id),
  INDEX idx_property_type (type)
);

-- 2.2 Unit Types (Global)
DROP TABLE IF EXISTS unit_types;
CREATE TABLE unit_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unit_type_name (name),
  INDEX idx_unit_type_active (is_active)
);

INSERT INTO unit_types (name, description) VALUES
  ('Studio', 'Single room with kitchenette'),
  ('1BHK', '1 Bedroom, Hall, Kitchen'),
  ('2BHK', '2 Bedrooms, Hall, Kitchen'),
  ('3BHK', '3 Bedrooms, Hall, Kitchen'),
  ('Shop', 'Commercial retail space'),
  ('Office', 'Commercial office space'),
  ('Warehouse', 'Storage or industrial space'),
  ('Penthouse', 'Luxury top-floor apartment');

-- 2.3 Units
DROP TABLE IF EXISTS units;
CREATE TABLE units (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  landlord_id BIGINT UNSIGNED NOT NULL,
  unit_number VARCHAR(50) NOT NULL,
  unit_type_id BIGINT UNSIGNED NOT NULL,
  rent_amount DECIMAL(10, 2) NOT NULL,
  security_deposit DECIMAL(10, 2) NULL,
  is_occupied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_type_id) REFERENCES unit_types(id) ON DELETE RESTRICT,
  INDEX idx_unit_property (property_id),
  INDEX idx_unit_landlord (landlord_id),
  INDEX idx_unit_occupied (is_occupied),
  INDEX idx_unit_type (unit_type_id),
  UNIQUE KEY unique_unit_property (property_id, unit_number)
);

-- 3. Tenant Management

DROP TABLE IF EXISTS tenants;
CREATE TABLE tenants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  landlord_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  alternate_phone VARCHAR(20),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  id_proof_type ENUM('national_id', 'passport'),
  id_proof_number VARCHAR(100),
  status ENUM('active', 'inactive', 'former') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
  INDEX idx_tenant_landlord (landlord_id),
  INDEX idx_tenant_status (status),
  INDEX idx_tenant_phone (phone),
  INDEX idx_tenant_email (email)
);

-- 3.2 Tenant Units (Lease Agreements)
DROP TABLE IF EXISTS tenant_units;
CREATE TABLE tenant_units (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  landlord_id BIGINT UNSIGNED NOT NULL,
  lease_start DATE NOT NULL,
  lease_end DATE NOT NULL,
  monthly_rent DECIMAL(10, 2) NOT NULL,
  security_deposit_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
  advance_rent_months INT DEFAULT 0,
  advance_rent_amount DECIMAL(10, 2) DEFAULT 0,
  notice_period_days INT,
  lock_in_period_months INT,
  lease_document_path VARCHAR(500),
  status ENUM('active', 'ended', 'cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
  INDEX idx_tenant_units_tenant (tenant_id),
  INDEX idx_tenant_units_unit (unit_id),
  INDEX idx_tenant_units_status (status),
  INDEX idx_tenant_units_dates (lease_start, lease_end)
);

-- 3.3 Unit Occupancy History
DROP TABLE IF EXISTS unit_occupancy_history;
CREATE TABLE unit_occupancy_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unit_id BIGINT UNSIGNED NOT NULL,
  tenant_id BIGINT UNSIGNED NOT NULL,
  tenant_unit_id BIGINT UNSIGNED NOT NULL,
  action ENUM('move_in', 'move_out') NOT NULL,
  action_date DATE NOT NULL,
  rent_amount DECIMAL(10, 2),
  security_deposit_amount DECIMAL(10, 2),
  lease_start_date DATE,
  lease_end_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_unit_id) REFERENCES tenant_units(id) ON DELETE CASCADE,
  INDEX idx_occupancy_unit (unit_id),
  INDEX idx_occupancy_tenant (tenant_id),
  INDEX idx_occupancy_date (action_date),
  INDEX idx_occupancy_action (action)
);

-- 4. Financial Management

-- 4.1 Financial Records
DROP TABLE IF EXISTS financial_records;
CREATE TABLE financial_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  landlord_id BIGINT UNSIGNED NOT NULL,
  tenant_unit_id BIGINT UNSIGNED NOT NULL,
  type ENUM('rent', 'expense', 'security_deposit', 'refund', 'fee') NOT NULL,
  category ENUM(
    'monthly_rent', 'late_fee', 'processing_fee',
    'maintenance', 'repair', 'utility', 'tax', 'insurance', 'management_fee', 'other'
  ) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(500) NOT NULL,
  due_date DATE NULL,
  paid_date DATE NULL,
  transaction_date DATE NOT NULL,
  invoice_number VARCHAR(100),
  payment_method ENUM('cash', 'bank_transfer', 'upi', 'card', 'cheque') DEFAULT 'cash',
  reference_number VARCHAR(100),
  parent_id BIGINT UNSIGNED NULL,
  is_installment BOOLEAN DEFAULT FALSE,
  installment_number INT NULL,
  total_installments INT NULL,
  status ENUM('pending', 'completed', 'cancelled', 'overdue', 'partial') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_unit_id) REFERENCES tenant_units(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES financial_records(id) ON DELETE SET NULL,
  INDEX idx_financial_landlord (landlord_id),
  INDEX idx_financial_tenant_unit (tenant_unit_id),
  INDEX idx_financial_dates (due_date, paid_date),
  INDEX idx_financial_status (status),
  INDEX idx_financial_invoice (invoice_number)
);

-- 4.2 Rent Invoices
DROP TABLE IF EXISTS rent_invoices;
CREATE TABLE rent_invoices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_unit_id BIGINT UNSIGNED NOT NULL,
  landlord_id BIGINT UNSIGNED NOT NULL,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  rent_amount DECIMAL(10, 2) NOT NULL,
  late_fee DECIMAL(10, 2) DEFAULT 0,
  status ENUM('generated', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'generated',
  paid_date DATE NULL,
  payment_method ENUM('cash', 'bank_transfer', 'upi', 'card', 'cheque') NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_unit_id) REFERENCES tenant_units(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
  INDEX idx_invoices_tenant_unit (tenant_unit_id),
  INDEX idx_invoices_status (status),
  INDEX idx_invoices_due_date (due_date),
  INDEX idx_invoices_number (invoice_number)
);

-- 4.3 Security Deposit Refunds
DROP TABLE IF EXISTS security_deposit_refunds;
CREATE TABLE security_deposit_refunds (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_unit_id BIGINT UNSIGNED NOT NULL,
  landlord_id BIGINT UNSIGNED NOT NULL,
  refund_number VARCHAR(100) UNIQUE NOT NULL,
  refund_date DATE NOT NULL,
  original_deposit DECIMAL(10, 2) NOT NULL,
  deductions DECIMAL(10, 2) DEFAULT 0,
  refund_amount DECIMAL(10, 2) NOT NULL,
  deduction_reasons JSON,
  status ENUM('pending', 'processed', 'cancelled') DEFAULT 'pending',
  payment_method ENUM('bank_transfer', 'cheque', 'cash', 'upi') NULL,
  transaction_reference VARCHAR(100),
  receipt_generated BOOLEAN DEFAULT FALSE,
  receipt_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_unit_id) REFERENCES tenant_units(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
  INDEX idx_deposit_refund_number (refund_number),
  INDEX idx_deposit_status (status)
);

-- 5. Maintenance Management

-- 5.1 Maintenance Requests
DROP TABLE IF EXISTS maintenance_requests;
CREATE TABLE maintenance_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  unit_id BIGINT UNSIGNED NOT NULL,
  landlord_id BIGINT UNSIGNED NOT NULL,
  description TEXT NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  asset_id BIGINT UNSIGNED NULL,
  location VARCHAR(100),
  serviced_by VARCHAR(255),
  invoice_number VARCHAR(100) NULL,
  is_billable BOOLEAN DEFAULT TRUE,
  billed_to_tenant BOOLEAN DEFAULT FALSE,
  tenant_share DECIMAL(10, 2) DEFAULT 0,
  type ENUM('repair', 'replacement', 'service') DEFAULT 'repair',
  maintenance_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
  INDEX idx_maintenance_unit (unit_id),
  INDEX idx_maintenance_date (maintenance_date),
  INDEX idx_maintenance_type (type),
  INDEX idx_maintenance_vendor (serviced_by)
);

-- 6. Asset Management

-- 6.1 Asset Types (Global)
DROP TABLE IF EXISTS asset_types;
CREATE TABLE asset_types (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category ENUM('appliance', 'furniture', 'electronic', 'fixture', 'other') DEFAULT 'appliance',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_asset_type_name (name),
  INDEX idx_asset_type_category (category),
  INDEX idx_asset_type_active (is_active)
);

INSERT INTO asset_types (name, category) VALUES
  ('AC', 'appliance'),
  ('Refrigerator', 'appliance'),
  ('Washing Machine', 'appliance'),
  ('Water Heater', 'appliance'),
  ('Microwave', 'appliance'),
  ('Television', 'electronic'),
  ('Sofa', 'furniture'),
  ('Bed', 'furniture'),
  ('Dining Table', 'furniture'),
  ('Wardrobe', 'furniture'),
  ('Fan', 'fixture'),
  ('Light', 'fixture'),
  ('Curtains', 'other');

-- 6.2 Assets
DROP TABLE IF EXISTS assets;
CREATE TABLE assets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_type_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  ownership ENUM('landlord', 'tenant') DEFAULT 'landlord',
  tenant_id BIGINT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  location VARCHAR(100),
  installation_date DATE,
  status ENUM('working', 'maintenance', 'broken') DEFAULT 'working',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_type_id) REFERENCES asset_types(id) ON DELETE RESTRICT,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
  INDEX idx_assets_unit (unit_id),
  INDEX idx_assets_status (status),
  INDEX idx_assets_type (asset_type_id),
  INDEX idx_assets_ownership (ownership),
  INDEX idx_assets_tenant (tenant_id)
);

-- 7. Notifications

-- 7.1 Notifications
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  landlord_id BIGINT UNSIGNED NOT NULL,
  type ENUM('rent_due', 'rent_received', 'maintenance_request', 'lease_expiry', 'security_deposit', 'system') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  action_url VARCHAR(500),
  expires_at TIMESTAMP NULL,
  sent_via ENUM('in_app', 'email', 'sms', 'telegram', 'all') DEFAULT 'in_app',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
  INDEX idx_notifications_landlord (landlord_id),
  INDEX idx_notifications_read (is_read),
  INDEX idx_notifications_type (type),
  INDEX idx_notifications_priority (priority),
  INDEX idx_notifications_expires (expires_at),
  INDEX idx_notifications_created (created_at)
);

-- 7.2 Telegram Templates
DROP TABLE IF EXISTS telegram_templates;
CREATE TABLE telegram_templates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  landlord_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('rent_due', 'rent_received', 'maintenance_request', 'lease_expiry', 'security_deposit', 'system') NULL,
  message TEXT NOT NULL,
  parse_mode ENUM('Markdown', 'HTML', 'None') DEFAULT 'None',
  variables JSON NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
  INDEX idx_telegram_templates_landlord (landlord_id),
  INDEX idx_telegram_templates_type (type),
  INDEX idx_telegram_templates_default (is_default),
  INDEX idx_telegram_templates_landlord_type_default (landlord_id, type, is_default)
);

-- 8. Views & Reports

-- 8.1 Unified Payments View
CREATE OR REPLACE VIEW unified_payments AS
SELECT
  fr.id,
  fr.landlord_id,
  fr.tenant_unit_id,
  'rent' AS payment_type,
  fr.amount,
  fr.description,
  fr.transaction_date,
  fr.due_date,
  fr.payment_method,
  fr.reference_number,
  fr.status,
  fr.invoice_number,
  tu.unit_id,
  t.full_name AS tenant_name,
  NULL AS vendor_name,
  'income' AS flow_direction
FROM financial_records fr
JOIN tenant_units tu ON fr.tenant_unit_id = tu.id
JOIN tenants t ON tu.tenant_id = t.id
WHERE fr.type = 'rent'

UNION ALL

SELECT
  fr.id,
  fr.landlord_id,
  fr.tenant_unit_id,
  'maintenance_expense' AS payment_type,
  fr.amount,
  fr.description,
  fr.transaction_date,
  fr.due_date,
  fr.payment_method,
  fr.reference_number,
  fr.status,
  fr.invoice_number,
  tu.unit_id,
  t.full_name AS tenant_name,
  mr.serviced_by AS vendor_name,
  'outgoing' AS flow_direction
FROM financial_records fr
JOIN tenant_units tu ON fr.tenant_unit_id = tu.id
JOIN tenants t ON tu.tenant_id = t.id
JOIN maintenance_requests mr ON fr.description LIKE CONCAT('%', mr.id, '%')
WHERE fr.type = 'expense' AND fr.category = 'maintenance'

UNION ALL

SELECT
  sdr.id,
  sdr.landlord_id,
  sdr.tenant_unit_id,
  'security_refund' AS payment_type,
  sdr.refund_amount AS amount,
  CONCAT('Security Deposit Refund - ', t.full_name) AS description,
  sdr.refund_date AS transaction_date,
  NULL AS due_date,
  sdr.payment_method,
  sdr.transaction_reference AS reference_number,
  CASE
    WHEN sdr.status = 'processed' THEN 'completed'
    ELSE sdr.status
  END AS status,
  sdr.receipt_number AS invoice_number,
  tu.unit_id,
  t.full_name AS tenant_name,
  NULL AS vendor_name,
  'outgoing' AS flow_direction
FROM security_deposit_refunds sdr
JOIN tenant_units tu ON sdr.tenant_unit_id = tu.id
JOIN tenants t ON tu.tenant_id = t.id;

-- 8.2 Subscription Limit Check Query
-- Example query to check if landlord can create new property:
-- SELECT
--   l.subscription_tier,
--   sl.max_properties,
--   (SELECT COUNT(*) FROM properties WHERE landlord_id = l.id) AS current_properties,
--   (sl.max_properties - (SELECT COUNT(*) FROM properties WHERE landlord_id = l.id)) AS remaining_properties
-- FROM landlords l
-- JOIN subscription_limits sl ON l.subscription_tier = sl.tier
-- WHERE l.id = ?;

-- Implementation Notes:
-- 1. Start with Basic Setup: Create landlords, users, and subscription limits first.
-- 2. Add Properties & Units: Then create properties and their units.
-- 3. Onboard Tenants: Add tenants and create lease agreements.
-- 4. Manage Finances: Use the unified payments view for all money movements.
-- 5. Track Maintenance: Record maintenance with cost allocation.
-- 6. Monitor Assets: Track landlord vs tenant-owned assets.

-- Key Features Covered:
-- • Multi-user landlord accounts
-- • Subscription-based limits
-- • Property & unit management
-- • Tenant & lease tracking
-- • Complete financial management (rent, expenses, refunds)
-- • Maintenance tracking with cost allocation
-- • Asset management
-- • Automated notifications
-- • Unified payments dashboard
-- • Security deposit handling

