"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16">
          <div className="w-full max-w-2xl">
            <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-lg">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Application Error
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    A critical error occurred. Please refresh the page or contact support.
                  </p>
                </div>
              </div>

              {process.env.NODE_ENV === "development" && error && (
                <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-red-900">
                    Error Details:
                  </p>
                  <pre className="max-h-48 overflow-auto rounded bg-white p-3 text-xs text-red-800">
                    {error.toString()}
                    {error.stack && (
                      <>
                        {"\n\n"}
                        {error.stack}
                      </>
                    )}
                  </pre>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
                <button
                  onClick={() => window.location.href = "/"}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Home className="h-4 w-4" />
                  Go home
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

