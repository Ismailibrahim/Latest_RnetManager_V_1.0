"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCcw,
  Search,
  Trash2,
  X,
  AlertTriangle,
  DollarSign,
  Wrench,
  Calendar,
  Shield,
  Settings,
} from "lucide-react";
import { DataDisplay } from "@/components/DataDisplay";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const typeOptions = [
  { value: "all", label: "All types" },
  { value: "rent_due", label: "Rent due" },
  { value: "rent_received", label: "Rent received" },
  { value: "maintenance_request", label: "Maintenance request" },
  { value: "lease_expiry", label: "Lease expiry" },
  { value: "security_deposit", label: "Security deposit" },
  { value: "system", label: "System" },
];

const priorityOptions = [
  { value: "all", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const readStatusOptions = [
  { value: "all", label: "All notifications" },
  { value: "unread", label: "Unread only" },
  { value: "read", label: "Read only" },
];

function getTypeIcon(type) {
  switch (type) {
    case "rent_due":
      return <DollarSign size={16} />;
    case "rent_received":
      return <CheckCircle2 size={16} />;
    case "maintenance_request":
      return <Wrench size={16} />;
    case "lease_expiry":
      return <Calendar size={16} />;
    case "security_deposit":
      return <Shield size={16} />;
    case "system":
      return <Settings size={16} />;
    default:
      return <Bell size={16} />;
  }
}

function getTypeLabel(type) {
  const option = typeOptions.find((opt) => opt.value === type);
  return option?.label ?? type;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [meta, setMeta] = useState(null);
  const [pagination, setPagination] = useState({ nextUrl: null });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [readStatusFilter, setReadStatusFilter] = useState("all");

  const [flashMessage, setFlashMessage] = useState(null);
  const [markingAsReadId, setMarkingAsReadId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchNotifications() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "No API token found. Log in first so we can load notifications.",
          );
        }

        const url = new URL(`${API_BASE_URL}/notifications`);
        url.searchParams.set("per_page", "50");

        if (readStatusFilter === "read") {
          url.searchParams.set("is_read", "true");
        } else if (readStatusFilter === "unread") {
          url.searchParams.set("is_read", "false");
        }

        if (typeFilter !== "all") {
          url.searchParams.set("type", typeFilter);
        }

        if (priorityFilter !== "all") {
          url.searchParams.set("priority", priorityFilter);
        }

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load notifications (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) return;

        const data = Array.isArray(payload?.data) ? payload.data : [];

        setNotifications(data);
        setMeta(payload?.meta ?? null);
        setPagination({
          nextUrl: payload?.links?.next ?? null,
        });
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        if (!isMounted) return;

        setError(err.message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchNotifications();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [refreshKey, typeFilter, priorityFilter, readStatusFilter]);

  useEffect(() => {
    if (!flashMessage) return;

    const timeout = setTimeout(() => {
      setFlashMessage(null);
    }, 3200);

    return () => clearTimeout(timeout);
  }, [flashMessage]);

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesSearch =
        query.length === 0
          ? true
          : [notification?.title, notification?.message]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(query));

      return matchesSearch;
    });
  }, [notifications, search]);

  const stats = useMemo(() => {
    return notifications.reduce(
      (accumulator, notification) => {
        accumulator.total += 1;

        if (notification?.is_read) {
          accumulator.read += 1;
        } else {
          accumulator.unread += 1;
        }

        const priority = notification?.priority ?? "medium";
        accumulator.priorities[priority] =
          (accumulator.priorities[priority] ?? 0) + 1;

        return accumulator;
      },
      {
        total: 0,
        read: 0,
        unread: 0,
        priorities: {},
      },
    );
  }, [notifications]);

  const hasFilters =
    search.trim().length > 0 ||
    typeFilter !== "all" ||
    priorityFilter !== "all" ||
    readStatusFilter !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setPriorityFilter("all");
    setReadStatusFilter("all");
  };

  const handleRetry = () => {
    setRefreshKey((value) => value + 1);
  };

  const handleLoadMore = async () => {
    if (!pagination.nextUrl) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error(
          "No API token found. Log in first so we can load additional notifications.",
        );
      }

      const response = await fetch(pagination.nextUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to load more notifications (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const payload = await response.json();
      const data = Array.isArray(payload?.data) ? payload.data : [];

      setNotifications((previous) => {
        const existingIds = new Set(previous.map((item) => item.id));
        const merged = [...previous];

        data.forEach((item) => {
          if (item?.id && !existingIds.has(item.id)) {
            merged.push(item);
          }
        });

        return merged;
      });

      setMeta(payload?.meta ?? null);
      setPagination({
        nextUrl: payload?.links?.next ?? null,
      });
    } catch (err) {
      setFlashMessage(err.message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleMarkAsRead = async (notificationId, isRead) => {
    if (markingAsReadId) {
      return;
    }

    setMarkingAsReadId(notificationId);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before updating notifications.");
      }

      const response = await fetch(
        `${API_BASE_URL}/notifications/${notificationId}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_read: !isRead }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to update notification (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json();
      const updated = result?.data ?? result;

      setNotifications((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );

      setFlashMessage(
        updated.is_read ? "Notification marked as read." : "Notification marked as unread.",
      );
    } catch (err) {
      setFlashMessage(err.message);
    } finally {
      setMarkingAsReadId(null);
    }
  };

  const handleDelete = async (notificationId) => {
    if (!notificationId || deletingId) {
      return;
    }

    const notification = notifications.find((item) => item.id === notificationId);
    const label = notification?.title ?? `Notification #${notificationId}`;

    const confirmed = window.confirm(
      `Delete ${label}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(notificationId);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be logged in before deleting notifications.");
      }

      const response = await fetch(
        `${API_BASE_URL}/notifications/${notificationId}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to delete notification (HTTP ${response.status}).`;
        throw new Error(message);
      }

      setNotifications((previous) =>
        previous.filter((item) => item.id !== notificationId),
      );
      setMeta((previous) =>
        previous
          ? {
              ...previous,
              total: Math.max((previous.total ?? 1) - 1, 0),
            }
          : previous,
      );
      setFlashMessage("Notification deleted.");
    } catch (err) {
      setFlashMessage(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification?.action_url) {
      router.push(notification.action_url);
    } else if (!notification?.is_read) {
      handleMarkAsRead(notification.id, notification.is_read);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Bell size={24} className="text-primary" />
            Notifications
          </h1>
          <p className="text-sm text-slate-600">
            Stay updated with rent payments, maintenance requests, lease
            expiries, and system alerts.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total notifications" value={stats.total} />
        <SummaryCard
          title="Unread"
          value={stats.unread}
          tone="warning"
          icon={<AlertCircle size={18} />}
        />
        <SummaryCard
          title="Read"
          value={stats.read}
          tone="success"
          icon={<CheckCircle2 size={18} />}
        />
        <SummaryCard
          title="Urgent"
          value={stats.priorities.urgent ?? 0}
          tone="danger"
          icon={<AlertTriangle size={18} />}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or message…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={readStatusFilter}
            onChange={(event) => setReadStatusFilter(event.target.value)}
            className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {readStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
          >
            <RefreshCcw size={16} />
            Reset
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
        {flashMessage ? (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-sm text-slate-700">
            {flashMessage}
          </div>
        ) : null}

        {error ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : (
          <>
            <DataDisplay
              data={filteredNotifications}
              loading={loading}
              loadingMessage="Fetching notifications…"
              emptyMessage={
                hasFilters
                  ? "No notifications match your filters"
                  : "No notifications yet"
              }
              columns={[
                {
                  key: "title",
                  label: "Notification",
                  render: (value, item) => (
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                          item?.is_read
                            ? "bg-slate-100 text-slate-500"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {getTypeIcon(item?.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-slate-900">
                            {value}
                          </div>
                          {!item?.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {item?.message}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                          <span>{getTypeLabel(item?.type)}</span>
                          {item?.created_at && (
                            <>
                              <span>•</span>
                              <span>
                                {formatRelativeTime(item.created_at)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "priority",
                  label: "Priority",
                  render: (value) => (
                    <PriorityBadge priority={value ?? "medium"} />
                  ),
                },
                {
                  key: "created_at",
                  label: "Date",
                  render: (value) => (
                    <span className="text-sm text-slate-600">
                      {value ? formatDate(value) : "—"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (_, item) => (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(item.id, item.is_read);
                        }}
                        disabled={markingAsReadId === item.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {markingAsReadId === item.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : item.is_read ? (
                          <Clock size={14} />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        {item.is_read ? "Mark unread" : "Mark read"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        disabled={deletingId === item.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === item.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        {deletingId === item.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  ),
                },
              ]}
              renderCard={(notification) => (
                <NotificationCard
                  notification={notification}
                  onMarkAsRead={() =>
                    handleMarkAsRead(notification.id, notification.is_read)
                  }
                  onDelete={() => handleDelete(notification.id)}
                  markingAsRead={markingAsReadId === notification.id}
                  deleting={deletingId === notification.id}
                />
              )}
              onRowClick={handleNotificationClick}
            />

            <footer className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:justify-between sm:text-sm">
              <p>
                Showing {filteredNotifications.length} of {notifications.length}{" "}
                loaded notifications
                {meta?.total ? ` · ${meta.total} total` : ""}
              </p>

              {pagination.nextUrl ? (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingMore ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <RefreshCcw size={16} />
                      Load more
                    </>
                  )}
                </button>
              ) : null}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ title, value, tone = "default", icon }) {
  const toneClasses = {
    default: "bg-white/70",
    success: "bg-emerald-50/80",
    warning: "bg-amber-50/80",
    danger: "bg-red-50/80",
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200 ${toneClasses[tone] ?? toneClasses.default} p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const config = {
    low: {
      label: "Low",
      className: "bg-slate-100 text-slate-700",
    },
    medium: {
      label: "Medium",
      className: "bg-blue-50 text-blue-700",
    },
    high: {
      label: "High",
      className: "bg-amber-50 text-amber-700",
    },
    urgent: {
      label: "Urgent",
      className: "bg-red-50 text-red-700",
    },
  };

  const selected = config[priority] ?? config.medium;

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${selected.className}`}
    >
      {selected.label}
    </span>
  );
}

function NotificationCard({
  notification,
  onMarkAsRead,
  onDelete,
  markingAsRead,
  deleting,
}) {
  return (
    <article
      className={`group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
        notification?.is_read
          ? "border-slate-200"
          : "border-primary/40 bg-primary/5"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div
            className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
              notification?.is_read
                ? "bg-slate-100 text-slate-500"
                : "bg-primary/10 text-primary"
            }`}
          >
            {getTypeIcon(notification?.type)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {notification?.title}
              </h3>
              {!notification?.is_read && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {notification?.message}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={notification?.priority ?? "medium"} />
              <span className="text-xs text-slate-400">
                {getTypeLabel(notification?.type)}
              </span>
              {notification?.created_at && (
                <>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-400">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onMarkAsRead}
          disabled={markingAsRead}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {markingAsRead ? (
            <Loader2 size={14} className="animate-spin" />
          ) : notification.is_read ? (
            <Clock size={14} />
          ) : (
            <CheckCircle2 size={14} />
          )}
          {notification.is_read ? "Mark unread" : "Mark read"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          We couldn&apos;t load notifications
        </p>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <p className="mt-2 text-xs text-slate-400">
          Make sure you are logged in and the API server is running at{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            {API_BASE_URL}
          </code>
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
      >
        <RefreshCcw size={16} />
        Try again
      </button>
    </div>
  );
}

function formatDate(input) {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  return date.toLocaleDateString();
}

function formatRelativeTime(input) {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return formatDate(input);
  }
}

