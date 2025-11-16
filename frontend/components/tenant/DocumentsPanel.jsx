"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  Shield,
  Trash2,
  UploadCloud,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function formatBytes(bytes) {
  const size = Number(bytes);

  if (!Number.isFinite(size) || size <= 0) {
    return "—";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** index;

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return "";
  }

  return date.toLocaleString();
}

export default function DocumentsPanel({ tenantId, onChanged }) {
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [markAsIdProof, setMarkAsIdProof] = useState(false);
  const [updatingDocumentId, setUpdatingDocumentId] = useState(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function load() {
      setDocumentsLoading(true);
      setDocumentsError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          throw new Error("Please log in so we can load tenant documents.");
        }

        const response = await fetch(
          `${API_BASE_URL}/tenants/${tenantId}/documents?paginate=false`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load documents (HTTP ${response.status}).`;
          throw new Error(message);
        }

        const payload = await response.json();
        const items = Array.isArray(payload?.data) ? payload.data : [];

        if (!isMounted) {
          return;
        }

        setDocuments(
          [...items].sort((a, b) => {
            const aDate = a?.created_at ? new Date(a.created_at).valueOf() : 0;
            const bDate = b?.created_at ? new Date(b.created_at).valueOf() : 0;
            return bDate - aDate;
          }),
        );
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        if (isMounted) {
          setDocumentsError(error.message);
          setDocuments([]);
        }
      } finally {
        if (isMounted) {
          setDocumentsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tenantId]);

  const refreshDocuments = async () => {
    if (!tenantId) {
      return;
    }

    setDocumentsError(null);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in so we can load tenant documents.");
      }

      const response = await fetch(
        `${API_BASE_URL}/tenants/${tenantId}/documents?paginate=false`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to refresh documents (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const payload = await response.json();
      const items = Array.isArray(payload?.data) ? payload.data : [];

      setDocuments(
        [...items].sort((a, b) => {
          const aDate = a?.created_at ? new Date(a.created_at).valueOf() : 0;
          const bDate = b?.created_at ? new Date(b.created_at).valueOf() : 0;
          return bDate - aDate;
        }),
      );
    } catch (error) {
      setDocumentsError(error.message);
    } finally {
      if (typeof onChanged === "function") {
        onChanged();
      }
    }
  };

  const handleFileInputChange = async (event) => {
    const file = event.target.files?.[0];
    setUploadError(null);

    if (!file || !tenantId) {
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in before uploading a document.");
      }

      const formData = new FormData();
      formData.append("file", file);
      if (markAsIdProof) {
        formData.append("is_id_proof", "true");
      }

      const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/documents`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to upload document (HTTP ${response.status}).`;
        throw new Error(message);
      }

      await refreshDocuments();
      setMarkAsIdProof(false);
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleSetAsIdProof = async (documentId) => {
    if (!tenantId) {
      return;
    }

    setUpdatingDocumentId(documentId);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in before updating a document.");
      }

      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_id_proof: true }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to update document (HTTP ${response.status}).`;
        throw new Error(message);
      }

      await refreshDocuments();
    } catch (error) {
      setDocumentsError(error.message);
    } finally {
      setUpdatingDocumentId(null);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!tenantId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this document? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setDeletingDocumentId(documentId);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in before deleting a document.");
      }

      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to delete document (HTTP ${response.status}).`;
        throw new Error(message);
      }

      await refreshDocuments();
    } catch (error) {
      setDocumentsError(error.message);
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const handleDownloadDocument = async (documentId) => {
    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in before downloading a document.");
      }

      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.message ??
          `Unable to download document (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const payload = await response.json();
      const document = payload?.data ?? payload ?? {};

      if (document.download_url) {
        window.open(document.download_url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("Download link is unavailable for this document.");
      }
    } catch (error) {
      setDocumentsError(error.message);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <FileText size={16} className="text-primary" />
            Tenant documents
          </h2>
          <p className="text-xs text-slate-500">
            Upload and manage ID proof or supporting files for this tenant.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
              checked={markAsIdProof}
              onChange={(event) => setMarkAsIdProof(event.target.checked)}
              disabled={uploading}
            />
            Mark upload as ID proof
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <UploadCloud size={16} />
                Upload file
              </>
            )}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {uploadError ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <p>{uploadError}</p>
        </div>
      ) : null}

      {documentsLoading ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p>Loading documents…</p>
        </div>
      ) : documentsError ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">We ran into a problem.</p>
            <p className="mt-1 text-xs text-red-500">{documentsError}</p>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-500">
          No documents uploaded yet. Attach ID proof or supporting files to keep
          everything organized.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {documents.map((document) => {
            const isIdProof = document?.category === "id_proof";
            const isUpdating = updatingDocumentId === document.id;
            const isDeleting = deletingDocumentId === document.id;

            return (
              <li
                key={document.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white/80 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{document.title}</p>
                    {isIdProof ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        <Shield size={12} />
                        ID proof
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {document.original_name} · {formatBytes(document.size)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Uploaded {formatDateTime(document.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadDocument(document.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  {!isIdProof ? (
                    <button
                      type="button"
                      onClick={() => handleSetAsIdProof(document.id)}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Updating…
                        </>
                      ) : (
                        <>
                          <Shield size={14} />
                          Mark as ID proof
                        </>
                      )}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(document.id)}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Deleting…
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

