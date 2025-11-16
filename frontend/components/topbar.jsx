"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Menu, Settings, UserRound, LogOut } from "lucide-react";
import clsx from "clsx";
import { Sidebar } from "./sidebar";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const FALLBACK_PROFILE = {
  initials: "RA",
  name: "RentApplicaiton Admin",
  firstName: "there",
  email: "admin@example.com",
  role: "Owner",
  organization: "Your portfolio",
  phone: "—",
};

function buildProfile(user) {
  if (!user) {
    return FALLBACK_PROFILE;
  }

  const firstName = user.first_name?.trim() || user.full_name?.split(" ")?.[0] || "there";
  const lastName = user.last_name?.trim() ?? "";
  const fullName =
    user.full_name?.trim() ||
    [user.first_name, user.last_name]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join(" ")
      .trim() ||
    "RentApplicaiton Admin";

  const initialsSource =
    (user.first_name && user.last_name
      ? `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`
      : fullName
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)) || "RA";

  const roleLabel = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "Owner";

  const organization =
    user.landlord?.company_name?.trim() ||
    FALLBACK_PROFILE.organization;

  return {
    initials: initialsSource.toUpperCase(),
    name: fullName,
    firstName,
    email: user.email ?? FALLBACK_PROFILE.email,
    role: roleLabel,
    organization,
    phone: user.mobile ?? FALLBACK_PROFILE.phone,
  };
}

export function Topbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profile, setProfile] = useState(FALLBACK_PROFILE);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      if (!token) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/account`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return;
      }

      setProfile(buildProfile(payload?.user));
    } catch {
      // ignore; keep fallback profile
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const handleAccountUpdated = (event) => {
      if (event?.detail?.user) {
        setProfile(buildProfile(event.detail.user));
      }
    };

    window.addEventListener("account:updated", handleAccountUpdated);
    return () => window.removeEventListener("account:updated", handleAccountUpdated);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setUserMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [userMenuOpen]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setUserMenuOpen(false);

    try {
      const token = localStorage.getItem("auth_token");

      if (token) {
        // Call logout endpoint to invalidate token on server
        try {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn("Logout API call failed:", error);
        }
      }

      // Clear local storage
      localStorage.removeItem("auth_token");

      // Redirect to login page
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear token and redirect even if there's an error
      localStorage.removeItem("auth_token");
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }, [router, isLoggingOut]);

  return (
    <>
      <header className="relative z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur lg:px-8">
        <div className="flex flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu size={18} />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Maldives Portfolio
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              Welcome back, {profile.firstName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:text-primary"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 inline-flex h-2 w-2 rounded-full bg-primary" />
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left transition hover:border-primary/60 hover:shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {profile.initials}
              </div>
              <div className="hidden text-sm leading-tight lg:block">
                <p className="font-semibold text-slate-900">
                {profile.name}
                </p>
                <p className="text-xs text-slate-500">
                {profile.role} · {profile.organization}
                </p>
              </div>
            </button>

            {userMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-12 z-10 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                    {profile.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-slate-900">
                      {profile.name}
                    </p>
                    <p className="text-xs text-slate-500">{profile.email}</p>
                  </div>
                </div>

                <dl className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-slate-600">Role</dt>
                    <dd>{profile.role}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-slate-600">Organization</dt>
                    <dd>{profile.organization}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-slate-600">Phone</dt>
                    <dd>{profile.phone}</dd>
                  </div>
                </dl>

                <div className="mt-4 grid gap-2 text-sm">
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    <UserRound size={16} />
                    View profile
                  </Link>
                  <Link
                    href="/settings/account"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    <Settings size={16} />
                    Account settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="inline-flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 font-semibold text-danger transition hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogOut size={16} />
                    {isLoggingOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 transform bg-white shadow-2xl transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar />
      </div>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
