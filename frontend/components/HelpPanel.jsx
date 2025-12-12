"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  HelpCircle,
  BookOpen,
  MessageCircle,
  Sparkles,
  ExternalLink,
  Loader2,
  Search,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useHelpContent } from "@/hooks/useHelpContent";
import clsx from "clsx";

export function HelpPanel({ isOpen, onClose }) {
  const pathname = usePathname();
  const { helpContent, loading } = useHelpContent(pathname);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);

  // Focus search input when panel opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close panel on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Filter content based on search query
  const filterContent = (items, searchText) => {
    if (!searchText) return items;
    const query = searchText.toLowerCase();
    return items.filter((item) => {
      const title = (item.title || item.question || "").toLowerCase();
      const description = (item.description || item.answer || "").toLowerCase();
      return title.includes(query) || description.includes(query);
    });
  };

  const filteredQuickGuide = helpContent
    ? filterContent(helpContent.quickGuide || [], searchQuery)
    : [];
  const filteredFaqs = helpContent
    ? filterContent(helpContent.faqs || [], searchQuery)
    : [];
  const filteredHighlights = helpContent
    ? filterContent(helpContent.featureHighlights || [], searchQuery)
    : [];

  const handleFeedback = (helpful) => {
    if (feedbackGiven) return;
    setFeedbackGiven(true);
    // TODO: Send feedback to backend API
    // apiPost('/help-content/feedback', { page: pathname, helpful });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity lg:bg-slate-900/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl lg:w-[480px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2
                id="help-panel-title"
                className="text-lg font-semibold text-slate-900"
              >
                {loading ? "Loading Help..." : helpContent?.title || "Help & Support"}
              </h2>
              <p className="text-xs text-slate-500">Get help with this page</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close help panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search help content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Quick Guide */}
              {filteredQuickGuide.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold text-slate-900">
                      Quick Guide
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {filteredQuickGuide.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                      >
                        <div className="mb-2 flex items-start gap-3">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {item.step || index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">
                              {item.title}
                            </h4>
                            <p className="mt-1 text-sm text-slate-600">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Feature Highlights */}
              {filteredHighlights.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold text-slate-900">
                      Feature Highlights
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {filteredHighlights.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-primary/20 bg-primary/5 p-4"
                      >
                        <h4 className="font-semibold text-slate-900">
                          {item.title}
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* FAQs */}
              {filteredFaqs.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold text-slate-900">
                      Common Questions
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {filteredFaqs.map((item, index) => (
                      <details
                        key={index}
                        className="group rounded-xl border border-slate-200 bg-white"
                      >
                        <summary className="cursor-pointer p-4 font-semibold text-slate-900 transition-colors hover:bg-slate-50">
                          {item.question}
                        </summary>
                        <div className="border-t border-slate-100 p-4 pt-3 text-sm text-slate-600">
                          {item.answer}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              {/* Related Pages */}
              {helpContent?.relatedPages?.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold text-slate-900">
                      Related Pages
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {helpContent.relatedPages.map((page, index) => (
                      <Link
                        key={index}
                        href={page.route}
                        onClick={onClose}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      >
                        <span>{page.title}</span>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* No Results */}
              {searchQuery &&
                filteredQuickGuide.length === 0 &&
                filteredFaqs.length === 0 &&
                filteredHighlights.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-sm text-slate-500">
                      No results found for "{searchQuery}"
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-2 text-sm font-medium text-primary hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50/50 px-6 py-4">
          {!feedbackGiven ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Was this helpful?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFeedback(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Yes
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  No
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Thank you for your feedback!</p>
          )}
        </div>
      </div>
    </>
  );
}
