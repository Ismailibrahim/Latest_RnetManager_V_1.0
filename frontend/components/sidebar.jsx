"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HelpCircle,
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
  Clock,
  LineChart,
  BarChart,
  Banknote,
  Shield,
  UserPlus,
  Settings2,
  LogIn,
} from "lucide-react";
import clsx from "clsx";
import { API_BASE_URL } from "@/utils/api-config";

const navigation = [
  { name: "Overview", href: "/", icon: Home, tenantVisible: true },
  { name: "Snapshot", href: "/snapshot", icon: LineChart, landlordOnly: true },
  { name: "Properties", href: "/properties", icon: Building2, landlordOnly: true },
  { name: "Units", href: "/units", icon: Layers, landlordOnly: true },
  { name: "Owners", href: "/owners", icon: Users2, landlordOnly: true },
  { name: "Tenants", href: "/tenants", icon: Users2, landlordOnly: true },
  { name: "Tenant Assignments", href: "/tenant-units", icon: FileText, landlordOnly: true },
  { name: "Finances", href: "/finances", icon: Wallet, landlordOnly: true },
  { name: "Collect Payment", href: "/payments/collect", icon: CircleDollarSign, landlordOnly: true },
  { name: "Unified Payments", href: "/unified-payments", icon: ArrowLeftRight, landlordOnly: true },
  { name: "Rent Invoices", href: "/rent-invoices", icon: Receipt, landlordOnly: true },
  { name: "Payment Submissions", href: "/payment-submissions", icon: Clock, landlordOnly: true },
  { name: "My Payments", href: "/tenant-payments", icon: CreditCard, tenantOnly: true },
  { name: "Advance Rent", href: "/advance-rent", icon: Banknote, landlordOnly: true },
  { name: "Deposit Refunds", href: "/security-deposit-refunds", icon: ShieldCheck, landlordOnly: true },
  { name: "Payment Methods", href: "/payment-methods", icon: CreditCard, landlordOnly: true },
  { name: "Maintenance Expenses", href: "/maintenance", icon: Wrench, landlordOnly: true },
  { name: "Maintenance Invoices", href: "/maintenance-invoices", icon: ClipboardPlus, landlordOnly: true },
  { name: "Assets", href: "/assets", icon: Boxes, landlordOnly: true },
  { name: "Asset Types", href: "/asset-types", icon: Layers3, landlordOnly: true },
  { name: "Vendors", href: "/vendors", icon: ShieldCheck, landlordOnly: true },
  { name: "Reports", href: "/reports", icon: BarChart, landlordOnly: true },
  { name: "Notifications", href: "/notifications", icon: Bell, tenantVisible: true },
  { name: "Settings", href: "/settings", icon: Settings, tenantVisible: true },
];

export function Sidebar({ onNavigate }) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

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
      }
    }

    fetchUserRole();
  }, []);

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin" || isSuperAdmin;
  // Tenant-only items should only show for non-admin roles (agent, or no role)
  const restrictedRoles = ['super_admin', 'admin', 'owner', 'manager'];
  const isTenant = userRole && !restrictedRoles.includes(userRole);

  return (
    <aside className="flex min-h-screen flex-col border-r border-slate-200 bg-white px-5 py-6 text-slate-700 shadow-sm lg:overflow-y-auto">
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
          // If user is a tenant, only show tenant-visible items
          if (isTenant) {
            // Show tenant-only items and tenant-visible items
            if (item.landlordOnly) {
              return null; // Hide landlord-only items
            }
            if (item.tenantOnly || item.tenantVisible) {
              // Show tenant items - continue to render
            } else {
              return null; // Hide items not marked for tenants
            }
          } else {
            // For landlords/admins: hide tenant-only items
            if (item.tenantOnly) {
              return null;
            }
            // Show all other items (landlord-only and general items)
          }
          
          // Skip admin-only items if user is not admin (for future use)
          if (item.adminOnly && !isAdmin) {
            return null;
          }
          const Icon = item.icon;
          // For home route, use exact match; for others, check if pathname starts with href
          const active = item.href === "/" 
            ? pathname === item.href 
            : pathname === item.href || pathname.startsWith(item.href + "/");

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

        {/* Admin Section - Only visible to super_admin and admin */}
        {isAdmin && (
          <>
            <div className="my-4 border-t border-slate-200"></div>
            <div className="px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Admin
              </p>
            </div>
            <Link
              href="/admin/users-rights"
              onClick={handleLinkClick}
              className={clsx(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/admin/users-rights" || pathname.startsWith("/admin/users-rights")
                  ? "bg-primary/15 text-primary"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Shield
                size={18}
                className={clsx(
                  "transition-colors",
                  pathname === "/admin/users-rights" || pathname.startsWith("/admin/users-rights")
                    ? "text-primary"
                    : "text-slate-400 group-hover:text-slate-900"
                )}
              />
              User Rights
            </Link>
            {isSuperAdmin && (
              <Link
                href="/admin/user-login-logs"
                onClick={handleLinkClick}
                className={clsx(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  pathname === "/admin/user-login-logs" || pathname.startsWith("/admin/user-login-logs")
                    ? "bg-primary/15 text-primary"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <LogIn
                  size={18}
                  className={clsx(
                    "transition-colors",
                    pathname === "/admin/user-login-logs" || pathname.startsWith("/admin/user-login-logs")
                      ? "text-primary"
                      : "text-slate-400 group-hover:text-slate-900"
                  )}
                />
                Login Logs
              </Link>
            )}
            <Link
              href="/admin/signups"
              onClick={handleLinkClick}
              className={clsx(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/admin/signups" || pathname.startsWith("/admin/signups")
                  ? "bg-primary/15 text-primary"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <UserPlus
                size={18}
                className={clsx(
                  "transition-colors",
                  pathname === "/admin/signups" || pathname.startsWith("/admin/signups")
                    ? "text-primary"
                    : "text-slate-400 group-hover:text-slate-900"
                )}
              />
              Pending Signups
            </Link>
            <Link
              href="/admin/subscriptions"
              onClick={handleLinkClick}
              className={clsx(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/admin/subscriptions" || pathname.startsWith("/admin/subscriptions")
                  ? "bg-primary/15 text-primary"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Shield
                size={18}
                className={clsx(
                  "transition-colors",
                  pathname === "/admin/subscriptions" || pathname.startsWith("/admin/subscriptions")
                    ? "text-primary"
                    : "text-slate-400 group-hover:text-slate-900"
                )}
              />
              Subscription Management
            </Link>
            <Link
              href="/admin/subscription-settings"
              onClick={handleLinkClick}
              className={clsx(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/admin/subscription-settings" || pathname.startsWith("/admin/subscription-settings")
                  ? "bg-primary/15 text-primary"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Settings2
                size={18}
                className={clsx(
                  "transition-colors",
                  pathname === "/admin/subscription-settings" || pathname.startsWith("/admin/subscription-settings")
                    ? "text-primary"
                    : "text-slate-400 group-hover:text-slate-900"
                )}
              />
              Subscription Settings
            </Link>
            {isSuperAdmin && (
              <Link
                href="/admin/help-content"
                onClick={handleLinkClick}
                className={clsx(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  pathname === "/admin/help-content" || pathname.startsWith("/admin/help-content")
                    ? "bg-primary/15 text-primary"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <HelpCircle
                  size={18}
                  className={clsx(
                    "transition-colors",
                    pathname === "/admin/help-content" || pathname.startsWith("/admin/help-content")
                      ? "text-primary"
                      : "text-slate-400 group-hover:text-slate-900"
                  )}
                />
                Help Content
              </Link>
            )}

          </>
        )}

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
