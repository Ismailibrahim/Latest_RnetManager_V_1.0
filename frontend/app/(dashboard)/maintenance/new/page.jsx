"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, DollarSign, Loader2 } from "lucide-react";
import { RecordExpenseForm } from "../components/RecordExpenseForm";
import { API_BASE_URL } from "@/utils/api-config";

export default function NewMaintenanceExpensePage() {
  const router = useRouter();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchUnits() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in so we can load unit information.");
        }

        if (!API_BASE_URL) {
          if (process.env.NODE_ENV === "development") {
            console.warn("API_BASE_URL is not configured");
          }
          return;
        }

        const url = new URL(`${API_BASE_URL}/units`);
        url.searchParams.set("per_page", "1000");
        url.searchParams.set("include", "property");

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
            `Unable to load units (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        if (!isMounted) {
          return;
        }

        const data = Array.isArray(payload?.data) ? payload.data : [];
        setUnits(data);
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

    fetchUnits();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const handleSaved = () => {
    router.push("/maintenance");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-slate-600">Loading units...</p>
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
              Record Expense
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
          <p className="font-semibold">Error loading units</p>
          <p className="mt-1">{error}</p>
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
            Record Expense
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Record a new maintenance expense. After saving, you'll be taken back to the expenses list.
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
          units={units}
          onSaved={handleSaved}
          onCancel={() => router.push("/maintenance")}
        />
      </section>
    </div>
  );
}
