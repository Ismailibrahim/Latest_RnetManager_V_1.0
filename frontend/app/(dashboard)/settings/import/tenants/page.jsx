"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BulkImport } from "@/components/BulkImport";
import { ArrowLeft, Users, Info } from "lucide-react";
import Link from "next/link";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function TenantsImportPage() {
  const router = useRouter();
  const [nationalities, setNationalities] = useState([]);
  const [showNationalities, setShowNationalities] = useState(false);

  useEffect(() => {
    const fetchNationalities = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/nationalities?paginate=false`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setNationalities(Array.isArray(data?.data) ? data.data : []);
        }
      } catch (error) {
        console.error("Error fetching nationalities:", error);
      }
    };

    fetchNationalities();
  }, []);

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
            <Users size={24} className="text-primary" />
            Import Tenants
          </h1>
          <p className="text-sm text-slate-600">
            Import tenants in bulk from a CSV file. Download the template to get started.
          </p>
        </div>
      </header>

      {/* Available Nationalities Helper */}
      {nationalities.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setShowNationalities(!showNationalities)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Info size={18} className="text-primary" />
              <span className="text-sm font-semibold text-slate-900">
                Available Nationalities ({nationalities.length})
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {showNationalities ? "Hide" : "Show"}
            </span>
          </button>
          {showNationalities && (
            <div className="mt-4 max-h-64 overflow-y-auto">
              <p className="mb-2 text-xs text-slate-500">
                You can use either the name or ID in your CSV file. Matching is case-insensitive.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {nationalities.map((nationality) => (
                  <div
                    key={nationality.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"
                  >
                    <div className="font-semibold text-slate-900">
                      {nationality.name}
                    </div>
                    <div className="text-slate-500">ID: {nationality.id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <BulkImport
        entityName="tenants"
        apiEndpoint="/tenants/bulk-import"
        templateEndpoint="/tenants/import-template"
        supportsUpsert={true}
        relationshipFields={{
          nationalities: true,
        }}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}

