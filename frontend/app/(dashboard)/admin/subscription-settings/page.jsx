"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Settings,
  Save,
  RefreshCcw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/currency-formatter";
import { getPrimaryCurrency } from "@/utils/currency-config";

const TIERS = ["basic", "pro", "enterprise"];

export default function SubscriptionSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [limits, setLimits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [formData, setFormData] = useState({});

  const fetchLimits = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found. Please log in.");
      }

      const url = `${API_BASE_URL}/admin/subscription-limits`;

      let response;
      try {
        response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
      } catch (fetchError) {
        // Network error - backend might not be running or CORS issue
        console.error("Network error:", fetchError);
        throw new Error(
          `Unable to connect to the backend server at ${API_BASE_URL}. ` +
          `Please ensure the backend is running. This could be a CORS issue or the server may not be running. ` +
          `Error: ${fetchError.message}`
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          throw new Error("Access denied. Super admin access required.");
        }
        if (response.status === 401) {
          throw new Error("Authentication failed. Please log in again.");
        }
        throw new Error(
          errorData.message || `Failed to fetch subscription limits (HTTP ${response.status})`
        );
      }

      const data = await response.json();
      
      const limitsMap = {};
      
      // Handle empty or missing data gracefully
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        data.data.forEach((limit) => {
          limitsMap[limit.tier] = limit;
          setFormData((prev) => ({
            ...prev,
            [limit.tier]: {
              max_properties: limit.max_properties,
              max_units: limit.max_units,
              max_users: limit.max_users,
              monthly_price: limit.monthly_price,
            },
          }));
        });
      } else {
        // No data found - show warning but don't throw error
        console.warn("No subscription limits found in database. Please run: php artisan db:seed --class=SubscriptionLimitSeeder");
      }
      
      setLimits(limitsMap);
    } catch (err) {
      console.error("Error fetching subscription limits:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) {
      return;
    }

    // Check if user is super admin
    if (!user) {
      setError("Please log in to access this page.");
      setLoading(false);
      return;
    }

    if (user.role !== "super_admin") {
      setError("Access denied. Super admin access required.");
      setLoading(false);
      return;
    }

    // User is super admin, fetch limits
    fetchLimits();
  }, [user, authLoading, fetchLimits]);

  const handleChange = (tier, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem("auth_token");
      const updates = [];

      // Update each tier
      for (const tier of TIERS) {
        if (formData[tier]) {
          const response = await fetch(
            `${API_BASE_URL}/admin/subscription-limits/${tier}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(formData[tier]),
            }
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(
              data.message || `Failed to update ${tier} tier limits`
            );
          }

          updates.push(tier);
        }
      }

      setSuccessMessage(
        `Successfully updated limits for: ${updates.join(", ")}`
      );
      fetchLimits();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Show loading while auth is loading
  if (authLoading || (loading && !error)) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="ml-3 text-sm text-slate-600">Loading subscription settings...</span>
      </div>
    );
  }

  // Check access
  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  if (user.role !== "super_admin") {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">Access denied. Super admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Subscription Limits Settings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage subscription tier limits (properties, units, users, pricing)
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchLimits}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save All Changes
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium mb-1">{error}</p>
            {error.includes("Unable to connect") && (
              <div className="mt-2 text-xs text-red-700">
                <p className="mb-1">Troubleshooting steps:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Ensure the backend server is running: <code className="bg-red-100 px-1 rounded">php artisan serve</code></li>
                  <li>Check that the API URL is correct: <code className="bg-red-100 px-1 rounded">{API_BASE_URL}</code></li>
                  <li>Verify CORS is configured to allow requests from this origin</li>
                  <li>Check browser console and network tab for more details</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {Object.keys(limits).length === 0 && !loading && !error && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-yellow-800">
            No subscription limits found. Please ensure the database has been seeded with subscription limit data.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {TIERS.map((tier) => {
          const tierData = limits[tier];
          const formTierData = formData[tier] || {};

          if (!tierData) {
            return (
              <div
                key={tier}
                className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold capitalize text-slate-900">
                    {tier} Plan
                  </h3>
                  <p className="text-xs text-slate-500">
                    No data available for {tier} tier
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={tier}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold capitalize text-slate-900">
                  {tier} Plan
                </h3>
                <p className="text-xs text-slate-500">
                  Configure limits for {tier} subscription tier
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Max Properties
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formTierData.max_properties ?? tierData.max_properties}
                    onChange={(e) =>
                      handleChange(tier, "max_properties", parseInt(e.target.value))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Max Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formTierData.max_units ?? tierData.max_units}
                    onChange={(e) =>
                      handleChange(tier, "max_units", parseInt(e.target.value))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Max Users
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formTierData.max_users ?? tierData.max_users}
                    onChange={(e) =>
                      handleChange(tier, "max_users", parseInt(e.target.value))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Monthly Price ({getPrimaryCurrency()})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formTierData.monthly_price ?? tierData.monthly_price}
                    onChange={(e) =>
                      handleChange(
                        tier,
                        "monthly_price",
                        parseFloat(e.target.value)
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-700 mb-1">
                    Current Values
                  </p>
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Properties:</span>
                      <span className="font-medium">{tierData.max_properties}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Units:</span>
                      <span className="font-medium">{tierData.max_units}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Users:</span>
                      <span className="font-medium">{tierData.max_users}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span className="font-medium">
                        {formatCurrency(tierData.monthly_price, getPrimaryCurrency())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
