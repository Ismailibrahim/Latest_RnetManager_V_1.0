"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users2,
  UserPlus,
  Search,
  RefreshCcw,
  AlertCircle,
  Mail,
  Phone,
  Building2,
  Calendar,
  Shield,
} from "lucide-react";
import { DataDisplay } from "@/components/DataDisplay";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function OwnersPage() {
  const [account, setAccount] = useState(null);
  const [delegates, setDelegates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "No API token found. Please log in first.",
          );
        }

        // Fetch account info (includes landlord info)
        const accountResponse = await fetch(`${API_BASE_URL}/account`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!accountResponse.ok) {
          throw new Error("Unable to load account information.");
        }

        const accountData = await accountResponse.json();
        if (!isMounted) return;

        // The /account endpoint returns: { user: {...}, delegates: [...], meta: {...} }
        const currentUser = accountData?.user ?? accountData?.data?.user ?? null;
        const delegatesList = Array.isArray(accountData?.delegates) 
          ? accountData.delegates 
          : [];

        setAccount(currentUser);

        // Include the current user as the primary owner, then add delegates
        if (currentUser) {
          setDelegates([
            {
              ...currentUser,
              is_primary: true,
            },
            ...delegatesList,
          ]);
        } else {
          setDelegates(delegatesList);
        }
      } catch (err) {
        if (!isMounted || err.name === "AbortError") return;

        if (err.name === "TypeError" && err.message.includes("fetch")) {
          setError(
            `Cannot connect to API server at ${API_BASE_URL}. Make sure the backend is running.`,
          );
        } else {
          setError(err.message || "An unexpected error occurred.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const filteredOwners = useMemo(() => {
    if (!delegates.length) return [];

    const query = search.trim().toLowerCase();

    return delegates.filter((owner) => {
      if (query.length === 0) return true;

      const fullName =
        owner.full_name ??
        `${owner.first_name || ""} ${owner.last_name || ""}`.trim();

      return (
        fullName.toLowerCase().includes(query) ||
        owner.email?.toLowerCase().includes(query) ||
        owner.mobile?.toLowerCase().includes(query) ||
        owner.role?.toLowerCase().includes(query)
      );
    });
  }, [delegates, search]);

  const landlordName =
    account?.landlord?.company_name ??
    account?.company_name ??
    "N/A";
  
  const subscriptionTier =
    account?.landlord?.subscription_tier ??
    account?.subscription_tier ??
    "N/A";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Users2 size={24} className="text-primary" />
            Owners
          </h1>
          <p className="text-sm text-slate-600">
            Manage property owners and team members. {landlordName && landlordName !== "N/A" && `Company: ${landlordName}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/owners/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            <UserPlus size={16} />
            Add Owner
          </Link>
        </div>
      </header>

      {account && (
        <section className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Company Name
              </p>
              <span className="text-primary">
                <Building2 size={20} />
              </span>
            </div>
            <p className="mt-3 text-xl font-semibold text-slate-900">
              {landlordName}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Subscription Tier
              </p>
              <span className="text-primary">
                <Shield size={20} />
              </span>
            </div>
            <p className="mt-3 text-xl font-semibold text-slate-900 capitalize">
              {subscriptionTier}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total Owners
              </p>
              <span className="text-primary">
                <Users2 size={20} />
              </span>
            </div>
            <p className="mt-3 text-xl font-semibold text-slate-900">
              {delegates.length || 0}
            </p>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            <RefreshCcw size={16} />
            Reset
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">We couldn&apos;t load owners</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
      ) : filteredOwners.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white/70 px-6 py-16 text-center text-slate-500 shadow-sm backdrop-blur">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Users2 size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {search.length > 0 ? "No matches found" : "No owners found"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {search.length > 0
                ? "Adjust your search to see more results."
                : "Add the first property owner to start managing your portfolio."}
            </p>
          </div>
          <Link
            href="/owners/new"
            className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
          >
            <UserPlus size={16} />
            Add an owner
          </Link>
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <DataDisplay
            data={filteredOwners}
            loading={loading}
            loadingMessage="Fetching owners…"
            emptyMessage={search.length > 0 ? "No matches found" : "No owners yet"}
            columns={[
            {
              key: "full_name",
              label: "Name",
              render: (value, item) => {
                const fullName =
                  value ??
                  (`${item.first_name || ""} ${item.last_name || ""}`.trim() || "N/A");
                return (
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-slate-900">
                        {fullName}
                      </div>
                      {item.is_primary && (
                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          Primary
                        </span>
                      )}
                    </div>
                    {item.role && (
                      <div className="mt-1 text-xs text-slate-500 capitalize">
                        {item.role}
                      </div>
                    )}
                  </div>
                );
              },
            },
            {
              key: "email",
              label: "Email",
              render: (value) => (
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <Mail size={14} />
                  {value ?? "N/A"}
                </div>
              ),
            },
            {
              key: "mobile",
              label: "Phone",
              render: (value) => (
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <Phone size={14} />
                  {value ?? "N/A"}
                </div>
              ),
            },
            {
              key: "role",
              label: "Role",
              render: (value) => (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {value ?? "N/A"}
                </span>
              ),
            },
            {
              key: "created_at",
              label: "Added",
              render: (value) => (
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <Calendar size={14} />
                  {value
                    ? new Date(value).toLocaleDateString()
                    : "N/A"}
                </div>
              ),
            },
          ]}
          renderCard={(owner) => {
            const fullName =
              owner.full_name ??
              (`${owner.first_name || ""} ${owner.last_name || ""}`.trim() || "N/A");

            return (
              <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {fullName}
                      </h3>
                      {owner.is_primary && (
                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          Primary
                        </span>
                      )}
                    </div>
                    {owner.role && (
                      <p className="mt-1 text-sm font-medium capitalize text-slate-500">
                        {owner.role}
                      </p>
                    )}
                  </div>
                </div>

                <dl className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={14} />
                    <span>{owner.email ?? "No email"}</span>
                  </div>
                  {owner.mobile && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={14} />
                      <span>{owner.mobile}</span>
                    </div>
                  )}
                  {owner.created_at && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar size={14} />
                      <span>
                        Added {new Date(owner.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </dl>
              </article>
            );
          }}
          />
        </section>
      )}
    </div>
  );
}

