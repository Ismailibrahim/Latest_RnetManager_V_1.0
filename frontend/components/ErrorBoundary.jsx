"use client";

import { Component } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Log to error reporting service in production
    if (process.env.NODE_ENV === "production") {
      // Example: log to error tracking service
      // logErrorToService(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const { fallback, showDetails = false } = this.props;

      if (fallback) {
        return fallback(error, errorInfo, this.handleReset);
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16">
          <div className="w-full max-w-2xl">
            <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-lg">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Something went wrong
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    An unexpected error occurred. Please try again.
                  </p>
                </div>
              </div>

              {showDetails && error && (
                <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-red-900">
                    Error Details:
                  </p>
                  <pre className="max-h-48 overflow-auto rounded bg-white p-3 text-xs text-red-800">
                    {error.toString()}
                    {errorInfo?.componentStack && (
                      <>
                        {"\n\n"}
                        {errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Home className="h-4 w-4" />
                  Go home
                </Link>
              </div>

              {process.env.NODE_ENV === "development" && (
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-900">
                    Development Mode: Error details are shown above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

