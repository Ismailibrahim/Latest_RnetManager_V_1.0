import { render, screen, within } from '@testing-library/react'
import { DataDisplay } from '@/components/DataDisplay'

describe('DataDisplay', () => {
  const mockData = [
    { id: 1, name: 'Item 1', status: 'active', amount: 100 },
    { id: 2, name: 'Item 2', status: 'inactive', amount: 200 },
  ]

  const mockColumns = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'amount', label: 'Amount' },
  ]

  beforeEach(() => {
    // Mock window.innerWidth for responsive behavior
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024, // Desktop width
    })
  })

  it('renders loading state', () => {
    render(
      <DataDisplay
        data={[]}
        loading={true}
        loadingMessage="Loading data..."
        columns={mockColumns}
      />
    )

    expect(screen.getByText('Loading data...')).toBeInTheDocument()
  })

  it('renders empty state', () => {
    render(
      <DataDisplay
        data={[]}
        loading={false}
        emptyMessage="No data available"
        columns={mockColumns}
      />
    )

    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders table view on desktop', () => {
    window.innerWidth = 1024

    render(
      <DataDisplay
        data={mockData}
        loading={false}
        columns={mockColumns}
      />
    )

    // Check for table headers
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()

    // Check for table data
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('renders card view on mobile', () => {
    window.innerWidth = 600

    render(
      <DataDisplay
        data={mockData}
        loading={false}
        columns={mockColumns}
      />
    )

    // On mobile, should render cards (not table headers)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('calls onRowClick when row is clicked', () => {
    const handleRowClick = jest.fn()
    window.innerWidth = 1024

    render(
      <DataDisplay
        data={mockData}
        loading={false}
        columns={mockColumns}
        onRowClick={handleRowClick}
      />
    )

    // Find and click a row
    const row = screen.getByText('Item 1').closest('tr')
    if (row) {
      row.click()
      expect(handleRowClick).toHaveBeenCalledWith(mockData[0])
    }
  })

  it('renders custom card when renderCard is provided', () => {
    window.innerWidth = 600

    const CustomCard = ({ item }) => (
      <div data-testid={`custom-card-${item.id}`}>
        Custom: {item.name}
      </div>
    )

    render(
      <DataDisplay
        data={mockData}
        loading={false}
        columns={mockColumns}
        renderCard={(item) => <CustomCard item={item} />}
      />
    )

    expect(screen.getByTestId('custom-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('custom-card-2')).toBeInTheDocument()
    expect(screen.getByText('Custom: Item 1')).toBeInTheDocument()
  })

  it('renders custom column render functions', () => {
    window.innerWidth = 1024

    const columnsWithRender = [
      {
        key: 'name',
        label: 'Name',
        render: (value) => <strong>{value.toUpperCase()}</strong>,
      },
      { key: 'amount', label: 'Amount' },
    ]

    render(
      <DataDisplay
        data={mockData}
        loading={false}
        columns={columnsWithRender}
      />
    )

    expect(screen.getByText('ITEM 1')).toBeInTheDocument()
  })
})

