"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Loader2, Settings2, ShieldCheck } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { CompanySettings } from "./components/CompanySettings";
import { CurrencySettings } from "./components/CurrencySettings";
import { InvoiceNumberingSettings } from "./components/InvoiceNumberingSettings";
import { PaymentTermsSettings } from "./components/PaymentTermsSettings";
import { SystemPreferencesSettings } from "./components/SystemPreferencesSettings";
import { DocumentSettings } from "./components/DocumentSettings";
import { TaxSettings } from "./components/TaxSettings";

const TABS = [
  { id: "company", label: "Company Information", icon: Settings2 },
  { id: "currency", label: "Currency", icon: Settings2 },
  { id: "tax", label: "Tax", icon: Settings2 },
  { id: "invoice-numbering", label: "Invoice Numbering", icon: Settings2 },
  { id: "payment-terms", label: "Payment Terms", icon: Settings2 },
  { id: "system", label: "System Preferences", icon: Settings2 },
  { id: "documents", label: "Documents", icon: Settings2 },
];

export default function SystemSettingsPage() {
  const { settings, loading, error, refetch } = useSystemSettings();
  const [activeTab, setActiveTab] = useState("company");
  const [successMessage, setSuccessMessage] = useState("");

  // Clear success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timeout = setTimeout(() => setSuccessMessage(""), 4000);
      return () => clearTimeout(timeout);
    }
  }, [successMessage]);

  const handleSuccess = (message) => {
    setSuccessMessage(message);
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading settings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <section className="card">
          <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-700">
                  Unable to load system settings
                </p>
                <p className="text-xs text-red-600">
                  {error?.message || "An error occurred while loading settings."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <section className="card flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="badge">
            <Settings2 size={14} />
            System Configuration
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            System Settings
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Configure company information, currency, tax (GST), invoice numbering, payment
            terms, and system preferences for your rental business.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Settings are saved automatically and apply to all properties.
          </div>
        </div>
      </section>

      <section className="card">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors
                    ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }
                  `}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "company" && (
            <CompanySettings
              settings={settings?.company}
              onSuccess={handleSuccess}
            />
          )}
          {activeTab === "currency" && (
            <CurrencySettings
              settings={settings?.currency}
              onSuccess={handleSuccess}
            />
          )}
          {activeTab === "tax" && (
            <TaxSettings
              settings={settings?.tax}
              onSuccess={handleSuccess}
            />
          )}
          {activeTab === "invoice-numbering" && (
            <InvoiceNumberingSettings
              settings={settings?.invoice_numbering}
              onSuccess={handleSuccess}
            />
          )}
          {activeTab === "payment-terms" && (
            <PaymentTermsSettings
              settings={settings?.payment_terms}
              onSuccess={handleSuccess}
            />
          )}
          {activeTab === "system" && (
            <SystemPreferencesSettings
              settings={settings?.system}
              onSuccess={handleSuccess}
            />
          )}
          {activeTab === "documents" && (
            <DocumentSettings
              settings={settings?.documents}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </section>
    </div>
  );
}

