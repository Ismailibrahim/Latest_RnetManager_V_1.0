"use client";

import { useCallback, useState, useRef } from "react";
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function BulkImport({
  entityName = "units",
  apiEndpoint,
  templateEndpoint,
  validationRules,
  relationshipFields = {},
  onImportComplete,
  supportsUpsert = true,
}) {
  const [importMode, setImportMode] = useState("create");
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [existingItems, setExistingItems] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [properties, setProperties] = useState([]);
  const [unitTypes, setUnitTypes] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch relationship data
  const fetchRelationships = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      // Fetch properties
      if (relationshipFields.properties) {
        const propsRes = await fetch(`${API_BASE_URL}/properties?per_page=1000`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (propsRes.ok) {
          const propsData = await propsRes.json();
          setProperties(Array.isArray(propsData?.data) ? propsData.data : []);
        }
      }

      // Fetch unit types
      if (relationshipFields.unitTypes) {
        const typesRes = await fetch(`${API_BASE_URL}/unit-types`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (typesRes.ok) {
          const typesData = await typesRes.json();
          setUnitTypes(Array.isArray(typesData?.data) ? typesData.data : []);
        }
      }

      // Fetch nationalities
      if (relationshipFields.nationalities) {
        const natRes = await fetch(`${API_BASE_URL}/nationalities?paginate=false`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (natRes.ok) {
          const natData = await natRes.json();
          setNationalities(Array.isArray(natData?.data) ? natData.data : []);
        }
      }
    } catch (error) {
      console.error("Error fetching relationships:", error);
    }
  }, [relationshipFields]);

  // Download template
  const handleDownloadTemplate = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        alert("Please log in to download the template.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}${templateEndpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download template");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entityName}_import_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert(`Error downloading template: ${error.message}`);
    }
  }, [templateEndpoint, entityName]);

  // Parse CSV
  const parseCSV = useCallback((text) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV file must have at least a header row and one data row");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      data.push(row);
    }

    return data;
  }, []);


  // Handle file selection
  const handleFileSelect = useCallback(
    async (selectedFile) => {
      if (!selectedFile) return;

      if (!selectedFile.name.endsWith(".csv")) {
        alert("Please select a CSV file");
        return;
      }

      setFile(selectedFile);
      setImportResults(null);
      setIsValidating(true);

      try {
        const text = await selectedFile.text();
        const data = parseCSV(text);
        setParsedData(data);

        // Fetch relationships before validation
        await fetchRelationships();

        // Wait for relationships to be set in state
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Re-fetch relationships to ensure they're available
        const token = localStorage.getItem("auth_token");
        if (token) {
          if (relationshipFields.properties) {
            const propsRes = await fetch(`${API_BASE_URL}/properties?per_page=1000`, {
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
            if (propsRes.ok) {
              const propsData = await propsRes.json();
              const props = Array.isArray(propsData?.data) ? propsData.data : [];
              setProperties(props);

              // Fetch unit types
              if (relationshipFields.unitTypes) {
                const typesRes = await fetch(`${API_BASE_URL}/unit-types`, {
                  headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                });
                if (typesRes.ok) {
                  const typesData = await typesRes.json();
                  const types = Array.isArray(typesData?.data) ? typesData.data : [];
                  setUnitTypes(types);

                  // Fetch nationalities if needed
                  let nats = [];
                  if (relationshipFields.nationalities) {
                    const natRes = await fetch(`${API_BASE_URL}/nationalities?paginate=false`, {
                      headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                    });
                    if (natRes.ok) {
                      const natData = await natRes.json();
                      nats = Array.isArray(natData?.data) ? natData.data : [];
                      setNationalities(nats);
                    }
                  }

                  // Now validate with fresh data
                  const validation = await validateDataWithRelationships(data, props, types, nats);
                  setValidationErrors(validation.errors);
                  setExistingItems(validation.existing);
                  setIsValidating(false);
                }
              } else {
                // Fetch nationalities if needed (for tenants)
                let nats = [];
                if (relationshipFields.nationalities) {
                  const natRes = await fetch(`${API_BASE_URL}/nationalities?paginate=false`, {
                    headers: {
                      Accept: "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                  });
                  if (natRes.ok) {
                    const natData = await natRes.json();
                    nats = Array.isArray(natData?.data) ? natData.data : [];
                    setNationalities(nats);
                  }
                }

                const validation = await validateDataWithRelationships(data, props, [], nats);
                setValidationErrors(validation.errors);
                setExistingItems(validation.existing);
                setIsValidating(false);
              }
            }
          } else {
            // No relationships needed, validate directly
            const validation = await validateDataWithRelationships(data, [], [], []);
            setValidationErrors(validation.errors);
            setExistingItems(validation.existing);
            setIsValidating(false);
          }
        } else {
          setIsValidating(false);
        }
      } catch (error) {
        alert(`Error parsing CSV: ${error.message}`);
        setFile(null);
        setIsValidating(false);
      }
    },
    [parseCSV, fetchRelationships, relationshipFields]
  );

  // Validate with relationships passed directly
  const validateDataWithRelationships = useCallback(
    async (data, props, types, nationalities = []) => {
      const errors = [];
      const existing = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowErrors = [];

        if (entityName === "units") {
          // Unit validation
          if (!row.unit_number || row.unit_number.trim() === "") {
            rowErrors.push("Unit number is required");
          }

          if (!row.rent_amount || isNaN(parseFloat(row.rent_amount))) {
            rowErrors.push("Rent amount is required and must be a number");
          } else if (parseFloat(row.rent_amount) < 0) {
            rowErrors.push("Rent amount must be greater than or equal to 0");
          }

          // Property validation
          const hasPropertyName = row.property_name && row.property_name.trim() !== "";
          const hasPropertyId = row.property_id && row.property_id.trim() !== "";
          if (!hasPropertyName && !hasPropertyId) {
            rowErrors.push("Either property_name or property_id is required");
          } else {
            if (hasPropertyName) {
              const property = props.find(
                (p) => p.name?.toLowerCase() === row.property_name.toLowerCase()
              );
              if (!property) {
                rowErrors.push(`Property "${row.property_name}" not found`);
              }
            } else if (hasPropertyId) {
              const property = props.find((p) => p.id === parseInt(row.property_id));
              if (!property) {
                rowErrors.push(`Property with ID ${row.property_id} not found`);
              }
            }
          }

          // Unit type validation
          const hasUnitTypeName = row.unit_type_name && row.unit_type_name.trim() !== "";
          const hasUnitTypeId = row.unit_type_id && row.unit_type_id.trim() !== "";
          if (!hasUnitTypeName && !hasUnitTypeId) {
            rowErrors.push("Either unit_type_name or unit_type_id is required");
          } else {
            if (hasUnitTypeName) {
              const unitType = types.find(
                (ut) => ut.name?.toLowerCase() === row.unit_type_name.toLowerCase()
              );
              if (!unitType) {
                rowErrors.push(`Unit type "${row.unit_type_name}" not found`);
              }
            } else if (hasUnitTypeId) {
              const unitType = types.find((ut) => ut.id === parseInt(row.unit_type_id));
              if (!unitType) {
                rowErrors.push(`Unit type with ID ${row.unit_type_id} not found`);
              }
            }
          }

          // Security deposit validation
          if (row.security_deposit && row.security_deposit.trim() !== "") {
            if (isNaN(parseFloat(row.security_deposit))) {
              rowErrors.push("Security deposit must be a number");
            } else if (parseFloat(row.security_deposit) < 0) {
              rowErrors.push("Security deposit must be greater than or equal to 0");
            }
          }
        } else if (entityName === "tenants") {
          // Tenant validation
          if (!row.full_name || row.full_name.trim() === "") {
            rowErrors.push("Full name is required");
          }

          if (!row.phone || row.phone.trim() === "") {
            rowErrors.push("Phone is required");
          }

          // Email validation
          if (row.email && row.email.trim() !== "") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(row.email)) {
              rowErrors.push("Email must be a valid email address");
            }
          }

          // Nationality validation (optional)
          // Note: We validate names but allow IDs to pass through - backend will validate IDs
          if (row.nationality_name || row.nationality_id) {
            const hasNationalityName = row.nationality_name && row.nationality_name.trim() !== "";
            const hasNationalityId = row.nationality_id && row.nationality_id.trim() !== "";
            
            if (hasNationalityName) {
              // Only validate name if we have nationalities loaded
              if (nationalities.length > 0) {
                const searchName = (row.nationality_name || "").trim();
                const searchNameLower = searchName.toLowerCase();
                
                // Try exact match first (case-insensitive)
                let nationality = nationalities.find((n) => {
                  const name = (n.name || "").trim();
                  return name.toLowerCase() === searchNameLower;
                });
                
                // If not found, try partial match
                if (!nationality) {
                  nationality = nationalities.find((n) => {
                    const name = (n.name || "").trim().toLowerCase();
                    return name.includes(searchNameLower) || searchNameLower.includes(name);
                  });
                }
                
                if (!nationality) {
                  // Suggest similar nationalities
                  const suggestions = nationalities
                    .filter((n) => {
                      const name = (n.name || "").trim().toLowerCase();
                      if (searchNameLower.length >= 3) {
                        return name.includes(searchNameLower.substring(0, 3)) || 
                               searchNameLower.includes(name.substring(0, Math.min(3, name.length)));
                      }
                      return false;
                    })
                    .slice(0, 5)
                    .map((n) => n.name)
                    .join(", ");
                  
                  const allNationalities = nationalities.slice(0, 10).map((n) => n.name).join(", ");
                  const suggestionText = suggestions 
                    ? `. Similar: ${suggestions}`
                    : "";
                  const availableText = nationalities.length > 0
                    ? ` Available: ${allNationalities}${nationalities.length > 10 ? "..." : ""}`
                    : "";
                  rowErrors.push(`Nationality "${row.nationality_name}" not found${suggestionText}${availableText}`);
                }
              }
              // If nationalities not loaded yet, skip validation (backend will handle it)
            } else if (hasNationalityId) {
              // For IDs, just check if it's a valid number
              // Backend will validate if the ID actually exists
              const idNum = parseInt(row.nationality_id);
              if (isNaN(idNum) || idNum <= 0) {
                rowErrors.push(`Nationality ID must be a positive number`);
              }
              // If nationalities are loaded, optionally validate
              else if (nationalities.length > 0) {
                const nationality = nationalities.find((n) => {
                  // Handle both string and number IDs
                  return n.id === idNum || String(n.id) === String(row.nationality_id);
                });
                if (!nationality) {
                  // Don't error - just warn, backend will handle validation
                  // This allows the import to proceed and backend will give better error
                }
              }
            }
          }

          // ID proof type validation
          if (row.id_proof_type && !["national_id", "passport"].includes(row.id_proof_type)) {
            rowErrors.push("ID proof type must be 'national_id' or 'passport'");
          }

          // Status validation
          if (row.status && !["active", "inactive", "former"].includes(row.status)) {
            rowErrors.push("Status must be 'active', 'inactive', or 'former'");
          }
        }

        if (rowErrors.length > 0) {
          errors.push({
            row: i + 1,
            errors: rowErrors,
            data: row,
          });
        }
      }

      return { errors, existing };
    },
    [entityName]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  // Handle import
  const handleImport = useCallback(async () => {
    if (validationErrors.length > 0) {
      alert("Please fix validation errors before importing");
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Please log in to import data");
      }

      const response = await fetch(`${API_BASE_URL}${apiEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: importMode,
          [entityName]: parsedData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Import failed");
      }

      setImportResults(result.results || result);
      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  }, [parsedData, validationErrors, importMode, apiEndpoint, onImportComplete]);

  const hasErrors = validationErrors.length > 0;
  const canImport = parsedData.length > 0 && !hasErrors && !isValidating;

  return (
    <div className="space-y-6">
      {/* Import Mode Toggle */}
      {supportsUpsert && (
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Import Mode
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="create"
                checked={importMode === "create"}
                onChange={(e) => setImportMode(e.target.value)}
                className="h-4 w-4 border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-sm text-slate-700">Create Only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="upsert"
                checked={importMode === "upsert"}
                onChange={(e) => setImportMode(e.target.value)}
                className="h-4 w-4 border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-sm text-slate-700">Create or Update</span>
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {importMode === "create"
              ? "Only creates new units. Will fail if unit already exists."
              : "Creates new units or updates existing ones based on property and unit number."}
          </p>
        </div>
      )}

      {/* Template Download */}
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">CSV Template</h3>
            <p className="text-xs text-slate-500 mt-1">
              Download a sample CSV file with the correct format and example data
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
          >
            <Download size={16} />
            Download Template
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          Upload CSV File
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-slate-300 hover:border-slate-400"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <Upload size={32} className="mx-auto mb-3 text-slate-400" />
          <p className="text-sm text-slate-600 mb-2">
            Drag and drop your CSV file here, or
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <FileText size={16} />
            Browse Files
          </button>
          {file && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-700">
              <FileText size={16} />
              <span>{file.name}</span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setParsedData([]);
                  setValidationErrors([]);
                  setImportResults(null);
                }}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Validation Status */}
      {isValidating && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 size={16} className="animate-spin" />
          Validating data...
        </div>
      )}

      {/* Preview Table */}
      {parsedData.length > 0 && !isValidating && (
        <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-900">
              Preview ({parsedData.length} rows)
            </h3>
            {hasErrors && (
              <p className="text-xs text-red-600 mt-1">
                {validationErrors.length} row(s) have errors
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    Row
                  </th>
                  {Object.keys(parsedData[0] || {}).map((key) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600"
                    >
                      {key}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((row, index) => {
                  const rowErrors = validationErrors.find((e) => e.row === index + 1);
                  const hasError = !!rowErrors;
                  return (
                    <tr
                      key={index}
                      className={`border-b border-slate-100 ${
                        hasError ? "bg-red-50" : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                      {Object.values(row).map((value, i) => (
                        <td key={i} className="px-4 py-3 text-slate-700">
                          {String(value || "")}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        {hasError ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle size={16} />
                            <span className="text-xs">Error</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 size={16} />
                            <span className="text-xs">Valid</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasErrors && (
            <div className="px-5 py-4 border-t border-slate-200 bg-red-50">
              <h4 className="text-sm font-semibold text-red-900 mb-2">Errors:</h4>
              <div className="space-y-1">
                {validationErrors.map((error, i) => (
                  <div key={i} className="text-xs text-red-700">
                    <strong>Row {error.row}:</strong> {error.errors.join(", ")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Button */}
      {parsedData.length > 0 && !isValidating && (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleImport}
            disabled={!canImport || isImporting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload size={16} />
                Import {parsedData.length} {entityName}
              </>
            )}
          </button>
        </div>
      )}

      {/* Import Results */}
      {importResults && (
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Import Results</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl bg-green-50 p-4 border border-green-200">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <CheckCircle2 size={20} />
                <span className="text-sm font-semibold">Created</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {importResults.created || 0}
              </p>
            </div>
            {importMode === "upsert" && (
              <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <AlertCircle size={20} />
                  <span className="text-sm font-semibold">Updated</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {importResults.updated || 0}
                </p>
              </div>
            )}
            <div className="rounded-xl bg-red-50 p-4 border border-red-200">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <XCircle size={20} />
                <span className="text-sm font-semibold">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-900">
                {importResults.failed || 0}
              </p>
            </div>
          </div>
          {importResults.errors && importResults.errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
              <h4 className="text-sm font-semibold text-red-900 mb-2">Errors:</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {importResults.errors.map((error, i) => (
                  <div key={i} className="text-xs text-red-700">
                    <strong>Row {error.row}</strong> ({error.unit_number || error.full_name || "N/A"}):{" "}
                    {error.errors?.join(", ") || error.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

