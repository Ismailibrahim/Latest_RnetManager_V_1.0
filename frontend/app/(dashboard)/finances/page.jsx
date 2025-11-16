import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock4,
  FileText,
  LineChart,
  PieChart,
  Receipt,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

const summaryCards = [
  {
    title: "Collected this month",
    value: "MVR 1,240,800",
    change: "+8.5% vs Oct",
    icon: Banknote,
    tone: "success",
  },
  {
    title: "Still outstanding",
    value: "MVR 184,200",
    change: "12 leases · ageing 18d",
    icon: Clock4,
    tone: "warning",
  },
  {
    title: "Total maintenance cost (this month)",
    value: "MVR 712,400",
    change: "62% of monthly budget",
    icon: PieChart,
    tone: "info",
  },
];

const rentInvoices = [
  {
    invoice: "INV-231104",
    tenant: "Ocean Villas · Unit 12B",
    property: "Ocean Villas",
    due: "10 Nov",
    status: "paid",
    amount: "MVR 96,000",
    balance: "Paid",
    channel: "ACH · Bank of Maldives",
  },
  {
    invoice: "INV-231097",
    tenant: "Lagoon Plaza · Apt 702",
    property: "Lagoon Plaza",
    due: "08 Nov",
    status: "partial",
    amount: "MVR 82,500",
    balance: "MVR 18,500 open",
    channel: "Card · Visa • 8821",
  },
  {
    invoice: "INV-231095",
    tenant: "Coral View · 304",
    property: "Coral View Residences",
    due: "05 Nov",
    status: "overdue",
    amount: "MVR 56,900",
    balance: "7 days past due",
    channel: "Awaiting transfer",
  },
  {
    invoice: "INV-231090",
    tenant: "Reef Offices · Lvl 9",
    property: "Reef Offices",
    due: "03 Nov",
    status: "paid",
    amount: "MVR 128,400",
    balance: "Paid",
    channel: "Standing order",
  },
  {
    invoice: "INV-231081",
    tenant: "Pearl Condos · PH-2",
    property: "Pearl Condos",
    due: "01 Nov",
    status: "dispute",
    amount: "MVR 71,200",
    balance: "Tenant raised dispute",
    channel: "In review",
  },
];

const ageingBuckets = [
  {
    label: "Current (< 5d)",
    amount: "MVR 92,400",
    leases: 6,
    tone: "success",
  },
  {
    label: "Day 6 - 15",
    amount: "MVR 54,300",
    leases: 4,
    tone: "warning",
  },
  {
    label: "Day 16 - 30",
    amount: "MVR 26,400",
    leases: 2,
    tone: "danger",
  },
  {
    label: "30+ days",
    amount: "MVR 11,100",
    leases: 1,
    tone: "danger",
  },
];

const collectionNotes = [
  {
    label: "Lagoon Plaza · Apt 702",
    comment: "Partial payment posted. Send balance reminder before 12 Nov.",
    owner: "Assigned to: Aishath",
    icon: CircleDollarSign,
  },
  {
    label: "Coral View · 304",
    comment: "Tenant requested 3-day extension. Follow up on 09 Nov.",
    owner: "Assigned to: Ibrahim",
    icon: Clock4,
  },
  {
    label: "Pearl Condos · PH-2",
    comment: "Dispute on utility reconciliation. Finance reviewing offsets.",
    owner: "Assigned to: Mariyam",
    icon: FileText,
  },
];

const renewalAlerts = [
  {
    lease: "Ocean Villas · Unit 8C",
    tenant: "Emmen Resorts Pvt",
    renewalDate: "Renewal on 01 Dec",
    action: "Send 8% uplift notice",
  },
  {
    lease: "Reef Offices · Lvl 5",
    tenant: "Blue Horizon Legal",
    renewalDate: "Renewal on 15 Dec",
    action: "Draft 2-year extension",
  },
  {
    lease: "Lagoon Plaza · Apt 1203",
    tenant: "Saeed & Fathimath",
    renewalDate: "Option window closes 22 Nov",
    action: "Confirm new deposit terms",
  },
];

const cashFlowEvents = [
  {
    date: "11 Nov",
    label: "Facility loan repayment",
    amount: "− MVR 210,000",
    detail: "BML floating facility · Q4 principal + interest",
    tone: "outgoing",
  },
  {
    date: "09 Nov",
    label: "Bulk rent sweep",
    amount: "+ MVR 420,000",
    detail: "Standing order · Reef Offices tenants",
    tone: "incoming",
  },
  {
    date: "07 Nov",
    label: "Vendor payout · EnergyGrid",
    amount: "− MVR 86,400",
    detail: "Generator overhaul · Reef Offices L9",
    tone: "outgoing",
  },
  {
    date: "05 Nov",
    label: "Security deposit top-up",
    amount: "+ MVR 35,000",
    detail: "Pearl Condos · PH-2 adjustment",
    tone: "incoming",
  },
];

const expensePlan = [
  {
    category: "Facilities & maintenance",
    allocated: "MVR 380,000",
    spentPercent: 68,
    tone: "primary",
  },
  {
    category: "Utilities",
    allocated: "MVR 210,000",
    spentPercent: 54,
    tone: "info",
  },
  {
    category: "Insurance & compliance",
    allocated: "MVR 160,000",
    spentPercent: 42,
    tone: "success",
  },
  {
    category: "Capital improvements",
    allocated: "MVR 520,000",
    spentPercent: 28,
    tone: "muted",
  },
];

export default function FinancesPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Portfolio cash insights
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Wallet size={24} className="text-primary" />
            Finances
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Track collections, cash flow, and upcoming renewals across the
            portfolio. Figures refresh with the nightly accounting sync from the
            property management system.
          </p>
        </div>

      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid gap-4">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Rent collection pipeline
              </h2>
              <p className="text-xs text-slate-500">
                Invoices synced from accounting · auto-reconciled every 15 minutes.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Receipt size={14} />
              {rentInvoices.length} invoices
            </span>
          </header>

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] table-auto border-collapse text-sm text-slate-700">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-semibold">Invoice</th>
                  <th className="px-3 py-2 font-semibold">Tenant / Unit</th>
                  <th className="px-3 py-2 font-semibold">Due</th>
                  <th className="px-3 py-2 font-semibold">Amount</th>
                  <th className="px-3 py-2 font-semibold">Balance</th>
                  <th className="px-3 py-2 font-semibold">Channel</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rentInvoices.map((invoice) => (
                  <tr key={invoice.invoice} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900">
                      {invoice.invoice}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {invoice.tenant}
                        </span>
                        <span className="text-xs text-slate-500">
                          {invoice.property}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {invoice.due}
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold text-slate-900">
                      {invoice.amount}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {invoice.balance}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {invoice.channel}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-9 w-9 rounded-full bg-sky-100 p-2 text-sky-600" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Upcoming renewals
              </h2>
              <p className="text-xs text-slate-500">
                Automatic reminders issue 45 days before renewal.
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {renewalAlerts.map((alert) => (
              <li
                key={alert.lease}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{alert.lease}</p>
                    <p className="text-xs text-slate-500">{alert.tenant}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <ArrowUpRight size={14} />
                    {alert.renewalDate}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{alert.action}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-9 w-9 rounded-full bg-emerald-100 p-2 text-emerald-600" />
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Cash flow tracker
                </h3>
                <p className="text-xs text-slate-500">
                  Major inflows and outflows for the current week.
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              {cashFlowEvents.map((event) => (
                <li
                  key={`${event.date}-${event.label}`}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {event.date}
                    </p>
                    <span className={eventTone(event.tone)}>{event.amount}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {event.label}
                  </p>
                  <p className="text-xs text-slate-500">{event.detail}</p>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>
    </div>
  );
}

function SummaryCard({ title, value, change, icon: Icon, tone = "default" }) {
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-slate-200 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${summaryTone(
        tone,
      )}`}
    >
      <div className="flex items-center justify-between">
        <div className="rounded-full bg-white/70 p-2 text-primary shadow-sm">
          <Icon size={18} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-3xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs font-medium text-slate-500">{change}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    paid: {
      label: "Paid",
      className: "bg-emerald-100 text-emerald-600",
      icon: CheckCircle2,
    },
    overdue: {
      label: "Overdue",
      className: "bg-red-100 text-red-600",
      icon: AlertTriangle,
    },
    partial: {
      label: "Partial",
      className: "bg-amber-100 text-amber-700",
      icon: CircleDollarSign,
    },
    dispute: {
      label: "In dispute",
      className: "bg-slate-200 text-slate-700",
      icon: FileText,
    },
    default: {
      label: "Pending",
      className: "bg-primary/10 text-primary",
      icon: Receipt,
    },
  };

  const tone = config[status] ?? config.default;
  const Icon = tone.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone.className}`}
    >
      <Icon size={12} />
      {tone.label}
    </span>
  );
}

function ageingTone(tone) {
  const mapping = {
    success:
      "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600",
    warning:
      "inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700",
    danger:
      "inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600",
  };

  return mapping[tone] ?? mapping.success;
}

function eventTone(tone) {
  const mapping = {
    incoming:
      "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600",
    outgoing:
      "inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600",
  };

  return mapping[tone] ?? mapping.incoming;
}

function progressTone(tone) {
  const mapping = {
    primary: "bg-primary",
    info: "bg-sky-500",
    success: "bg-emerald-500",
    muted: "bg-slate-400",
  };

  return mapping[tone] ?? mapping.primary;
}

function summaryTone(tone) {
  const mapping = {
    default: "bg-white/80",
    success: "bg-emerald-50/90",
    warning: "bg-amber-50/90",
    danger: "bg-red-50/90",
    info: "bg-sky-50/90",
  };

  return mapping[tone] ?? mapping.default;
}


