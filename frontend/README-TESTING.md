# Testing Guide

This project uses **Jest** and **React Testing Library** for frontend testing.

## Setup

Install dependencies:

```bash
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
frontend/
├── __tests__/
│   ├── components/       # Component tests
│   ├── hooks/            # Hook tests
│   └── utils/            # Test utilities
├── jest.config.js        # Jest configuration
└── jest.setup.js         # Test setup and mocks
```

## Writing Tests

### Component Tests

```jsx
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Hook Tests

```jsx
import { renderHook, waitFor } from '@testing-library/react'
import { useMyHook } from '@/hooks/useMyHook'

describe('useMyHook', () => {
  it('returns expected data', async () => {
    const { result } = renderHook(() => useMyHook())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(result.current.data).toBeDefined()
  })
})
```

## Test Utilities

The `__tests__/utils/test-utils.jsx` file provides:

- `renderWithProviders` - Custom render function with providers
- `createMockResponse` - Helper to create mock API responses
- `mockFetch` - Helper to mock fetch calls
- `waitForAsync` - Helper to wait for async updates

## Mocking

### Next.js Router

The router is automatically mocked in `jest.setup.js`:

```jsx
import { useRouter } from 'next/navigation'

// In your component
const router = useRouter()
router.push('/some-path') // Mocked, won't actually navigate
```

### localStorage

localStorage is automatically mocked:

```jsx
localStorage.setItem('key', 'value')
localStorage.getItem('key') // Returns 'value'
```

### Fetch API

Mock fetch in your tests:

```jsx
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ data: [] }),
  })
)
```

## Coverage

Coverage thresholds are set to 50% for:
- Branches
- Functions
- Lines
- Statements

View coverage reports in the `coverage/` directory after running `npm run test:coverage`.

## Best Practices

1. **Test user behavior, not implementation details**
   - Focus on what users see and interact with
   - Avoid testing internal state or methods

2. **Use semantic queries**
   - Prefer `getByRole`, `getByLabelText`, `getByText`
   - Avoid `getByTestId` unless necessary

3. **Test async behavior**
   - Use `waitFor` for async operations
   - Use `findBy*` queries for elements that appear asynchronously

4. **Keep tests isolated**
   - Each test should be independent
   - Clean up between tests (mocks, state, etc.)

5. **Write descriptive test names**
   - Test names should clearly describe what is being tested
   - Use `it('should...')` or `it('renders...')` format

