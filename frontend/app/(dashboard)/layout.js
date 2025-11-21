"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { API_BASE_URL } from "@/utils/api-config";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkAuthentication = async () => {
      // Check if we're in the browser
      if (typeof window === "undefined") {
        return;
      }

      const token = localStorage.getItem("auth_token");

      // If no token, redirect to login
      if (!token) {
        setIsChecking(false);
        router.push("/login");
        return;
      }

      // Validate token with backend
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          setIsChecking(false);
          setAuthError("Authentication check timed out. Please check your connection and try again.");
          setIsAuthenticated(false);
        }, 5000); // 5 second timeout

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // If 401 or 403, token is invalid
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
            setIsChecking(false);
            router.push("/login");
            return;
          }
          // For other server errors, show error but don't allow access
          setAuthError(
            `Server error (${response.status}). Please ensure the backend is running.`
          );
          setIsChecking(false);
          return;
        }

        // Token is valid
        setIsAuthenticated(true);
        setIsChecking(false);
        setAuthError(null);
      } catch (error) {
        // Handle different types of errors
        if (error.name === "AbortError") {
          // Request timed out
          setAuthError(
            "Authentication check timed out. Please ensure the backend is running and try again."
          );
        } else if (error instanceof TypeError && error.message.includes("fetch")) {
          // Network error - backend might be down
          setAuthError(
            "Unable to connect to the backend server. Please ensure the backend is running at " +
              API_BASE_URL
          );
        } else {
          // Other errors
          setAuthError(
            "Authentication check failed. Please ensure the backend is running and try again."
          );
        }
        setIsChecking(false);
        setIsAuthenticated(false);
        // Don't retry automatically - let user decide
        return;
      }
    };

  useEffect(() => {
    checkAuthentication();
    // Only run once on mount, not on every retryCount change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show error state if authentication check failed
  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Backend Connection Error
              </h2>
            </div>
          </div>
          <p className="mb-4 text-sm text-slate-600">{authError}</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setAuthError(null);
                setIsChecking(true);
                setIsAuthenticated(false);
                // Retry authentication check by incrementing retry count
                setRetryCount((prev) => prev + 1);
              }}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Retry
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("auth_user");
                router.push("/login");
              }}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Only render dashboard if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <main className="flex-1 space-y-6 bg-background px-4 py-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

