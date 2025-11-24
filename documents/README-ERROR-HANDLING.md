# Error Handling Guide

This document describes the error handling strategy and components available in the RentApplication frontend.

## Overview

The application implements a comprehensive error handling system with:
- **Global Error Boundaries** - Catch React component errors
- **API Error Handling** - Consistent error handling for API requests
- **User-Friendly Error Messages** - Clear, actionable error messages
- **Error Display Components** - Reusable UI components for showing errors

## Components

### ErrorBoundary

A React error boundary component that catches JavaScript errors in child components.

**Location:** `components/ErrorBoundary.jsx`

**Usage:**
```jsx
import ErrorBoundary from "@/components/ErrorBoundary";

function MyComponent() {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

**Props:**
- `fallback` (optional): Custom error UI render function
- `showDetails` (optional): Show error details in development (default: false)
- `children`: Child components to wrap

### ErrorDisplay

A reusable component for displaying error messages with different variants.

**Location:** `components/ErrorDisplay.jsx`

**Usage:**
```jsx
import { ErrorDisplay } from "@/components/ErrorDisplay";

function MyComponent() {
  const [error, setError] = useState(null);

  return (
    <div>
      {error && (
        <ErrorDisplay
          error={error}
          onDismiss={() => setError(null)}
          autoDismiss={true}
          autoDismissDelay={5000}
        />
      )}
    </div>
  );
}
```

**Props:**
- `error` (optional): Error object
- `title` (optional): Custom error title
- `message` (optional): Custom error message
- `onDismiss` (optional): Callback when error is dismissed
- `autoDismiss` (optional): Auto-dismiss after delay (default: false)
- `autoDismissDelay` (optional): Delay in milliseconds (default: 5000)
- `variant` (optional): 'error' | 'warning' | 'info' (default: 'error')
- `showIcon` (optional): Show icon (default: true)

### InlineError

A smaller, inline error display for form fields.

**Usage:**
```jsx
import { InlineError } from "@/components/ErrorDisplay";

function FormField({ error }) {
  return (
    <div>
      <input type="text" />
      <InlineError error={error} />
    </div>
  );
}
```

## Utilities

### API Error Handler

Utility functions for handling API errors consistently.

**Location:** `utils/api-error-handler.js`

**Functions:**

#### `parseApiError(response)`
Parses an API error response and extracts error information.

```jsx
import { parseApiError } from "@/utils/api-error-handler";

const response = await fetch(url);
if (!response.ok) {
  const { message, errors, status } = await parseApiError(response);
  console.error(message, errors);
}
```

#### `handleApiError(error, options)`
Handles various types of errors (network, API, generic) with consistent formatting.

```jsx
import { handleApiError } from "@/utils/api-error-handler";

try {
  const response = await fetch(url);
  if (!response.ok) {
    throw await handleApiError(response);
  }
} catch (error) {
  // error.message, error.status, error.errors
}
```

#### `getUserFriendlyErrorMessage(error)`
Converts error objects into user-friendly messages.

```jsx
import { getUserFriendlyErrorMessage } from "@/utils/api-error-handler";

const message = getUserFriendlyErrorMessage(error);
// Returns: "Network error. Please check your connection."
```

#### `apiFetch(url, options)`
Enhanced fetch wrapper with built-in error handling.

```jsx
import { apiFetch } from "@/utils/api-error-handler";

try {
  const response = await apiFetch("/api/v1/properties", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await response.json();
} catch (error) {
  // Error is already handled and formatted
  console.error(error.message);
}
```

## Hooks

### useApiError

Custom hook for managing API error state.

**Location:** `hooks/useApiError.js`

**Usage:**
```jsx
import { useApiError } from "@/hooks/useApiError";
import { ErrorDisplay } from "@/components/ErrorDisplay";

function MyComponent() {
  const { error, isLoading, clearError, executeWithErrorHandling, getErrorMessage } = useApiError();

  const handleSubmit = async () => {
    const { data, error } = await executeWithErrorHandling(async () => {
      const response = await fetch("/api/v1/properties", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      return response.json();
    });

    if (error) {
      // Error is already set in state
      return;
    }

    // Handle success
    console.log(data);
  };

  return (
    <div>
      {error && (
        <ErrorDisplay
          error={error}
          onDismiss={clearError}
        />
      )}
      <button onClick={handleSubmit} disabled={isLoading}>
        Submit
      </button>
    </div>
  );
}
```

**Returns:**
- `error`: Current error object
- `isLoading`: Loading state
- `clearError()`: Clear the error
- `handleError(errorOrResponse)`: Handle an error manually
- `executeWithErrorHandling(asyncFn)`: Execute async function with error handling
- `getErrorMessage()`: Get user-friendly error message
- `hasError`: Boolean indicating if there's an error

## Next.js Error Handling

### error.jsx

Next.js automatically uses `app/error.jsx` to handle errors in route segments.

**Location:** `app/error.jsx`

This file handles errors that occur in the app directory and provides a fallback UI.

### global-error.jsx

Handles errors at the root level of the application.

**Location:** `app/global-error.jsx`

This file catches errors that occur in the root layout.

## Best Practices

### 1. Use Error Boundaries for Component Isolation

Wrap major sections or features in error boundaries to prevent one error from crashing the entire app:

```jsx
<ErrorBoundary>
  <FeatureSection />
</ErrorBoundary>
```

### 2. Handle API Errors Consistently

Always use the error handling utilities for API calls:

```jsx
import { handleApiError, getUserFriendlyErrorMessage } from "@/utils/api-error-handler";

try {
  const response = await fetch(url);
  if (!response.ok) {
    throw await handleApiError(response);
  }
} catch (error) {
  const message = getUserFriendlyErrorMessage(error);
  // Display to user
}
```

### 3. Provide User-Friendly Messages

Always show clear, actionable error messages:

```jsx
<ErrorDisplay
  error={error}
  message={getUserFriendlyErrorMessage(error)}
/>
```

### 4. Log Errors in Development

Errors are automatically logged to the console in development mode. In production, you can integrate with error tracking services:

```jsx
if (process.env.NODE_ENV === "production") {
  // logErrorToService(error, errorInfo);
}
```

### 5. Handle Network Errors Gracefully

Network errors should provide clear feedback:

```jsx
if (error.name === "NetworkError") {
  return "Unable to connect. Please check your internet connection.";
}
```

## Error Types

### Network Errors
- **Name:** `NetworkError`
- **Message:** "Network error. Please check your connection."
- **Common Causes:** No internet, server unreachable, CORS issues

### API Errors
- **Name:** `ApiError`
- **Properties:** `status`, `errors`, `data`
- **Common Status Codes:**
  - `401`: Unauthorized - User needs to log in
  - `403`: Forbidden - User doesn't have permission
  - `404`: Not Found - Resource doesn't exist
  - `422`: Validation Error - Invalid input data
  - `429`: Too Many Requests - Rate limit exceeded
  - `500`: Server Error - Internal server error
  - `503`: Service Unavailable - Service temporarily down

### Validation Errors
- **Format:** Object with field names as keys and error messages as values
- **Example:**
```json
{
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

## Examples

### Form with Error Handling

```jsx
"use client";

import { useState } from "react";
import { useApiError } from "@/hooks/useApiError";
import { ErrorDisplay, InlineError } from "@/components/ErrorDisplay";

export default function PropertyForm() {
  const { error, executeWithErrorHandling, clearError } = useApiError();
  const [formData, setFormData] = useState({ name: "", address: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setFieldErrors({});

    const { data, error: submitError } = await executeWithErrorHandling(async () => {
      const response = await fetch("/api/v1/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw response;
      }

      return response.json();
    });

    if (submitError) {
      if (submitError.status === 422 && submitError.errors) {
        setFieldErrors(submitError.errors);
      }
      return;
    }

    // Success
    console.log("Property created:", data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <ErrorDisplay
          error={error}
          onDismiss={clearError}
        />
      )}

      <div>
        <label>Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <InlineError error={fieldErrors.name} />
      </div>

      <div>
        <label>Address</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
        <InlineError error={fieldErrors.address} />
      </div>

      <button type="submit">Create Property</button>
    </form>
  );
}
```

### API Call with Error Handling

```jsx
import { apiFetch, getUserFriendlyErrorMessage } from "@/utils/api-error-handler";
import { ErrorDisplay } from "@/components/ErrorDisplay";

async function fetchProperties() {
  try {
    const response = await apiFetch("/api/v1/properties");
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    const message = getUserFriendlyErrorMessage(error);
    return { data: null, error: { ...error, message } };
  }
}
```

## Testing Error Handling

When testing error scenarios:

1. **Network Errors:** Disable network in browser DevTools
2. **API Errors:** Use invalid data or mock error responses
3. **Component Errors:** Throw errors in components to test error boundaries

## Production Considerations

1. **Error Logging:** Integrate with error tracking services (Sentry, LogRocket, etc.)
2. **User Feedback:** Always provide clear, actionable error messages
3. **Error Recovery:** Provide ways for users to recover from errors (retry, go back, etc.)
4. **Monitoring:** Monitor error rates and types in production

---

**Last Updated:** 2024-01-01

