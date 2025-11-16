import {
  TrendingUp,
  Home as HomeIcon,
  Users,
  Wallet,
  Calendar,
  Wrench,
} from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="badge">
            <TrendingUp size={14} />
            +8.4% vs last month
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">
            Dashboard Overview
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Track occupancy, revenue, and maintenance workstreams across the
            Maldives portfolio. Insights update in real-time as your team works.
          </p>
        </div>
        <div className="grid gap-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            92% occupancy across live leases
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-warning" />
            4 invoices due this week
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-danger" />
            2 urgent maintenance tickets open
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={HomeIcon}
          title="Active Properties"
          value="18"
          subtitle="5 in Malé · 13 in Addu"
        />
        <StatCard
          icon={Users}
          title="Current Tenants"
          value="126"
          subtitle="6 move-ins scheduled"
        />
        <StatCard
          icon={Wallet}
          title="Rent Collected (MVR)"
          value="1,284,500"
          subtitle="USD 83,400"
        />
        <StatCard
          icon={Calendar}
          title="Upcoming Renewals"
          value="11"
          subtitle="Next 30 days"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Maintenance Queue
              </h3>
              <p className="text-xs text-slate-500">
                Prioritised by impact and SLA
              </p>
            </div>
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
              View all
            </button>
          </header>

          <ul className="space-y-3 text-sm text-slate-600">
            {[
              {
                title: "HVAC service - Lagoon Plaza",
                meta: "Scheduled with ChillAir technicians",
                status: "In progress",
              },
              {
                title: "Water leak - Coral View Apt 304",
                meta: "Owner approval received · Tenant notified",
                status: "Awaiting parts",
              },
              {
                title: "Generator inspection - Reef Offices",
                meta: "Repeat maintenance · Last done 180 days ago",
                status: "Due Monday",
              },
            ].map((item) => (
              <li
                key={item.title}
                className="flex items-start justify-between rounded-xl border border-slate-200/60 bg-slate-50/80 px-3 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.meta}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card space-y-4">
          <header className="flex items-center gap-3">
            <Wrench className="h-9 w-9 rounded-full bg-primary/10 p-2 text-primary" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Rent Collection Snapshot
              </h3>
              <p className="text-xs text-slate-500">
                Maldives Rufiyaa converted to US Dollar for reporting.
              </p>
            </div>
          </header>

          <div className="grid gap-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-3">
              <div>
                <p className="text-xs text-slate-500">Collected this month</p>
                <p className="text-lg font-semibold text-slate-900">
                  MVR 1,284,500
                </p>
              </div>
              <span className="badge">USD 83,400</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-3">
              <div>
                <p className="text-xs text-slate-500">Outstanding</p>
                <p className="text-lg font-semibold text-warning">
                  MVR 112,300
                </p>
              </div>
              <p className="text-xs text-slate-500">4 invoices due in 7 days</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-3">
              <div>
                <p className="text-xs text-slate-500">Security deposits held</p>
                <p className="text-lg font-semibold text-slate-900">
                  MVR 860,000
                </p>
              </div>
              <p className="text-xs text-slate-500">12 refunds processing</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtitle }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon size={20} />
        </div>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {title}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

