"use client";

import { useEffect, useState } from "react";
import {
  HelpCircle,
  Search,
  Plus,
  Edit,
  Save,
  X,
  Trash2,
  Loader2,
  BookOpen,
  MessageCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function AdminHelpContentPage() {
  const { user } = useAuth();
  const [helpContents, setHelpContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    page_route: "",
    title: "",
    quickGuide: [],
    faqs: [],
    featureHighlights: [],
    relatedPages: [],
  });
  const [newItem, setNewItem] = useState({ type: "quickGuide", data: {} });

  // Check if user is super admin
  useEffect(() => {
    if (user && user.role !== "super_admin") {
      setError("Access denied. Super admin access required.");
      setLoading(false);
    } else {
      fetchHelpContents();
    }
  }, [user]);

  const fetchHelpContents = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Fetch all help contents (we'll need to create a list endpoint or fetch known pages)
      // For now, let's fetch a few common pages to show existing content
      const commonPages = ["/", "/tenants", "/properties", "/units", "/payments/collect"];
      const contents = [];

      for (const page of commonPages) {
        try {
          const response = await fetch(`${API_BASE_URL}/help-content?page=${page}`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.quickGuide?.length > 0) {
              contents.push({
                page_route: page,
                ...data.data,
              });
            }
          }
        } catch (err) {
          // Skip if page doesn't have content
        }
      }

      setHelpContents(contents);
    } catch (err) {
      setError(err.message || "Failed to load help content");
      toast.error("Failed to load help content");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (content) => {
    setEditingId(content.page_route);
    setFormData({
      page_route: content.page_route,
      title: content.title || "",
      quickGuide: content.quickGuide || [],
      faqs: content.faqs || [],
      featureHighlights: content.featureHighlights || [],
      relatedPages: content.relatedPages || [],
    });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const payload = {
        page_route: formData.page_route,
        title: formData.title,
        content_json: {
          quickGuide: formData.quickGuide,
          faqs: formData.faqs,
          featureHighlights: formData.featureHighlights,
          relatedPages: formData.relatedPages,
        },
      };

      const response = await fetch(`${API_BASE_URL}/help-content`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save");
      }

      toast.success("Help content saved successfully");
      setEditingId(null);
      fetchHelpContents();
    } catch (err) {
      toast.error(err.message || "Failed to save help content");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      page_route: "",
      title: "",
      quickGuide: [],
      faqs: [],
      featureHighlights: [],
      relatedPages: [],
    });
  };

  const addNewItem = (type) => {
    const newItemData = { ...newItem.data };
    
    if (type === "quickGuide") {
      newItemData.step = formData.quickGuide.length + 1;
      newItemData.title = newItemData.title || "";
      newItemData.description = newItemData.description || "";
      setFormData({
        ...formData,
        quickGuide: [...formData.quickGuide, newItemData],
      });
    } else if (type === "faqs") {
      newItemData.question = newItemData.question || "";
      newItemData.answer = newItemData.answer || "";
      setFormData({
        ...formData,
        faqs: [...formData.faqs, newItemData],
      });
    } else if (type === "featureHighlights") {
      newItemData.title = newItemData.title || "";
      newItemData.description = newItemData.description || "";
      setFormData({
        ...formData,
        featureHighlights: [...formData.featureHighlights, newItemData],
      });
    } else if (type === "relatedPages") {
      newItemData.title = newItemData.title || "";
      newItemData.route = newItemData.route || "";
      setFormData({
        ...formData,
        relatedPages: [...formData.relatedPages, newItemData],
      });
    }

    setNewItem({ type, data: {} });
  };

  const removeItem = (type, index) => {
    const updated = [...formData[type]];
    updated.splice(index, 1);
    setFormData({ ...formData, [type]: updated });
  };

  const updateItem = (type, index, field, value) => {
    const updated = [...formData[type]];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, [type]: updated });
  };

  const filteredContents = helpContents.filter((content) =>
    content.page_route.toLowerCase().includes(search.toLowerCase()) ||
    content.title?.toLowerCase().includes(search.toLowerCase())
  );

  if (user?.role !== "super_admin") {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-sm text-danger">Access denied. Super admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="badge">
            <HelpCircle size={14} />
            Help Content Management
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">
            Manage Help Content
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Edit help content for any page in the application. Users will see this content when they click the help button.
          </p>
        </div>
      </div>

      {error && (
        <div className="card border-danger/20 bg-danger/5">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Create New Help Content */}
      {!editingId && (
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Create New Help Content</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Page Route (e.g., /tenants, /properties, /payments/collect)
              </label>
              <input
                type="text"
                value={formData.page_route}
                onChange={(e) => setFormData({ ...formData, page_route: e.target.value })}
                placeholder="/tenants"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Help & Support"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => {
                setEditingId("new");
                if (!formData.title) {
                  setFormData({ ...formData, title: `Help for ${formData.page_route || "Page"}` });
                }
              }}
              disabled={!formData.page_route}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Start Editing
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editingId && (
        <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingId === "new" ? "Create Help Content" : `Edit: ${formData.page_route}`}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                <Save size={16} />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>

          {/* Quick Guide Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-slate-900">Quick Guide</h4>
              </div>
              <button
                onClick={() => addNewItem("quickGuide")}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add Step
              </button>
            </div>
            <div className="space-y-3">
              {formData.quickGuide.map((item, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Step {index + 1}</span>
                    <button
                      onClick={() => removeItem("quickGuide", index)}
                      className="text-xs text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.title || ""}
                    onChange={(e) => updateItem("quickGuide", index, "title", e.target.value)}
                    placeholder="Step title"
                    className="mb-2 w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
                  />
                  <textarea
                    value={item.description || ""}
                    onChange={(e) => updateItem("quickGuide", index, "description", e.target.value)}
                    placeholder="Step description"
                    rows={2}
                    className="w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* FAQs Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-slate-900">Common Questions (FAQs)</h4>
              </div>
              <button
                onClick={() => addNewItem("faqs")}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add FAQ
              </button>
            </div>
            <div className="space-y-3">
              {formData.faqs.map((item, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">FAQ {index + 1}</span>
                    <button
                      onClick={() => removeItem("faqs", index)}
                      className="text-xs text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.question || ""}
                    onChange={(e) => updateItem("faqs", index, "question", e.target.value)}
                    placeholder="Question"
                    className="mb-2 w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
                  />
                  <textarea
                    value={item.answer || ""}
                    onChange={(e) => updateItem("faqs", index, "answer", e.target.value)}
                    placeholder="Answer"
                    rows={2}
                    className="w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Feature Highlights Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-slate-900">Feature Highlights</h4>
              </div>
              <button
                onClick={() => addNewItem("featureHighlights")}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add Highlight
              </button>
            </div>
            <div className="space-y-3">
              {formData.featureHighlights.map((item, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Highlight {index + 1}</span>
                    <button
                      onClick={() => removeItem("featureHighlights", index)}
                      className="text-xs text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.title || ""}
                    onChange={(e) => updateItem("featureHighlights", index, "title", e.target.value)}
                    placeholder="Feature title"
                    className="mb-2 w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
                  />
                  <textarea
                    value={item.description || ""}
                    onChange={(e) => updateItem("featureHighlights", index, "description", e.target.value)}
                    placeholder="Feature description"
                    rows={2}
                    className="w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Related Pages Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-slate-900">Related Pages</h4>
              </div>
              <button
                onClick={() => addNewItem("relatedPages")}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add Page
              </button>
            </div>
            <div className="space-y-3">
              {formData.relatedPages.map((item, index) => (
                <div key={index} className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Page {index + 1}</span>
                      <button
                        onClick={() => removeItem("relatedPages", index)}
                        className="text-xs text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.title || ""}
                      onChange={(e) => updateItem("relatedPages", index, "title", e.target.value)}
                      placeholder="Page title"
                      className="mb-2 w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      value={item.route || ""}
                      onChange={(e) => updateItem("relatedPages", index, "route", e.target.value)}
                      placeholder="/page-route"
                      className="w-full rounded border border-slate-200 bg-white px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Existing Help Contents List */}
      {!editingId && helpContents.length > 0 && (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Existing Help Content</h3>
            <div className="w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search pages..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {filteredContents.map((content) => (
              <div
                key={content.page_route}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{content.page_route}</p>
                  <p className="text-sm text-slate-500">{content.title}</p>
                </div>
                <button
                  onClick={() => handleEdit(content)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Edit size={16} />
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
