"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Loader2, Settings2, ShieldCheck, RefreshCw } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { API_BASE_URL } from "@/utils/api-config";
import { CompanySettings } from "./components/CompanySettings";
import { CurrencySettings } from "./components/CurrencySettings";
import { InvoiceNumberingSettings } from "./components/InvoiceNumberingSettings";
import { PaymentTermsSettings } from "./components/PaymentTermsSettings";
import { SystemPreferencesSettings } from "./components/SystemPreferencesSettings";
import { DocumentSettings } from "./components/DocumentSettings";
import { TaxSettings } from "./components/TaxSettings";
import { AutoInvoiceSettings } from "./components/AutoInvoiceSettings";

const TABS = [
  { id: "company", label: "Company Information", icon: Settings2 },
  { id: "currency", label: "Currency", icon: Settings2 },
  { id: "tax", label: "Tax", icon: Settings2 },
  { id: "invoice-numbering", label: "Invoice Numbering", icon: Settings2 },
  { id: "payment-terms", label: "Payment Terms", icon: Settings2 },
  { id: "system", label: "System Preferences", icon: Settings2 },
  { id: "documents", label: "Documents", icon: Settings2 },
  { id: "auto-invoice", label: "Auto-Invoice", icon: Settings2 },
];

export default function SystemSettingsPage() {
  const { settings, loading, error, refetch, selectedLandlordId, setSelectedLandlordId } = useSystemSettings();
  const [activeTab, setActiveTab] = useState("company");
  const [successMessage, setSuccessMessage] = useState("");
  const [serverStatus, setServerStatus] = useState(null);
  
  // Check if user is super admin
  const isSuperAdmin = settings?.super_admin === true;
  const availableLandlords = settings?._landlords || [];

  // Clear success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timeout = setTimeout(() => setSuccessMessage(""), 4000);
      return () => clearTimeout(timeout);
    }
  }, [successMessage]);

  // Check server connectivity
  useEffect(() => {
    const checkServer = async () => {
      try {
        const healthUrl = API_BASE_URL.replace('/api/v1', '') + '/api/health';
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('error');
        }
      } catch (e) {
        setServerStatus('offline');
      }
    };
    
    if (error) {
      checkServer();
    }
  }, [error]);

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
              <div className="flex-1">
                <p className="font-semibold text-red-700">
                  Unable to load system settings
                </p>
                <p className="mt-1 text-xs text-red-600">
                  {error?.message || "An error occurred while loading settings."}
                </p>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-red-700">Server Status:</span>
                    {serverStatus === 'online' && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
                        ✓ Online
                      </span>
                    )}
                    {serverStatus === 'offline' && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                        ✗ Offline - Server not running
                      </span>
                    )}
                    {serverStatus === null && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">
                        ? Checking...
                      </span>
                    )}
                  </div>
                  
                  <p className="font-semibold text-red-700">Troubleshooting:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2 text-red-600">
                    <li>
                      <strong>Start the backend server:</strong>
                      <div className="ml-4 mt-1 p-2 bg-red-50 rounded border border-red-200">
                        <code className="text-xs">cd backend && php artisan serve</code>
                        <br />
                        <span className="text-xs text-red-500">Or double-click: START_BACKEND_SERVER.bat</span>
                      </div>
                    </li>
                    <li>Verify server is running: Open <a href="http://localhost:8000/api/v1/health" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800">http://localhost:8000/api/v1/health</a> in browser</li>
                    <li>Check browser console (F12) for detailed error logs</li>
                    <li>Check Network tab in DevTools to see if request is being sent</li>
                    <li>Verify API URL: <code className="bg-red-100 px-1 rounded">{API_BASE_URL}</code></li>
                  </ol>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        setError(null);
                        setServerStatus(null);
                        refetch();
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                    >
                      <RefreshCw size={12} />
                      Retry
                    </button>
                    <button
                      onClick={() => {
                        window.open('http://localhost:8000/api/v1/health', '_blank');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Test Server
                    </button>
                  </div>
                </div>
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

      {isSuperAdmin && availableLandlords.length > 0 && (
        <section className="card">
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Landlord (Super Admin)
            </label>
            <select
              value={selectedLandlordId || ''}
              onChange={(e) => setSelectedLandlordId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select a Landlord --</option>
              {availableLandlords.map((landlord) => (
                <option key={landlord.id} value={landlord.id}>
                  {landlord.name} ({landlord.email})
                </option>
              ))}
            </select>
            {settings?.message && (
              <p className="mt-2 text-xs text-gray-600">{settings.message}</p>
            )}
          </div>
        </section>
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
          {activeTab === "auto-invoice" && (
            <AutoInvoiceSettings
              settings={settings?.auto_invoice}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </section>
    </div>
  );
}

