"use client";

import { useEffect, useState } from "react";
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
  FileText,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";

const sections = [
  {
    href: "/settings/account",
    title: "Account & Profile",
    description:
      "Update your personal information, manage delegates, and secure your login.",
    icon: UserRound,
    badge: "Profile",
    tenantVisible: true,
  },
  {
    href: "/settings/billing",
    title: "Billing & Subscription",
    description:
      "Review your subscription plan, usage, invoices, and billing contacts.",
    icon: CreditCard,
    badge: "Subscription",
    landlordOnly: true,
  },
  {
    href: "/settings/system",
    title: "System Configuration",
    description:
      "Configure company information, currency, invoice numbering, and system preferences.",
    icon: Settings2,
    badge: "Business",
    landlordOnly: true,
  },
  {
    href: "/settings/email",
    title: "Email Notifications",
    description:
      "Configure email provider settings (Gmail/Office 365) and manage email templates.",
    icon: Mail,
    badge: "Notifications",
    landlordOnly: true,
  },
  {
    href: "/settings/sms",
    title: "SMS Notifications",
    description:
      "Configure Message Owl SMS settings and manage SMS notification templates.",
    icon: MessageSquare,
    badge: "Notifications",
    landlordOnly: true,
  },
  {
    href: "/settings/telegram",
    title: "Telegram Notifications",
    description:
      "Configure Telegram Bot API settings and manage Telegram notification templates.",
    icon: MessageCircle,
    badge: "Notifications",
    landlordOnly: true,
  },
  {
    href: "/settings/import",
    title: "Data Import",
    description:
      "Import units, tenants, and other data in bulk using CSV files. Download templates to get started.",
    icon: Upload,
    badge: "Data",
    landlordOnly: true,
  },
  {
    href: "/settings/templates",
    title: "Document Templates",
    description:
      "Customize HTML templates for invoices, receipts, and vouchers. Use placeholders for dynamic content.",
    icon: FileText,
    badge: "Templates",
    landlordOnly: true,
  },
];

const quickActions = [
  {
    label: "Update password",
    href: "/settings/account#security",
    tenantVisible: true,
  },
  {
    label: "Invite a delegate",
    href: "/settings/account#delegates",
    landlordOnly: true,
  },
  {
    label: "View latest invoice",
    href: "/settings/billing#history",
    landlordOnly: true,
  },
];

export default function SettingsIndexPage() {
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/account`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const payload = await response.json();
          setUserRole(payload?.user?.role);
        }
      } catch {
        // Ignore errors
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserRole();
  }, []);

  const restrictedRoles = ['super_admin', 'admin', 'owner', 'manager'];
  const isTenant = userRole && !restrictedRoles.includes(userRole);

  // Filter sections based on user role
  const visibleSections = sections.filter((section) => {
    if (isTenant) {
      return section.tenantVisible && !section.landlordOnly;
    }
    return !section.tenantOnly;
  });

  // Filter quick actions based on user role
  const visibleQuickActions = quickActions.filter((action) => {
    if (isTenant) {
      return action.tenantVisible && !action.landlordOnly;
    }
    return !action.tenantOnly;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="badge">
            <Settings2 size={14} />
            Settings
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isTenant ? "Account Settings" : "Control Center"}
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            {isTenant
              ? "Manage your account details, update your profile information, and secure your login."
              : "Manage your RentApplicaiton workspace — keep your account details up to date, invite team members, configure system settings, and stay on top of subscription billing."}
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
        {visibleSections.map((section) => {
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
          {visibleQuickActions.map((action) => (
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


