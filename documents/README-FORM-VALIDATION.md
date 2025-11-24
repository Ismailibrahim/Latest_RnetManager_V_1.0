# Form Validation Guide

This document describes the client-side form validation system available in the RentApplication frontend.

## Overview

The application provides a comprehensive client-side validation system with:
- **Validation Rules** - Reusable validation functions
- **Validation Schemas** - Pre-defined schemas for common forms
- **Form Validation Hook** - React hook for managing form state and validation
- **Form Components** - Reusable form components with built-in validation styling

## Validation Rules

**Location:** `utils/validation.js`

### Available Rules

- `required(message?)` - Field is required
- `minLength(min, message?)` - Minimum string length
- `maxLength(max, message?)` - Maximum string length
- `email(message?)` - Valid email format
- `phone(message?)` - Valid phone number
- `numeric(message?)` - Must be a number
- `min(min, message?)` - Minimum numeric value
- `max(max, message?)` - Maximum numeric value
- `positive(message?)` - Must be positive number
- `date(message?)` - Valid date
- `dateAfter(otherDate, message?)` - Date must be after another date
- `dateBefore(otherDate, message?)` - Date must be before another date
- `pattern(regex, message?)` - Match regex pattern
- `url(message?)` - Valid URL
- `oneOf(options, message?)` - Value must be in options array
- `custom(validator, message?)` - Custom validation function

### Usage

```jsx
import { rules } from "@/utils/validation";

const schema = {
  name: [rules.required(), rules.minLength(2)],
  email: [rules.required(), rules.email()],
  age: [rules.required(), rules.min(18), rules.max(100)],
};
```

## Validation Schemas

Pre-defined schemas for common forms:

- `schemas.property` - Property form validation
- `schemas.unit` - Unit form validation
- `schemas.tenant` - Tenant form validation
- `schemas.tenantUnit` - Tenant-Unit assignment validation
- `schemas.rentInvoice` - Rent invoice validation
- `schemas.financialRecord` - Financial record validation

### Usage

```jsx
import { schemas } from "@/utils/validation";

// Use pre-defined schema
const result = validateForm(formData, "property");

// Or create custom schema
const customSchema = {
  field1: [rules.required()],
  field2: [rules.email()],
};
const result = validateForm(formData, customSchema);
```

## Form Validation Hook

**Location:** `hooks/useFormValidation.js`

The `useFormValidation` hook manages form state, validation, and submission.

### Basic Usage

```jsx
import { useFormValidation } from "@/hooks/useFormValidation";
import { schemas } from "@/utils/validation";

function MyForm() {
  const {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  } = useFormValidation(
    { name: "", email: "" },
    "tenant", // or custom schema
    {
      validateOnChange: false,
      validateOnBlur: true,
      validateOnSubmit: true,
    }
  );

  const onSubmit = async (formValues) => {
    // Submit form
    const response = await fetch("/api/v1/tenants", {
      method: "POST",
      body: JSON.stringify(formValues),
    });
    // Handle response
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(onSubmit);
    }}>
      {/* Form fields */}
    </form>
  );
}
```

### Hook Options

- `validateOnChange` (default: `false`) - Validate field on change
- `validateOnBlur` (default: `true`) - Validate field on blur
- `validateOnSubmit` (default: `true`) - Validate entire form on submit

### Hook Returns

- `values` - Current form values
- `errors` - Validation errors object
- `touched` - Touched fields object
- `isSubmitting` - Submission state
- `isValid` - Whether form is valid
- `isTouched` - Whether any field has been touched
- `handleChange` - Change handler for inputs
- `handleBlur` - Blur handler for inputs
- `handleSubmit` - Submit handler
- `validate` - Validate entire form
- `validateField` - Validate single field
- `reset` - Reset form to initial values
- `setValue` - Set field value programmatically
- `setError` - Set field error programmatically
- `getFieldError` - Get error for specific field
- `isFieldTouched` - Check if field is touched
- `hasFieldError` - Check if field has error

## Form Components

**Location:** `components/FormField.jsx`

Reusable form components with built-in validation styling.

### FormField

Wrapper component for form fields with label and error display.

```jsx
import { FormField, Input } from "@/components/FormField";

<FormField
  label="Name"
  name="name"
  error={errors.name}
  required
  hint="Enter the full name"
>
  <Input
    name="name"
    value={values.name}
    onChange={handleChange}
    onBlur={handleBlur}
    error={errors.name}
    touched={touched.name}
  />
</FormField>
```

### Input

Enhanced input with validation styling.

```jsx
<Input
  name="email"
  type="email"
  value={values.email}
  onChange={handleChange}
  onBlur={handleBlur}
  error={errors.email}
  touched={touched.email}
  placeholder="Enter email"
/>
```

### Textarea

Enhanced textarea with validation styling.

```jsx
<Textarea
  name="description"
  value={values.description}
  onChange={handleChange}
  onBlur={handleBlur}
  error={errors.description}
  touched={touched.description}
  rows={4}
/>
```

### Select

Enhanced select with validation styling.

```jsx
<Select
  name="type"
  value={values.type}
  onChange={handleChange}
  onBlur={handleBlur}
  error={errors.type}
  touched={touched.type}
>
  <option value="">Select type</option>
  <option value="residential">Residential</option>
  <option value="commercial">Commercial</option>
</Select>
```

### Checkbox

Enhanced checkbox with validation styling.

```jsx
<Checkbox
  name="agree"
  checked={values.agree}
  onChange={handleChange}
  label="I agree to the terms"
  error={errors.agree}
  touched={touched.agree}
/>
```

## Complete Example

### Property Form with Validation

```jsx
"use client";

import { useState } from "react";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FormField, Input, Textarea, Select } from "@/components/FormField";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { useApiError } from "@/hooks/useApiError";

const initialValues = {
  name: "",
  address: "",
  type: "residential",
};

export default function PropertyForm() {
  const { error, clearError, executeWithErrorHandling } = useApiError();
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useFormValidation(initialValues, "property");

  const onSubmit = async (formValues) => {
    const { data, error: submitError } = await executeWithErrorHandling(async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/v1/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formValues),
      });

      if (!response.ok) {
        throw response;
      }

      return response.json();
    });

    if (submitError) {
      // Handle API validation errors
      if (submitError.status === 422 && submitError.errors) {
        // Set field errors from API
        Object.entries(submitError.errors).forEach(([field, messages]) => {
          setError(field, Array.isArray(messages) ? messages[0] : messages);
        });
      }
      return;
    }

    // Success - redirect or show success message
    console.log("Property created:", data);
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(onSubmit);
    }}>
      {error && (
        <ErrorDisplay
          error={error}
          onDismiss={clearError}
        />
      )}

      <FormField
        label="Property Name"
        name="name"
        error={errors.name}
        required
      >
        <Input
          name="name"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.name}
          touched={touched.name}
          placeholder="Lagoon View Apartments"
          disabled={isSubmitting}
        />
      </FormField>

      <FormField
        label="Address"
        name="address"
        error={errors.address}
        required
      >
        <Textarea
          name="address"
          value={values.address}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.address}
          touched={touched.address}
          placeholder="Street, City, Postal code"
          disabled={isSubmitting}
        />
      </FormField>

      <FormField
        label="Property Type"
        name="type"
        error={errors.type}
        required
      >
        <Select
          name="type"
          value={values.type}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.type}
          touched={touched.type}
          disabled={isSubmitting}
        >
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="mixed">Mixed</option>
        </Select>
      </FormField>

      <button
        type="submit"
        disabled={isSubmitting || !isValid}
        className="rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? "Creating..." : "Create Property"}
      </button>
    </form>
  );
}
```

## Custom Validation

### Custom Rule

```jsx
import { rules } from "@/utils/validation";

const schema = {
  password: [
    rules.required(),
    rules.minLength(8, "Password must be at least 8 characters"),
    rules.pattern(/[A-Z]/, "Password must contain an uppercase letter"),
    rules.pattern(/[a-z]/, "Password must contain a lowercase letter"),
    rules.pattern(/[0-9]/, "Password must contain a number"),
  ],
  confirmPassword: [
    rules.required(),
    rules.custom((value, formValues) => {
      if (value !== formValues.password) {
        return "Passwords do not match";
      }
      return true;
    }),
  ],
};
```

### Conditional Validation

```jsx
const schema = {
  hasEmail: [rules.required()],
  email: [
    rules.custom((value, formValues) => {
      if (formValues.hasEmail === "yes" && !value) {
        return "Email is required";
      }
      if (value && !rules.email()(value)) {
        return "Please enter a valid email";
      }
      return true;
    }),
  ],
};
```

## Best Practices

### 1. Validate on Blur

Validate fields when the user leaves them (blur event) for better UX:

```jsx
const { handleBlur } = useFormValidation(initialValues, schema, {
  validateOnBlur: true,
});
```

### 2. Show Errors Only After Touch

Only show validation errors after the user has interacted with the field:

```jsx
{errors.name && touched.name && (
  <InlineError error={errors.name} />
)}
```

### 3. Combine Client and Server Validation

Use client-side validation for immediate feedback, but always validate on the server:

```jsx
const onSubmit = async (formValues) => {
  // Client-side validation already done by handleSubmit
  const response = await fetch("/api/v1/properties", {
    method: "POST",
    body: JSON.stringify(formValues),
  });

  if (response.status === 422) {
    // Handle server-side validation errors
    const { errors } = await response.json();
    // Set field errors
  }
};
```

### 4. Disable Submit Button When Invalid

Prevent submission of invalid forms:

```jsx
<button
  type="submit"
  disabled={isSubmitting || !isValid}
>
  Submit
</button>
```

### 5. Provide Clear Error Messages

Use descriptive error messages:

```jsx
const schema = {
  email: [
    rules.required("Please enter your email address"),
    rules.email("Please enter a valid email address"),
  ],
};
```

## Testing Validation

Test validation rules:

```jsx
import { validateValue, rules } from "@/utils/validation";

// Test required rule
expect(validateValue("", rules.required())).toBe("This field is required");
expect(validateValue("value", rules.required())).toBeNull();

// Test email rule
expect(validateValue("invalid", rules.email())).toBeTruthy();
expect(validateValue("test@example.com", rules.email())).toBeNull();
```

## Migration Guide

### From Manual Validation

**Before:**
```jsx
const [errors, setErrors] = useState({});

const validate = () => {
  const newErrors = {};
  if (!form.name) newErrors.name = "Name is required";
  if (!form.email) newErrors.email = "Email is required";
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**After:**
```jsx
const { errors, isValid, validate } = useFormValidation(
  form,
  "property"
);
```

### From API-Only Validation

**Before:**
```jsx
const handleSubmit = async () => {
  const response = await fetch("/api/v1/properties", {
    method: "POST",
    body: JSON.stringify(form),
  });
  if (response.status === 422) {
    const { errors } = await response.json();
    setErrors(errors);
  }
};
```

**After:**
```jsx
const { handleSubmit, errors } = useFormValidation(
  form,
  "property"
);

const onSubmit = async (formValues) => {
  // Client-side validation already done
  const response = await fetch("/api/v1/properties", {
    method: "POST",
    body: JSON.stringify(formValues),
  });
  // Handle server validation errors if needed
};
```

---

**Last Updated:** 2024-01-01

