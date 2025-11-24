"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/utils/api-config";

export default function AdminConnectionTestPage() {
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const addResult = (test, status, message, data = null) => {
    setResults((prev) => [...prev, { test, status, message, data, timestamp: new Date() }]);
  };

  const runAllTests = async () => {
    setResults([]);
    setTesting(true);

    // Test 1: Check API URL
    addResult("API URL", "info", `Using: ${API_BASE_URL}`);

    // Test 2: Check token
    const token = localStorage.getItem("auth_token");
    if (!token) {
      addResult("Authentication", "error", "No token found. Please log in.");
      setTesting(false);
      return;
    }
    addResult("Authentication", "success", "Token found", token.substring(0, 20) + "...");

    // Test 3: Backend reachable
    try {
      const healthResponse = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/api/v1`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (healthResponse.ok || healthResponse.status < 500) {
        addResult("Backend Server", "success", `Reachable (HTTP ${healthResponse.status})`);
      } else {
        addResult("Backend Server", "error", `Not reachable (HTTP ${healthResponse.status})`);
      }
    } catch (err) {
      addResult("Backend Server", "error", `Connection failed: ${err.message}`);
    }

    // Test 4: Check user account
    try {
      const accountResponse = await fetch(`${API_BASE_URL}/account`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        const role = accountData?.user?.role;
        const isSuperAdmin = role === "super_admin";
        
        addResult(
          "User Role",
          isSuperAdmin ? "success" : "error",
          `Current role: ${role}`,
          { isSuperAdmin, user: accountData?.user }
        );

        if (!isSuperAdmin) {
          addResult(
            "Authorization",
            "error",
            `You must be a super_admin. Current role: ${role}. Create one with: php artisan user:create "Super" "Admin" "admin@example.com" "Password123!" --role=super_admin`
          );
        }
      } else {
        const errorData = await accountResponse.json().catch(() => ({}));
        addResult("User Account", "error", `Failed (HTTP ${accountResponse.status}): ${errorData?.message || "Unknown error"}`);
      }
    } catch (err) {
      addResult("User Account", "error", `Request failed: ${err.message}`);
    }

    // Test 5: Test admin endpoint
    try {
      const adminResponse = await fetch(`${API_BASE_URL}/admin/landlords`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const status = adminResponse.status;
      if (status === 200) {
        const data = await adminResponse.json();
        addResult("Admin Endpoint", "success", `Working! Found ${data?.data?.length || 0} landlords`);
      } else if (status === 403) {
        addResult("Admin Endpoint", "error", "Access denied (403). You must be a super_admin user.");
      } else if (status === 401) {
        addResult("Admin Endpoint", "error", "Unauthorized (401). Please log in again.");
      } else {
        const errorData = await adminResponse.json().catch(() => ({}));
        addResult("Admin Endpoint", "error", `Failed (HTTP ${status}): ${errorData?.message || "Unknown error"}`);
      }
    } catch (err) {
      if (err.message === "Failed to fetch") {
        addResult(
          "Admin Endpoint",
          "error",
          "Network error (Failed to fetch). This usually means:\n1. Backend server is not running\n2. CORS is blocking the request\n3. Network connectivity issue"
        );
      } else {
        addResult("Admin Endpoint", "error", `Request failed: ${err.message}`);
      }
    }

    setTesting(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Admin Panel Connection Test</h1>
        <p className="mt-2 text-sm text-slate-600">
          This page helps diagnose connection issues with the admin subscription panel.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={runAllTests}
          disabled={testing}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
        >
          {testing ? "Running Tests..." : "Run All Tests"}
        </button>
        <button
          onClick={() => setResults([])}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Clear Results
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, idx) => (
            <div
              key={idx}
              className={`rounded-lg border p-4 ${
                result.status === "success"
                  ? "border-emerald-200 bg-emerald-50"
                  : result.status === "error"
                    ? "border-red-200 bg-red-50"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      result.status === "success"
                        ? "text-emerald-700"
                        : result.status === "error"
                          ? "text-red-700"
                          : "text-slate-700"
                    }`}
                  >
                    {result.test}
                  </p>
                  <p
                    className={`mt-1 text-sm whitespace-pre-line ${
                      result.status === "success"
                        ? "text-emerald-600"
                        : result.status === "error"
                          ? "text-red-600"
                          : "text-slate-600"
                    }`}
                  >
                    {result.message}
                  </p>
                  {result.data && (
                    <pre className="mt-2 text-xs bg-white/50 p-2 rounded border overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
                <span
                  className={`ml-4 text-xs font-semibold ${
                    result.status === "success"
                      ? "text-emerald-600"
                      : result.status === "error"
                        ? "text-red-600"
                        : "text-slate-600"
                  }`}
                >
                  {result.status === "success" ? "✓" : result.status === "error" ? "✗" : "ℹ"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-semibold text-slate-900 mb-2">Quick Fixes:</p>
        <ol className="list-decimal list-inside space-y-1 text-slate-600">
          <li>
            <strong>Backend not running:</strong> Open terminal in <code className="bg-slate-200 px-1 rounded">backend</code> folder, run{" "}
            <code className="bg-slate-200 px-1 rounded">php artisan serve</code>
          </li>
          <li>
            <strong>Not super_admin:</strong> Create one with{" "}
            <code className="bg-slate-200 px-1 rounded">
              php artisan user:create "Super" "Admin" "admin@example.com" "Password123!" --role=super_admin
            </code>
          </li>
          <li>
            <strong>CORS issue:</strong> Check <code className="bg-slate-200 px-1 rounded">backend/config/cors.php</code> allows{" "}
            <code className="bg-slate-200 px-1 rounded">http://localhost:3000</code>
          </li>
        </ol>
      </div>
    </div>
  );
}

