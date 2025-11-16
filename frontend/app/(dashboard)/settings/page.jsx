"use client";

import Link from "next/link";
import {
  CreditCard,
  Mail,
  MessageSquare,
  MessageCircle,
  Settings2,
  ShieldCheck,
  UserRound,
  Upload,
} from "lucide-react";

const sections = [
  {
    href: "/settings/account",
    title: "Account & Profile",
    description:
      "Update your personal information, manage delegates, and secure your login.",
    icon: UserRound,
    badge: "Profile",
  },
  {
    href: "/settings/billing",
    title: "Billing & Subscription",
    description:
      "Review your subscription plan, usage, invoices, and billing contacts.",
    icon: CreditCard,
    badge: "Subscription",
  },
  {
    href: "/settings/system",
    title: "System Configuration",
    description:
      "Configure company information, currency, invoice numbering, and system preferences.",
    icon: Settings2,
    badge: "Business",
  },
  {
    href: "/settings/email",
    title: "Email Notifications",
    description:
      "Configure email provider settings (Gmail/Office 365) and manage email templates.",
    icon: Mail,
    badge: "Notifications",
  },
  {
    href: "/settings/sms",
    title: "SMS Notifications",
    description:
      "Configure Message Owl SMS settings and manage SMS notification templates.",
    icon: MessageSquare,
    badge: "Notifications",
  },
  {
    href: "/settings/telegram",
    title: "Telegram Notifications",
    description:
      "Configure Telegram Bot API settings and manage Telegram notification templates.",
    icon: MessageCircle,
    badge: "Notifications",
  },
  {
    href: "/settings/import",
    title: "Data Import",
    description:
      "Import units, tenants, and other data in bulk using CSV files. Download templates to get started.",
    icon: Upload,
    badge: "Data",
  },
];

const quickActions = [
  {
    label: "Update password",
    href: "/settings/account#security",
  },
  {
    label: "Invite a delegate",
    href: "/settings/account#delegates",
  },
  {
    label: "View latest invoice",
    href: "/settings/billing#history",
  },
];

export default function SettingsIndexPage() {
  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="badge">
            <Settings2 size={14} />
            Settings
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Control Center
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Manage your RentApplicaiton workspace — keep your account details up
            to date, invite team members, configure system settings, and stay on top of subscription
            billing.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Compliance ready — all settings changes are automatically logged.
          </div>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Last review completed on 05 Nov 2025.
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="card group flex flex-col gap-4 transition hover:border-primary/30 hover:shadow-lg"
            >
              <header className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary transition group-hover:bg-primary/15">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="badge">{section.badge}</div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {section.title}
                  </h2>
                </div>
              </header>
              <p className="text-sm text-slate-600">{section.description}</p>
              <span className="text-sm font-semibold text-primary">
                Open {section.title.toLowerCase()} →
              </span>
            </Link>
          );
        })}
      </section>

      <section className="card space-y-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-slate-900">
            Quick actions
          </h2>
          <p className="text-xs text-slate-500">
            Shortcuts to the most common settings workflows.
          </p>
        </header>
        <div className="flex flex-wrap gap-2 text-sm">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}


