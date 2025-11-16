"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Home,
  Loader2,
  MapPin,
  Pencil,
  SquareStack,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function PropertyDetailsPage({ params }) {
  const routeParams = React.use(params);
  const propertyId = routeParams?.id;
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!propertyId) return;

    const controller = new AbortController();

    async function fetchProperty() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error(
            "No API token found. Log in first so we can load property details.",
          );
        }

        const response = await fetch(
          `${API_BASE_URL}/properties/${propertyId}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.status === 404) {
          throw new Error("We couldn't find that property.");
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load property (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        setProperty(payload?.data ?? null);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProperty();

    return () => controller.abort();
  }, [propertyId]);

  const meta = useMemo(() => {
    if (!property) return null;

    return [
      {
        label: "Units",
        value: property.units_count ?? 0,
        icon: SquareStack,
      },
    ];
  }, [property]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/properties"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft size={18} />
            <span className="sr-only">Back to properties</span>
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Property detail
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <Home className="text-primary" size={22} />
              {property?.name ?? "Loading…"}
            </h1>
            {property?.landlord?.company_name ? (
              <p className="text-sm text-slate-500">
                Managed by {property.landlord.company_name}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/properties/${propertyId}/edit`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/50 hover:text-primary"
          >
            <Pencil size={16} />
            Edit property
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : property ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Overview
              </h2>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-slate-900">Address</p>
                    <p>{property.address ?? "No address provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <SquareStack className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-slate-900">Type</p>
                    <p className="capitalize">{property.type ?? "Unknown"}</p>
                  </div>
                </div>
              </div>
            </div>

            {meta ? (
              <div className="grid gap-4 sm:grid-cols-1">
                {meta.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {label}
                      </p>
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="mt-3 text-lg font-semibold text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <ErrorState message="Property data is missing." />
        )}
      </section>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-slate-600">
        Fetching property details…
      </p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle size={22} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">
          We couldn&apos;t load that property
        </p>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      </div>
      <Link
        href="/properties"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
      >
        <ArrowLeft size={16} />
        Back to properties
      </Link>
    </div>
  );
}

