"use client";

import { useRouter } from "next/navigation";
import { BulkImport } from "@/components/BulkImport";
import { ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";

export default function UnitsImportPage() {
  const router = useRouter();

  const handleImportComplete = (results) => {
    // Optionally redirect or show success message
    console.log("Import completed:", results);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/settings/import"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Layers size={24} className="text-primary" />
            Import Units
          </h1>
          <p className="text-sm text-slate-600">
            Import units in bulk from a CSV file. Download the template to get started.
          </p>
        </div>
      </header>

      <BulkImport
        entityName="units"
        apiEndpoint="/units/bulk-import"
        templateEndpoint="/units/import-template"
        supportsUpsert={true}
        relationshipFields={{
          properties: true,
          unitTypes: true,
        }}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}

