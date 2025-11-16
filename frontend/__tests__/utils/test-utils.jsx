import { render } from '@testing-library/react'
import { jest } from '@jest/globals'

// Re-export everything from React Testing Library
export * from '@testing-library/react'

// Create a custom render function that includes any providers
export function renderWithProviders(ui, { ...renderOptions } = {}) {
  // Add any providers here if needed (e.g., ThemeProvider, RouterProvider, etc.)
  return render(ui, { ...renderOptions })
}

// Helper to create mock API responses
export function createMockResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ data }),
  }
}

// Helper to mock fetch
export function mockFetch(data, status = 200) {
  global.fetch = jest.fn(() =>
    Promise.resolve(createMockResponse(data, status))
  )
}

// Helper to wait for async updates
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

