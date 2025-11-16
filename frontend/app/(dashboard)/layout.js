"use client";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function DashboardLayout({ children }) {
  return (
    <ErrorBoundary>
      <div className="app-shell">
        <Sidebar />
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

