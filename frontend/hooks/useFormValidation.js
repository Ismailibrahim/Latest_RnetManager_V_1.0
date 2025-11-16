"use client";

import { useState, useCallback, useMemo } from "react";
import { validateForm, validateValue } from "@/utils/validation";

/**
 * Custom hook for form validation
 * 
 * @param {object} initialValues - Initial form values
 * @param {object|string} schemaOrSchemaName - Validation schema or schema name
 * @param {object} options - Options { validateOnChange, validateOnBlur, validateOnSubmit }
 * @returns {object} Form validation state and methods
 */
export function useFormValidation(initialValues, schemaOrSchemaName, options = {}) {
  const {
    validateOnChange = false,
    validateOnBlur = true,
    validateOnSubmit = true,
  } = options;

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate entire form
  const validate = useCallback(() => {
    const result = validateForm(values, schemaOrSchemaName);
    setErrors(result.errors);
    return result.isValid;
  }, [values, schemaOrSchemaName]);

  // Validate single field
  const validateField = useCallback((fieldName, value) => {
    // Get schema
    let schema;
    if (typeof schemaOrSchemaName === "string") {
      const schemas = require("@/utils/validation").schemas;
      schema = schemas[schemaOrSchemaName];
    } else {
      schema = schemaOrSchemaName;
    }

    if (!schema || !schema[fieldName]) {
      return null;
    }

    const error = validateValue(value, schema[fieldName]);
    setErrors((prev) => ({
      ...prev,
      [fieldName]: error || undefined,
    }));
    return error;
  }, [schemaOrSchemaName]);

  // Handle field change
  const handleChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    const newValue = type === "checkbox" ? checked : value;

    setValues((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear error for this field
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));

    // Validate on change if enabled
    if (validateOnChange) {
      validateField(name, newValue);
    }
  }, [validateOnChange, validateField]);

  // Handle field blur
  const handleBlur = useCallback((event) => {
    const { name, value } = event.target;

    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    // Validate on blur if enabled
    if (validateOnBlur) {
      validateField(name, value);
    }
  }, [validateOnBlur, validateField]);

  // Handle form submit
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);

    // Validate on submit if enabled
    if (validateOnSubmit) {
      const isValid = validate();
      if (!isValid) {
        // Mark all fields as touched
        const allTouched = Object.keys(values).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {});
        setTouched(allTouched);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateOnSubmit, validate, values]);

  // Reset form
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Set field value programmatically
  const setValue = useCallback((name, value) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (validateOnChange) {
      validateField(name, value);
    }
  }, [validateOnChange, validateField]);

  // Set field error programmatically
  const setError = useCallback((name, error) => {
    setErrors((prev) => ({
      ...prev,
      [name]: error || undefined,
    }));
  }, []);

  // Get field error
  const getFieldError = useCallback((name) => {
    return errors[name];
  }, [errors]);

  // Check if field is touched
  const isFieldTouched = useCallback((name) => {
    return touched[name] || false;
  }, [touched]);

  // Check if field has error
  const hasFieldError = useCallback((name) => {
    return !!errors[name];
  }, [errors]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Check if form has been touched
  const isTouched = useMemo(() => {
    return Object.keys(touched).length > 0;
  }, [touched]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isTouched,
    handleChange,
    handleBlur,
    handleSubmit,
    validate,
    validateField,
    reset,
    setValue,
    setError,
    getFieldError,
    isFieldTouched,
    hasFieldError,
  };
}

