import { renderHook, waitFor } from '@testing-library/react'
import { usePaymentMethods, formatPaymentMethodLabel } from '@/hooks/usePaymentMethods'

// Mock fetch globally
global.fetch = jest.fn()

describe('usePaymentMethods', () => {
  beforeEach(() => {
    fetch.mockClear()
    localStorage.clear()
    localStorage.setItem('auth_token', 'test-token')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('formats payment method labels correctly', () => {
    expect(formatPaymentMethodLabel('bank_transfer')).toBe('Bank Transfer')
    expect(formatPaymentMethodLabel('credit_card')).toBe('Credit Card')
    expect(formatPaymentMethodLabel('cash')).toBe('Cash')
    expect(formatPaymentMethodLabel('')).toBe('')
    expect(formatPaymentMethodLabel(null)).toBe('')
    expect(formatPaymentMethodLabel(undefined)).toBe('')
  })

  it('fetches payment methods on mount', async () => {
    const mockMethods = [
      { id: 1, name: 'bank_transfer', is_active: true, sort_order: 1 },
      { id: 2, name: 'credit_card', is_active: true, sort_order: 2 },
    ]

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMethods }),
    })

    const { result } = renderHook(() => usePaymentMethods({ onlyActive: true }))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.methods).toEqual(mockMethods)
    expect(result.current.error).toBe(null)
  })

  it('handles fetch errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => usePaymentMethods())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.methods).toEqual([])
  })

  it('handles API errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    })

    const { result } = renderHook(() => usePaymentMethods())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('filters active methods when onlyActive is true', async () => {
    const mockMethods = [
      { id: 1, name: 'bank_transfer', is_active: true, sort_order: 1 },
      { id: 2, name: 'credit_card', is_active: false, sort_order: 2 },
      { id: 3, name: 'cash', is_active: true, sort_order: 3 },
    ]

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMethods }),
    })

    const { result } = renderHook(() => usePaymentMethods({ onlyActive: true }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Check that the URL includes only_active parameter
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('only_active=1'),
      expect.any(Object)
    )
  })

  it('includes all methods when onlyActive is false', async () => {
    const mockMethods = [
      { id: 1, name: 'bank_transfer', is_active: true, sort_order: 1 },
      { id: 2, name: 'credit_card', is_active: false, sort_order: 2 },
    ]

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMethods }),
    })

    const { result } = renderHook(() => usePaymentMethods({ onlyActive: false }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Check that the URL does not include only_active parameter
    expect(fetch).toHaveBeenCalledWith(
      expect.not.stringContaining('only_active'),
      expect.any(Object)
    )
  })

  it('provides formatted options', async () => {
    const mockMethods = [
      { id: 1, name: 'bank_transfer', is_active: true, sort_order: 1 },
      { id: 2, name: 'credit_card', is_active: true, sort_order: 2 },
    ]

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMethods }),
    })

    const { result } = renderHook(() => usePaymentMethods())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.options).toHaveLength(2)
    expect(result.current.options[0]).toEqual({
      value: 'bank_transfer',
      label: 'Bank Transfer',
      data: mockMethods[0],
    })
    expect(result.current.options[1]).toEqual({
      value: 'credit_card',
      label: 'Credit Card',
      data: mockMethods[1],
    })
  })

  it('provides payment method labels', async () => {
    const mockMethods = [
      { id: 1, name: 'bank_transfer', is_active: true, sort_order: 1 },
      { id: 2, name: 'credit_card', is_active: true, sort_order: 2 },
    ]

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMethods }),
    })

    const { result } = renderHook(() => usePaymentMethods())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // labels is a Map, so use .get() method
    expect(result.current.labels.get('bank_transfer')).toBe('Bank Transfer')
    expect(result.current.labels.get('credit_card')).toBe('Credit Card')
  })

  it('refreshes data when refresh is called', async () => {
    const mockMethods = [
      { id: 1, name: 'bank_transfer', is_active: true, sort_order: 1 },
    ]

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockMethods }),
    })

    const { result } = renderHook(() => usePaymentMethods())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(fetch).toHaveBeenCalledTimes(1)

    result.current.refresh()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

