"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { RecordRefundForm } from "../components/RecordRefundForm";

export default function NewSecurityDepositRefundPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Deposit management
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <ShieldCheck size={24} className="text-primary" />
            Record a refund
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Create a new security deposit refund. After saving you'll be taken back to the list.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/security-deposit-refunds"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            Back to refunds
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
        <RecordRefundForm
          onSaved={() => {
            router.push("/security-deposit-refunds");
          }}
        />
      </section>
    </div>
  );
}


