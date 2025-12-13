"use client";

import { useState } from "react";
import { Upload, X, FileText, AlertCircle } from "lucide-react";

export default function ReceiptUpload({ value, onChange, error }) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFile = (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PDF, JPG, or PNG file.");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB.");
      return;
    }

    onChange(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
  };

  return (
    <div>
      {!value ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-6 transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : error
              ? "border-red-300 bg-red-50"
              : "border-slate-300 bg-slate-50"
          }`}
        >
          <input
            type="file"
            id="receipt-upload"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleChange}
            className="hidden"
          />
          <label
            htmlFor="receipt-upload"
            className="flex cursor-pointer flex-col items-center justify-center gap-2"
          >
            <Upload size={32} className="text-slate-400" />
            <div className="text-center">
              <span className="text-sm font-medium text-slate-700">
                Click to upload or drag and drop
              </span>
              <p className="mt-1 text-xs text-slate-500">
                PDF, JPG, or PNG (Max 10MB)
              </p>
            </div>
          </label>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {preview ? (
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="h-16 w-16 rounded object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-100">
                  <FileText size={24} className="text-slate-400" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{value.name}</p>
                <p className="text-xs text-slate-500">
                  {(value.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

