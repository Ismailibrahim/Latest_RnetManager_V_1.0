import { API_BASE_URL } from "./api-config";

/**
 * Print a document (invoice/receipt/voucher) using the configurable template system.
 *
 * @param {string} type - Document type (e.g., 'rent-invoice', 'maintenance-invoice', etc.)
 * @param {number|string} id - Document ID
 * @param {Object} options - Optional configuration
 * @param {boolean} options.format - Output format: 'html' (default) or 'pdf'
 * @param {Function} options.onError - Error callback
 * @param {Function} options.onSuccess - Success callback
 * @returns {Promise<void>}
 */
export async function printDocument(type, id, options = {}) {
  const { format = "html", onError, onSuccess } = options;

  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be logged in before printing a document.");
    }

    const url = `${API_BASE_URL}/print/${type}/${id}?format=${format}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.message ??
          `Unable to print document (HTTP ${response.status}).`
      );
    }

    if (format === "pdf") {
      // For PDF, create blob and open in new window
      const blob = await response.blob();
      const pdfUrl = URL.createObjectURL(blob);
      const printWindow = window.open(pdfUrl, "_blank");

      if (!printWindow) {
        throw new Error(
          "Unable to open print window. Check your browser settings."
        );
      }

      printWindow.onload = () => {
        printWindow.print();
        if (onSuccess) onSuccess();
      };

      // Clean up blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 1000);
    } else {
      // For HTML, write to new window and trigger print
      const data = await response.json();
      const html = data.html;

      if (!html) {
        throw new Error("No HTML content received from server.");
      }

      const printWindow = window.open("", "_blank", "width=900,height=650");

      if (!printWindow) {
        throw new Error(
          "Unable to open print window. Check your browser settings."
        );
      }

      // Write HTML to window
      printWindow.document.write(html);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          if (onSuccess) onSuccess();
        }, 150);
      };

      // Fallback if onload doesn't fire
      setTimeout(() => {
        if (printWindow.document.readyState === "complete") {
          printWindow.focus();
          printWindow.print();
          if (onSuccess) onSuccess();
        }
      }, 500);
    }
  } catch (error) {
    const errorMessage =
      error?.message ?? "An error occurred while printing the document.";
    if (onError) {
      onError(errorMessage);
    } else {
      console.error("Print error:", errorMessage);
      alert(errorMessage);
    }
    throw error;
  }
}

/**
 * Export document as PDF (download).
 *
 * @param {string} type - Document type
 * @param {number|string} id - Document ID
 * @param {string} filename - Optional filename (without extension)
 * @returns {Promise<void>}
 */
export async function exportDocumentAsPdf(type, id, filename = null) {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("You must be logged in before exporting a document.");
    }

    const url = `${API_BASE_URL}/print/${type}/${id}?format=pdf`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/pdf",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.message ??
          `Unable to export document (HTTP ${response.status}).`
      );
    }

    const blob = await response.blob();
    const url_blob = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url_blob;
    link.download = filename
      ? `${filename}.pdf`
      : `${type}-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url_blob);
  } catch (error) {
    console.error("Export error:", error);
    throw error;
  }
}
