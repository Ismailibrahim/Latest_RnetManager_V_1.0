"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Building2,
  Home,
  Users,
  Users2,
  Layers,
  Wallet,
  Wrench,
  Boxes,
  Layers3,
  Bell,
  Settings,
  Receipt,
  ClipboardPlus,
  ShieldCheck,
  CreditCard,
  FileText,
  CircleDollarSign,
  LineChart,
  BarChart,
} from "lucide-react";
import clsx from "clsx";

const navigation = [
  { name: "Overview", href: "/", icon: Home },
  { name: "Snapshot", href: "/snapshot", icon: LineChart },
  { name: "Properties", href: "/properties", icon: Building2 },
  { name: "Units", href: "/units", icon: Layers },
  { name: "Owners", href: "/owners", icon: Users2 },
  { name: "Tenants", href: "/tenants", icon: Users2 },
  { name: "Tenant Assignments", href: "/tenant-units", icon: FileText },
  { name: "Finances", href: "/finances", icon: Wallet },
  { name: "Collect Payment", href: "/payments/collect", icon: CircleDollarSign },
  { name: "Unified Payments", href: "/unified-payments", icon: ArrowLeftRight },
  { name: "Rent Invoices", href: "/rent-invoices", icon: Receipt },
  { name: "Deposit Refunds", href: "/security-deposit-refunds", icon: ShieldCheck },
  { name: "Payment Methods", href: "/payment-methods", icon: CreditCard },
  { name: "Maintenance Expenses", href: "/maintenance", icon: Wrench },
  { name: "Maintenance Invoices", href: "/maintenance-invoices", icon: ClipboardPlus },
  { name: "Assets", href: "/assets", icon: Boxes },
  { name: "Asset Types", href: "/asset-types", icon: Layers3 },
  { name: "Vendors", href: "/vendors", icon: ShieldCheck },
  { name: "Reports", href: "/reports", icon: BarChart },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ onNavigate }) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <aside className="flex min-h-screen flex-col overflow-y-auto border-r border-slate-200 bg-white px-5 py-6 text-slate-700 shadow-sm">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-semibold shadow">
          RA
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            RENTAPPLICATION
          </p>
          <p className="text-sm font-semibold text-slate-900">
            Management Suite
          </p>
        </div>
      </div>

      <nav className="space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={clsx(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon
                size={18}
                className={clsx(
                  "transition-colors",
                  active ? "text-primary" : "text-slate-400 group-hover:text-slate-900"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Need more capacity?</p>
        <p className="mt-1 text-xs text-slate-500">
          Upgrade to the Enterprise tier to unlock unlimited properties and
          advanced analytics.
        </p>
        <Link
          href="/settings/billing"
          onClick={handleLinkClick}
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white"
        >
          Manage Subscription
        </Link>
      </div>
    </aside>
  );
}

