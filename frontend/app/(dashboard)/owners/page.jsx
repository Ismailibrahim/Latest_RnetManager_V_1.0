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
  Edit,
} from "lucide-react";
import { DataDisplay } from "@/components/DataDisplay";
import { API_BASE_URL } from "@/utils/api-config";
import { useAuth } from "@/contexts/AuthContext";

export default function OwnersPage() {
  const { user: currentUser } = useAuth();
  const [account, setAccount] = useState(null);
  const [delegates, setDelegates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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

        // Check if user is super admin from AuthContext or localStorage
        let userRole = currentUser?.role;
        if (!userRole) {
          try {
            const cachedUser = localStorage.getItem("auth_user");
            if (cachedUser) {
              const userData = JSON.parse(cachedUser);
              userRole = userData?.role;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        const isAdmin = userRole === "super_admin";
        setIsSuperAdmin(isAdmin);
        
        if (isAdmin) {
          // For super admins, fetch all owners from admin endpoint
          try {
            const ownersResponse = await fetch(`${API_BASE_URL}/admin/owners?per_page=1000`, {
              signal: controller.signal,
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
            });

            if (!ownersResponse.ok) {
              const errorData = await ownersResponse.json().catch(() => ({}));
              // If 403, user might not actually be super admin, fall back to regular endpoint
              if (ownersResponse.status === 403) {
                console.warn("Super admin endpoint returned 403, falling back to regular account endpoint");
                setIsSuperAdmin(false);
                // Fall through to regular user flow
              } else {
                throw new Error(errorData.message || `Unable to load owners. (Status: ${ownersResponse.status})`);
              }
            } else {
              const ownersData = await ownersResponse.json();
              if (!isMounted) return;

              const ownersList = Array.isArray(ownersData?.data) 
                ? ownersData.data 
                : [];

              setDelegates(ownersList);
              setAccount(null); // No account info for super admin view
              return; // Success, exit early
            }
          } catch (fetchError) {
            // If fetch fails (network error, etc.), fall back to regular endpoint
            if (fetchError.name !== "AbortError") {
              console.warn("Super admin endpoint failed, falling back to regular account endpoint:", fetchError);
              setIsSuperAdmin(false);
              // Fall through to regular user flow
            } else {
              throw fetchError;
            }
          }
        }
        
        // Regular users (or fallback from super admin endpoint failure)
        {
          // For regular users, fetch account info (includes landlord info)
          const accountResponse = await fetch(`${API_BASE_URL}/account`, {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (!accountResponse.ok) {
            const errorData = await accountResponse.json().catch(() => ({}));
            throw new Error(errorData.message || `Unable to load account information. (Status: ${accountResponse.status})`);
          }

          const accountData = await accountResponse.json();
          if (!isMounted) return;

          // The /account endpoint returns: { user: {...}, delegates: [...], meta: {...} }
          const currentUserData = accountData?.user ?? accountData?.data?.user ?? null;
          const delegatesList = Array.isArray(accountData?.delegates) 
            ? accountData.delegates 
            : [];

          setAccount(currentUserData);

          // Include the current user as the primary owner, then add delegates
          if (currentUserData) {
            setDelegates([
              {
                ...currentUserData,
                is_primary: true,
              },
              ...delegatesList,
            ]);
          } else {
            setDelegates(delegatesList);
          }
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
  }, [currentUser]);

  const filteredOwners = useMemo(() => {
    if (!delegates.length) return [];

    const query = search.trim().toLowerCase();

    return delegates.filter((owner) => {
      if (query.length === 0) return true;

      const fullName =
        owner.full_name ??
        `${owner.first_name || ""} ${owner.last_name || ""}`.trim();

      const landlordName = owner.landlord?.company_name || "";

      return (
        fullName.toLowerCase().includes(query) ||
        owner.email?.toLowerCase().includes(query) ||
        owner.mobile?.toLowerCase().includes(query) ||
        owner.role?.toLowerCase().includes(query) ||
        landlordName.toLowerCase().includes(query)
      );
    });
  }, [delegates, search]);

  const landlordName =
    account?.landlord?.company_name ??
    account?.company_name ??
    (isSuperAdmin ? "All Companies" : "N/A");
  
  const subscriptionTier =
    account?.landlord?.subscription_tier ??
    account?.subscription_tier ??
    (isSuperAdmin ? "All Tiers" : "N/A");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Users2 size={24} className="text-primary" />
            Owners
          </h1>
          <p className="text-sm text-slate-600">
            {isSuperAdmin 
              ? "View and manage all registered property owners across all companies."
              : `Manage property owners and team members. ${landlordName && landlordName !== "N/A" && `Company: ${landlordName}`}`}
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

      {(account || isSuperAdmin) && (
        <section className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                {isSuperAdmin ? "Viewing" : "Company Name"}
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
                {isSuperAdmin ? "Subscription Tiers" : "Subscription Tier"}
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
                    {isSuperAdmin && item.landlord?.company_name && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Building2 size={12} />
                        <span>{item.landlord.company_name}</span>
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
            ...(isSuperAdmin ? [{
              key: "landlord",
              label: "Company",
              render: (value, item) => (
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <Building2 size={14} />
                  {item.landlord?.company_name ?? "N/A"}
                </div>
              ),
            }] : []),
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
            {
              key: "actions",
              label: "Actions",
              render: (value, item) => (
                <Link
                  href={`/owners/${item.id}/edit`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                >
                  <Edit size={14} />
                  Edit
                </Link>
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
                    {isSuperAdmin && owner.landlord?.company_name && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <Building2 size={14} />
                        <span>{owner.landlord.company_name}</span>
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
                  {isSuperAdmin && owner.landlord?.subscription_tier && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Shield size={14} />
                      <span className="capitalize">{owner.landlord.subscription_tier}</span>
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
                <div className="mt-4 flex items-center justify-end">
                  <Link
                    href={`/owners/${owner.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
                  >
                    <Edit size={14} />
                    Edit
                  </Link>
                </div>
              </article>
            );
          }}
          />
        </section>
      )}
    </div>
  );
}

