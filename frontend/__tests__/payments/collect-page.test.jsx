import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CollectPaymentPage from "@/app/(dashboard)/payments/collect/page";
import * as unifiedPaymentsHook from "@/hooks/useUnifiedPayments";
import * as tenantUnitsHook from "@/hooks/useTenantUnits";
import * as paymentTemplatesHook from "@/hooks/usePaymentTemplates";
import { useRouter } from "next/navigation";

jest.mock("@/hooks/useUnifiedPayments");
jest.mock("@/hooks/useTenantUnits");
jest.mock("@/hooks/usePaymentTemplates");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

function mockLocalStorage() {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] ?? null),
    setItem: jest.fn((key, value) => {
      store[key] = value?.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
}

const DEFAULT_TENANT_UNITS = [
  {
    id: 42,
    status: "active",
    tenant: { full_name: "John Doe" },
    unit: { unit_number: "A-101", property: { name: "Sunset Villas" } },
  },
];

function setupUnifiedPaymentsHook(overrides = {}) {
  unifiedPaymentsHook.useUnifiedPayments.mockReturnValue({
    createPayment: jest.fn().mockResolvedValue({
      composite_id: "unified_payment_entry:1",
      reference_number: "INV-123",
    }),
    loading: false,
    error: null,
    ...overrides,
  });
}

function setupTenantUnitsHook(overrides = {}) {
  tenantUnitsHook.useTenantUnits.mockReturnValue({
    units: DEFAULT_TENANT_UNITS,
    loading: false,
    error: null,
    refresh: jest.fn(),
    ...overrides,
  });
}

function setupPaymentTemplatesHook(overrides = {}) {
  paymentTemplatesHook.usePaymentTemplates.mockReturnValue({
    templates: [],
    saveTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    ...overrides,
  });
}

describe("CollectPaymentPage", () => {
  let localStorageMock;

  beforeEach(() => {
    setupUnifiedPaymentsHook();
    setupTenantUnitsHook();
    setupPaymentTemplatesHook();
    useRouter.mockReturnValue({
      push: jest.fn(),
    });
    localStorageMock = mockLocalStorage();
    localStorageMock.getItem.mockReturnValue("test-token");
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: undefined,
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it("renders step indicator and type selection", () => {
    render(<CollectPaymentPage />);

    expect(
      screen.getByText("Choose payment type", { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByText("Unified payment collection")).toBeInTheDocument();
  });

  it("validates type selection before proceeding", () => {
    render(<CollectPaymentPage />);

    fireEvent.click(screen.getByRole("button", { name: /review payment/i }));

    expect(
      screen.getByText(/Please choose a payment type to continue/i)
    ).toBeInTheDocument();
  });

  it("walks through the flow and submits payment", async () => {
    const createPayment = jest
      .fn()
      .mockResolvedValue({ composite_id: "unified_payment_entry:15" });

    setupUnifiedPaymentsHook({ createPayment });

    render(<CollectPaymentPage />);

    fireEvent.click(screen.getByRole("button", { name: /Rent/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /John Doe/i })
    );

    fireEvent.change(screen.getByLabelText(/^Amount/i), {
      target: { value: "2500" },
    });

    fireEvent.change(screen.getByLabelText(/^Currency/i), {
      target: { value: "AED" },
    });

    fireEvent.change(screen.getByLabelText(/Transaction date/i), {
      target: { value: "2025-12-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Review payment/i }));

    expect(
      screen.getByText(/Review payment details/i)
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Confirm & create payment/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Payment created successfully/i)
      ).toBeInTheDocument();
    });

    expect(createPayment).toHaveBeenCalledWith({
      payment_type: "rent",
      tenant_unit_id: 42,
      amount: 2500,
      currency: "AED",
      description: null,
      due_date: null,
      transaction_date: "2025-12-01",
      status: "pending",
      payment_method: null,
      reference_number: null,
      metadata: {},
    });
  });

  it("applies a saved template to the form", () => {
    setupPaymentTemplatesHook({
      templates: [
        {
          id: "tpl-1",
          name: "Standard rent",
          payment_type: "rent",
          amount: 1500,
          currency: "USD",
          payment_method: "bank_transfer",
          description: "Monthly rent",
        },
      ],
    });

    render(<CollectPaymentPage />);

    fireEvent.click(screen.getByRole("button", { name: /Rent/i }));

    fireEvent.click(screen.getByRole("button", { name: /John Doe/i }));

    fireEvent.click(screen.getByRole("button", { name: /Apply/i }));

    expect(screen.getByLabelText(/^Amount/i)).toHaveValue("1500");
    expect(screen.getByLabelText(/^Currency/i)).toHaveValue("USD");
    expect(
      screen.getByLabelText(/^Payment method/i)
    ).toHaveValue("bank_transfer");
  });

  it("shows backend validation errors", async () => {
    const createPayment = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("Validation failed"), {
          details: { amount: ["Amount is invalid"] },
        })
      );

    setupUnifiedPaymentsHook({ createPayment });

    render(<CollectPaymentPage />);

    fireEvent.click(screen.getByRole("button", { name: /Other income/i }));

    fireEvent.change(screen.getByLabelText(/^Amount/i), {
      target: { value: "0" },
    });

    fireEvent.change(screen.getByLabelText(/^Currency/i), {
      target: { value: "USD" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Review payment/i }));

    fireEvent.click(
      screen.getByRole("button", { name: /Confirm & create payment/i })
    );

    await waitFor(() => {
      expect(createPayment).toHaveBeenCalled();
    });

    expect(
      screen.getByText(/Amount is invalid/i)
    ).toBeInTheDocument();
  });

  it("supports adding multiple payments to the batch", async () => {
    const createPayment = jest
      .fn()
      .mockResolvedValue({ composite_id: "unified_payment_entry:21" });

    setupUnifiedPaymentsHook({ createPayment });

    render(<CollectPaymentPage />);

    fireEvent.click(screen.getByRole("button", { name: /Rent/i }));
    fireEvent.click(screen.getByRole("button", { name: /John Doe/i }));
    fireEvent.change(screen.getByLabelText(/^Amount/i), {
      target: { value: "1500" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Add current payment to batch/i })
    );

    expect(screen.getByText(/Batch queue \(1\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /John Doe/i }));
    fireEvent.change(screen.getByLabelText(/^Amount/i), {
      target: { value: "1750" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Add current payment to batch/i })
    );

    expect(screen.getByText(/Batch queue \(2\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Review payment/i }));

    fireEvent.click(
      screen.getByRole("button", { name: /Confirm & create payments/i })
    );

    await waitFor(() => {
      expect(createPayment).toHaveBeenCalledTimes(2);
    });
  });
});


