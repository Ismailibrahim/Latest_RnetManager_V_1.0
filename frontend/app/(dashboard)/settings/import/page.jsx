"use client";

import Link from "next/link";
import { Layers, Users, Upload } from "lucide-react";

const importTypes = [
  {
    href: "/settings/import/units",
    title: "Import Units",
    description: "Import units in bulk from a CSV file. Supports both create and update modes.",
    icon: Layers,
    badge: "Units",
  },
  {
    href: "/settings/import/tenants",
    title: "Import Tenants",
    description: "Import tenants in bulk from a CSV file. Supports both create and update modes.",
    icon: Users,
    badge: "Tenants",
  },
];

export default function ImportIndexPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <div className="badge">
          <Upload size={14} />
          Data Import
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Bulk Import
        </h1>
        <p className="text-sm text-slate-500">
          Import data in bulk using CSV files. Download templates to get started with the correct format.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {importTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Link
              key={type.href}
              href={type.href}
              className="card group flex flex-col gap-4 transition hover:border-primary/30 hover:shadow-lg"
            >
              <header className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2 text-primary transition group-hover:bg-primary/15">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="badge">{type.badge}</div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {type.title}
                  </h2>
                </div>
              </header>
              <p className="text-sm text-slate-600">{type.description}</p>
              <span className="text-sm font-semibold text-primary">
                Open {type.title.toLowerCase()} →
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

