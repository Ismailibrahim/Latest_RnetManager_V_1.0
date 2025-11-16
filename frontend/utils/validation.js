/**
 * Client-Side Validation Utilities
 * 
 * Provides validation functions and schema-based validation for forms.
 */

/**
 * Validation rule functions
 */
export const rules = {
  required: (value, message = "This field is required") => {
    if (value === null || value === undefined || value === "") {
      return message;
    }
    if (Array.isArray(value) && value.length === 0) {
      return message;
    }
    return null;
  },

  minLength: (min, message) => (value) => {
    if (!value) return null; // Let required handle empty values
    if (typeof value === "string" && value.length < min) {
      return message || `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max, message) => (value) => {
    if (!value) return null;
    if (typeof value === "string" && value.length > max) {
      return message || `Must be no more than ${max} characters`;
    }
    return null;
  },

  email: (value, message = "Please enter a valid email address") => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return message;
    }
    return null;
  },

  phone: (value, message = "Please enter a valid phone number") => {
    if (!value) return null;
    // Basic phone validation - accepts digits, spaces, +, -, (, )
    const phoneRegex = /^[\d\s+\-()]+$/;
    if (!phoneRegex.test(value) || value.replace(/\D/g, "").length < 7) {
      return message;
    }
    return null;
  },

  numeric: (value, message = "Must be a number") => {
    if (!value) return null;
    if (isNaN(Number(value))) {
      return message;
    }
    return null;
  },

  min: (min, message) => (value) => {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    if (isNaN(num) || num < min) {
      return message || `Must be at least ${min}`;
    }
    return null;
  },

  max: (max, message) => (value) => {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    if (isNaN(num) || num > max) {
      return message || `Must be no more than ${max}`;
    }
    return null;
  },

  positive: (value, message = "Must be a positive number") => {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return message;
    }
    return null;
  },

  date: (value, message = "Please enter a valid date") => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return message;
    }
    return null;
  },

  dateAfter: (otherDate, message) => (value) => {
    if (!value) return null;
    const date = new Date(value);
    const other = new Date(otherDate);
    if (isNaN(date.getTime()) || date <= other) {
      return message || "Date must be after the other date";
    }
    return null;
  },

  dateBefore: (otherDate, message) => (value) => {
    if (!value) return null;
    const date = new Date(value);
    const other = new Date(otherDate);
    if (isNaN(date.getTime()) || date >= other) {
      return message || "Date must be before the other date";
    }
    return null;
  },

  pattern: (regex, message) => (value) => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message || "Invalid format";
    }
    return null;
  },

  url: (value, message = "Please enter a valid URL") => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return message;
    }
  },

  oneOf: (options, message) => (value) => {
    if (!value) return null;
    if (!options.includes(value)) {
      return message || `Must be one of: ${options.join(", ")}`;
    }
    return null;
  },

  custom: (validator, message) => (value) => {
    if (!value) return null;
    const result = validator(value);
    if (result !== true) {
      return message || result || "Validation failed";
    }
    return null;
  },
};

/**
 * Validate a single value against a rule or array of rules
 * @param {any} value - Value to validate
 * @param {Function|Array<Function>} ruleOrRules - Validation rule(s)
 * @returns {string|null} Error message or null if valid
 */
export function validateValue(value, ruleOrRules) {
  if (!ruleOrRules) return null;

  const rulesArray = Array.isArray(ruleOrRules) ? ruleOrRules : [ruleOrRules];

  for (const rule of rulesArray) {
    if (typeof rule === "function") {
      const error = rule(value);
      if (error) return error;
    }
  }

  return null;
}

/**
 * Validate an object against a schema
 * @param {object} data - Data to validate
 * @param {object} schema - Validation schema { field: ruleOrRules }
 * @returns {object} { isValid: boolean, errors: { field: string } }
 */
export function validateSchema(data, schema) {
  const errors = {};

  for (const [field, ruleOrRules] of Object.entries(schema)) {
    const value = data[field];
    const error = validateValue(value, ruleOrRules);

    if (error) {
      errors[field] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Create a validation schema from field definitions
 * @param {object} fields - Field definitions { field: { rules: [...] } }
 * @returns {object} Validation schema
 */
export function createSchema(fields) {
  const schema = {};

  for (const [field, config] of Object.entries(fields)) {
    if (config.rules) {
      schema[field] = Array.isArray(config.rules) ? config.rules : [config.rules];
    }
  }

  return schema;
}

/**
 * Common validation schemas
 */
export const schemas = {
  property: {
    name: [rules.required(), rules.minLength(2, "Name must be at least 2 characters")],
    address: [rules.required(), rules.minLength(5, "Address must be at least 5 characters")],
    type: [rules.required(), rules.oneOf(["residential", "commercial", "mixed"], "Invalid property type")],
  },

  unit: {
    property_id: [rules.required()],
    unit_number: [rules.required(), rules.minLength(1, "Unit number is required")],
    unit_type_id: [rules.required()],
  },

  tenant: {
    full_name: [rules.required(), rules.minLength(2, "Name must be at least 2 characters")],
    email: [rules.required(), rules.email()],
    phone: [rules.required(), rules.phone()],
    nationality_id: [rules.required()],
  },

  tenantUnit: {
    tenant_id: [rules.required()],
    unit_id: [rules.required()],
    lease_start: [rules.required(), rules.date()],
    lease_end: [rules.required(), rules.date()],
    monthly_rent: [rules.required(), rules.positive("Monthly rent must be greater than 0")],
  },

  rentInvoice: {
    tenant_unit_id: [rules.required()],
    invoice_date: [rules.required(), rules.date()],
    due_date: [rules.required(), rules.date()],
    rent_amount: [rules.required(), rules.positive("Rent amount must be greater than 0")],
    late_fee: [rules.min(0, "Late fee cannot be negative")],
  },

  financialRecord: {
    tenant_unit_id: [rules.required()],
    type: [rules.required()],
    category: [rules.required()],
    amount: [rules.required(), rules.numeric("Amount must be a number")],
    transaction_date: [rules.required(), rules.date()],
  },
};

/**
 * Validate form data before submission
 * @param {object} data - Form data
 * @param {object|string} schemaOrSchemaName - Validation schema or schema name
 * @returns {object} { isValid, errors }
 */
export function validateForm(data, schemaOrSchemaName) {
  let schema;

  if (typeof schemaOrSchemaName === "string") {
    schema = schemas[schemaOrSchemaName];
    if (!schema) {
      console.warn(`Schema "${schemaOrSchemaName}" not found`);
      return { isValid: true, errors: {} };
    }
  } else {
    schema = schemaOrSchemaName;
  }

  return validateSchema(data, schema);
}

