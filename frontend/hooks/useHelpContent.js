"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/utils/api-request";
import { logger } from "@/utils/logger";

// Cache for help content to avoid redundant API calls
const helpContentCache = new Map();

// Fallback help content structure
const fallbackHelpContent = {
  page: "",
  title: "Help & Support",
  quickGuide: [],
  faqs: [],
  featureHighlights: [],
  relatedPages: [],
};

/**
 * Normalize page route to help content identifier
 * Removes dynamic segments like [id] and query parameters
 */
function normalizePageRoute(pathname) {
  if (!pathname) return "/";
  
  // Remove query parameters
  const path = pathname.split("?")[0];
  
  // Map dynamic routes to their base routes
  // e.g., /tenants/123/edit -> /tenants/edit
  // e.g., /tenants/123 -> /tenants
  const dynamicRoutePatterns = [
    { pattern: /^\/tenants\/\d+\/edit$/, base: "/tenants/edit" },
    { pattern: /^\/tenants\/\d+$/, base: "/tenants" },
    { pattern: /^\/properties\/\d+\/edit$/, base: "/properties/edit" },
    { pattern: /^\/properties\/\d+$/, base: "/properties" },
    { pattern: /^\/units\/\d+\/edit$/, base: "/units/edit" },
    { pattern: /^\/units\/\d+$/, base: "/units" },
    { pattern: /^\/owners\/\d+\/edit$/, base: "/owners/edit" },
    { pattern: /^\/owners\/\d+$/, base: "/owners" },
    { pattern: /^\/tenant-units\/\d+$/, base: "/tenant-units" },
    { pattern: /^\/maintenance\/\d+\/edit$/, base: "/maintenance/edit" },
    { pattern: /^\/maintenance\/\d+$/, base: "/maintenance" },
  ];

  for (const { pattern, base } of dynamicRoutePatterns) {
    if (pattern.test(path)) {
      return base;
    }
  }

  return path || "/";
}

/**
 * Get fallback help content for common pages
 */
function getFallbackContent(pageRoute) {
  const fallbacks = {
    "/": {
      page: "/",
      title: "Dashboard Overview",
      quickGuide: [
        {
          step: 1,
          title: "View Key Metrics",
          description: "The dashboard shows important metrics like active properties, tenants, rent collected, and upcoming renewals.",
        },
        {
          step: 2,
          title: "Navigate to Sections",
          description: "Use the sidebar menu to navigate to different sections like Properties, Tenants, Payments, and Reports.",
        },
        {
          step: 3,
          title: "Monitor Maintenance",
          description: "Check the Maintenance Queue section to see active maintenance requests that need attention.",
        },
      ],
      faqs: [
        {
          question: "How do I filter dashboard data?",
          answer: "Dashboard data is automatically filtered based on your role and permissions. Contact your administrator if you need access to additional data.",
        },
        {
          question: "What do the different status indicators mean?",
          answer: "Green indicates good status, yellow indicates warnings (like invoices due), and red indicates critical issues (like outstanding rent).",
        },
      ],
      featureHighlights: [
        {
          title: "Real-time Updates",
          description: "Dashboard metrics update automatically as data changes in the system.",
        },
        {
          title: "Role-based Views",
          description: "The dashboard adapts to show relevant information based on your role (Owner, Admin, Manager, Agent).",
        },
      ],
      relatedPages: [
        { title: "Properties", route: "/properties" },
        { title: "Tenants", route: "/tenants" },
        { title: "Reports", route: "/reports" },
      ],
    },
    "/tenants": {
      page: "/tenants",
      title: "Tenants Management",
      quickGuide: [
        {
          step: 1,
          title: "Add a New Tenant",
          description: "Click the 'Add Tenant' button in the top right to create a new tenant record. Fill in all required information.",
        },
        {
          step: 2,
          title: "Search and Filter",
          description: "Use the search bar to find tenants by name, email, or phone. Use the status filter to view active, inactive, or former tenants.",
        },
        {
          step: 3,
          title: "View Tenant Details",
          description: "Click on any tenant row to view their full profile, lease history, and related documents.",
        },
        {
          step: 4,
          title: "Edit Tenant Information",
          description: "Click the edit icon on a tenant row to update their information, contact details, or status.",
        },
      ],
      faqs: [
        {
          question: "How do I filter tenants by status?",
          answer: "Use the status dropdown at the top of the page to filter by Active, Inactive, or Former tenants.",
        },
        {
          question: "Can I bulk edit multiple tenants?",
          answer: "Currently, tenant editing is done individually. Select multiple tenants to perform bulk actions if available.",
        },
        {
          question: "How do I assign a tenant to a unit?",
          answer: "Go to the Tenant Assignments page from the sidebar menu to create a new tenant-unit assignment.",
        },
      ],
      featureHighlights: [
        {
          title: "Quick Search",
          description: "Search across tenant names, emails, and phone numbers instantly.",
        },
        {
          title: "Status Management",
          description: "Easily track tenant status (Active, Inactive, Former) and filter accordingly.",
        },
      ],
      relatedPages: [
        { title: "Tenant Units", route: "/tenant-units" },
        { title: "Rent Invoices", route: "/rent-invoices" },
        { title: "Payments", route: "/payments/collect" },
      ],
    },
    "/properties": {
      page: "/properties",
      title: "Properties Management",
      quickGuide: [
        {
          step: 1,
          title: "Add a New Property",
          description: "Click 'Add Property' to create a new property. Enter the property name, address, and other details.",
        },
        {
          step: 2,
          title: "View Property Details",
          description: "Click on any property to view its details, units, tenants, and financial information.",
        },
        {
          step: 3,
          title: "Manage Units",
          description: "From a property's detail page, you can add, edit, or view all units associated with that property.",
        },
      ],
      faqs: [
        {
          question: "How do I add units to a property?",
          answer: "Navigate to the property detail page and use the Units section to add new units or manage existing ones.",
        },
        {
          question: "Can I track multiple properties?",
          answer: "Yes, you can manage multiple properties from the Properties page. Each property maintains its own units and tenant records.",
        },
      ],
      featureHighlights: [
        {
          title: "Property Portfolio",
          description: "Manage your entire property portfolio from one central location.",
        },
        {
          title: "Unit Management",
          description: "Each property can have multiple units, each with its own tenant assignments and lease details.",
        },
      ],
      relatedPages: [
        { title: "Units", route: "/units" },
        { title: "Owners", route: "/owners" },
        { title: "Reports", route: "/reports" },
      ],
    },
  };

  return fallbacks[pageRoute] || fallbackHelpContent;
}

/**
 * Hook to fetch and manage help content for the current page
 * @param {string} pageRoute - Current page route (from usePathname)
 * @returns {object} Help content and loading state
 */
export function useHelpContent(pageRoute) {
  const [helpContent, setHelpContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizedRoute = normalizePageRoute(pageRoute);

  const fetchHelpContent = useCallback(async () => {
    // Check cache first
    if (helpContentCache.has(normalizedRoute)) {
      setHelpContent(helpContentCache.get(normalizedRoute));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to fetch from API
      const content = await apiGet("/help-content", {
        page: normalizedRoute,
      });

      // Cache the content
      const formattedContent = {
        page: content.page || normalizedRoute,
        title: content.title || "Help & Support",
        quickGuide: content.quickGuide || [],
        faqs: content.faqs || [],
        featureHighlights: content.featureHighlights || [],
        relatedPages: content.relatedPages || [],
      };

      helpContentCache.set(normalizedRoute, formattedContent);
      setHelpContent(formattedContent);
    } catch (err) {
      // If API fails, use fallback content
      logger.warn("Failed to fetch help content, using fallback:", err);
      const fallback = getFallbackContent(normalizedRoute);
      helpContentCache.set(normalizedRoute, fallback);
      setHelpContent(fallback);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [normalizedRoute]);

  useEffect(() => {
    fetchHelpContent();
  }, [fetchHelpContent]);

  return {
    helpContent,
    loading,
    error,
    refetch: fetchHelpContent,
  };
}
