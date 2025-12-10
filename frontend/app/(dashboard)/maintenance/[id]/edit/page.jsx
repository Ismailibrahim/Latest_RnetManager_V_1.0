"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, DollarSign, Loader2 } from "lucide-react";
import { RecordExpenseForm } from "../../components/RecordExpenseForm";
import { API_BASE_URL } from "@/utils/api-config";

export default function EditMaintenanceExpensePage({ params }) {
  const routeParams = React.use(params);
  const expenseId = routeParams?.id;
  const router = useRouter();
  const [request, setRequest] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!expenseId) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in so we can load the expense details.");
        }

        // Fetch expense and units in parallel
        const [expenseResponse, unitsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/maintenance-requests/${expenseId}`, {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/units?per_page=1000&include=property`, {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (expenseResponse.status === 404) {
          throw new Error("We couldn't find that maintenance expense.");
        }

        if (!expenseResponse.ok) {
          const payload = await expenseResponse.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load expense (HTTP ${expenseResponse.status}).`;
          throw new Error(message);
        }

        if (!unitsResponse.ok) {
          const payload = await unitsResponse.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load units (HTTP ${unitsResponse.status}).`;
          throw new Error(message);
        }

        const expensePayload = await expenseResponse.json();
        const unitsPayload = await unitsResponse.json();

        if (!isMounted) {
          return;
        }

        setRequest(expensePayload?.data ?? null);
        const unitsData = Array.isArray(unitsPayload?.data) ? unitsPayload.data : [];
        setUnits(unitsData);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        if (isMounted) {
          setError(err.message);
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
  }, [expenseId]);

  const handleSaved = () => {
    router.push("/maintenance");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-slate-600">Loading expense details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Expense Tracking
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <DollarSign size={24} className="text-primary" />
              Edit Expense
            </h1>
          </div>
          <Link
            href="/maintenance"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            Back to Expenses
          </Link>
        </header>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Error loading expense</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/maintenance")}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Expense Tracking
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <DollarSign size={24} className="text-primary" />
              Edit Expense
            </h1>
          </div>
          <Link
            href="/maintenance"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            Back to Expenses
          </Link>
        </header>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-semibold">Expense not found</p>
          <p className="mt-1">The expense you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Expense Tracking
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <DollarSign size={24} className="text-primary" />
            Edit Expense
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Update maintenance expense details. After saving, you&apos;ll be taken back to the expenses list.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/maintenance"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            Back to Expenses
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        <RecordExpenseForm
          request={request}
          units={units}
          onSaved={handleSaved}
          onCancel={() => router.push("/maintenance")}
        />
      </section>
    </div>
  );
}
