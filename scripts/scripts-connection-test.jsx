"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, XCircle, RefreshCcw } from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";

/**
 * Connection Test Component
 * Helps diagnose backend connection issues
 */
export function ConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);

  const runTests = async () => {
    setTesting(true);
    setResults(null);

    const testResults = {
      backendReachable: false,
      corsConfigured: false,
      authenticated: false,
      isSuperAdmin: false,
      endpointAccessible: false,
      errors: [],
    };

    const token = localStorage.getItem("auth_token");

    // Test 1: Backend reachable
    try {
      // Try without /api/v1 first
      const baseUrl = API_BASE_URL.replace('/api/v1', '');
      const healthCheck = await fetch(`${baseUrl}/api/v1`, {
        method: "GET",
        headers: { Accept: "application/json" },
        mode: "cors",
      });
      testResults.backendReachable = healthCheck.ok || healthCheck.status < 500;
      if (!testResults.backendReachable) {
        testResults.errors.push(`Backend not reachable: HTTP ${healthCheck.status}`);
      }
    } catch (err) {
      testResults.errors.push(`Backend connection failed: ${err.message}`);
      // If it's a CORS error, provide specific guidance
      if (err.message.includes("Failed to fetch") || err.message.includes("CORS")) {
        testResults.errors.push(
          "CORS Error: The backend may be blocking requests. Check:\n" +
          "1. backend/config/cors.php allows http://localhost:3000\n" +
          "2. Backend is running with CORS middleware enabled\n" +
          "3. Try accessing http://localhost:8000/api/v1 directly in browser"
        );
      }
    }

    // Test 2: Authentication
    if (token) {
      testResults.authenticated = true;
      
      // Test 3: Check if super_admin
      try {
        const accountResponse = await fetch(`${API_BASE_URL}/account`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          testResults.isSuperAdmin = accountData?.user?.role === "super_admin";
          if (!testResults.isSuperAdmin) {
            testResults.errors.push(
              `Current user role: ${accountData?.user?.role}. Must be 'super_admin' to access admin panel.`
            );
          }
        }
      } catch (err) {
        testResults.errors.push(`Failed to check user role: ${err.message}`);
      }

      // Test 4: Admin endpoint
      try {
        const adminResponse = await fetch(`${API_BASE_URL}/admin/landlords`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          mode: "cors",
          credentials: "include",
        });

        if (adminResponse.ok) {
          testResults.endpointAccessible = true;
          testResults.corsConfigured = true; // If we got a response, CORS is working
        } else if (adminResponse.status === 403) {
          testResults.errors.push("Access denied (403). You must be a super_admin user.");
        } else if (adminResponse.status === 401) {
          testResults.errors.push("Unauthorized (401). Please log in again.");
        } else {
          testResults.errors.push(`Admin endpoint returned: HTTP ${adminResponse.status}`);
        }
      } catch (err) {
        if (err.message === "Failed to fetch") {
          testResults.errors.push(
            "CORS error or backend not running. Check: 1) Backend server is running, 2) CORS allows your origin"
          );
        } else {
          testResults.errors.push(`Admin endpoint error: ${err.message}`);
        }
      }
    } else {
      testResults.errors.push("No authentication token found. Please log in.");
    }

    setResults(testResults);
    setTesting(false);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Connection Diagnostics</h3>
        <button
          type="button"
          onClick={runTests}
          disabled={testing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCcw size={14} className={testing ? "animate-spin" : ""} />
          {testing ? "Testing..." : "Run Tests"}
        </button>
      </div>

      {results && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            {results.backendReachable ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <XCircle size={14} className="text-red-600" />
            )}
            <span>Backend Server Reachable</span>
          </div>

          <div className="flex items-center gap-2">
            {results.authenticated ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <XCircle size={14} className="text-red-600" />
            )}
            <span>Authenticated</span>
          </div>

          <div className="flex items-center gap-2">
            {results.isSuperAdmin ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <XCircle size={14} className="text-red-600" />
            )}
            <span>Super Admin Role</span>
          </div>

          <div className="flex items-center gap-2">
            {results.corsConfigured ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <XCircle size={14} className="text-red-600" />
            )}
            <span>CORS Configured</span>
          </div>

          <div className="flex items-center gap-2">
            {results.endpointAccessible ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <XCircle size={14} className="text-red-600" />
            )}
            <span>Admin Endpoint Accessible</span>
          </div>

          {results.errors.length > 0 && (
            <div className="mt-3 rounded border border-red-200 bg-red-50 p-3">
              <p className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                <AlertCircle size={14} />
                Issues Found:
              </p>
              <ul className="list-disc list-inside space-y-1 text-red-600">
                {results.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {results.endpointAccessible && (
            <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-semibold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 size={14} />
                All checks passed! The admin panel should work.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-700 mb-2">Quick Fixes:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600">
          <li>
            Start backend: Open terminal in <code className="bg-slate-100 px-1 rounded">backend</code> folder and run{" "}
            <code className="bg-slate-100 px-1 rounded">php artisan serve</code>
          </li>
          <li>
            Check CORS: Verify <code className="bg-slate-100 px-1 rounded">backend/config/cors.php</code> allows your frontend origin
          </li>
          <li>
            Verify super_admin: Check your user role in database or create one with{" "}
            <code className="bg-slate-100 px-1 rounded">php artisan user:create</code>
          </li>
        </ol>
      </div>
    </div>
  );
}

