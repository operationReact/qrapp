import { useState, useRef, useCallback } from "react";
import {
  validateBulkMenuUpload,
  commitBulkMenuUpload,
  downloadBulkMenuTemplate,
} from "../../services/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

const UPLOAD_MODES = [
  { value: "INSERT_ONLY", label: "Insert Only", desc: "Only add new items. Skip items that already exist." },
  { value: "UPDATE_ONLY", label: "Update Only", desc: "Only update existing items. Skip new items." },
  { value: "UPSERT", label: "Upsert (Insert + Update)", desc: "Add new items and update existing ones." },
];

function StatusBadge({ status }) {
  if (status === "ROW_OK") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
        <CheckCircle2 className="size-3" /> Valid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
      <XCircle className="size-3" /> Error
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * Multi-step Bulk Menu Upload Modal.
 *
 * Step 1 — File Drop  : Drag/drop or click to upload. Template download link.
 * Step 2 — Preview    : Table of all rows, errors highlighted. Confirm button.
 * Step 3 — Summary    : Upload result summary.
 */
export default function BulkMenuUploadModal({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1 | 2 | 3
  const [uploadMode, setUploadMode] = useState("INSERT_ONLY");
  const [autoCreateCategories, setAutoCreateCategories] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // BulkMenuPreviewResponse
  const [summary, setSummary] = useState(null); // BulkMenuUploadSummary
  const [expandedRows, setExpandedRows] = useState(new Set());
  const fileInputRef = useRef(null);

  // ── Reset on close ────────────────────────────────────────────────────────
  const handleClose = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setSummary(null);
    setError(null);
    setExpandedRows(new Set());
    onClose();
  };

  // ── File selection ────────────────────────────────────────────────────────
  const selectFile = (f) => {
    const ext = f.name.toLowerCase();
    if (!ext.endsWith(".csv") && !ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
      setError("Only .csv and .xlsx files are supported.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File exceeds 10 MB limit.");
      return;
    }
    setFile(f);
    setError(null);
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) selectFile(dropped);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  // ── Template download ─────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const resp = await downloadBulkMenuTemplate();
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "menu_bulk_upload_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download template.");
    }
  };

  // ── Validate (Step 1 → 2) ─────────────────────────────────────────────────
  const handleValidate = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await validateBulkMenuUpload(file);
      setPreview(resp.data);
      setStep(2);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Validation failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Commit (Step 2 → 3) ───────────────────────────────────────────────────
  const handleCommit = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await commitBulkMenuUpload({
        uploadMode,
        autoCreateCategories,
        rows: preview.rows,
      });
      setSummary(resp.data);
      setStep(3);
      onSuccess?.();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Commit failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Row error expand/collapse ─────────────────────────────────────────────
  const toggleRowExpand = (rowNum) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(rowNum) ? next.delete(rowNum) : next.add(rowNum);
      return next;
    });
  };

  const hasAnyErrors = preview?.invalidRows > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        {/* ─── Header ─── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            Bulk Menu Upload
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {["Upload File", "Preview & Validate", "Summary"].map((label, i) => {
              const s = i + 1;
              const active = step === s;
              const done = step > s;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 text-sm font-medium ${active ? "text-primary" : done ? "text-emerald-600" : "text-muted-foreground"}`}>
                    <span className={`size-6 flex items-center justify-center rounded-full text-xs font-bold border-2 ${active ? "border-primary bg-primary text-white" : done ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-muted bg-muted/40 text-muted-foreground"}`}>
                      {done ? <CheckCircle2 className="size-3.5" /> : s}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {i < 2 && <div className="h-px w-6 bg-border" />}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        {/* ─── Body ─── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ─── Step 1: Upload ─── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Mode selector */}
              <div>
                <p className="text-sm font-medium mb-2">Upload Mode</p>
                <div className="grid sm:grid-cols-3 gap-2">
                  {UPLOAD_MODES.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setUploadMode(m.value)}
                      className={`text-left rounded-xl border p-3 text-sm transition-all ${uploadMode === m.value ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/40"}`}
                    >
                      <p className="font-medium">{m.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-create categories toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateCategories}
                  onChange={(e) => setAutoCreateCategories(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                <span className="text-sm">
                  <span className="font-medium">Auto-create categories</span>
                  <span className="text-muted-foreground ml-1">— new categories will be created if they don't exist</span>
                </span>
              </label>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragging ? "border-primary bg-primary/5" : file ? "border-emerald-400 bg-emerald-50" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && selectFile(e.target.files[0])}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="size-8 text-emerald-500" />
                    <p className="font-medium text-emerald-700">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · Click to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className={`size-8 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-medium">Drop your file here or <span className="text-primary underline underline-offset-2">browse</span></p>
                    <p className="text-xs text-muted-foreground">Excel files only (.xlsx) · Max 10 MB</p>
                  </div>
                )}
              </div>

              {/* Template download */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Need a template?</p>
                  <p className="text-xs text-muted-foreground">Download the sample CSV to see the expected format.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="shrink-0">
                  <Download className="size-4 mr-1.5" /> Download Template
                </Button>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ─── Step 2: Preview ─── */}
          {step === 2 && preview && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold">{preview.totalRows}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total Rows</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{preview.validRows}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Valid</p>
                </div>
                <div className={`rounded-xl border p-3 text-center ${preview.invalidRows > 0 ? "border-red-200 bg-red-50" : "border-border bg-muted/30"}`}>
                  <p className={`text-2xl font-bold ${preview.invalidRows > 0 ? "text-red-700" : "text-muted-foreground"}`}>{preview.invalidRows}</p>
                  <p className={`text-xs mt-0.5 ${preview.invalidRows > 0 ? "text-red-600" : "text-muted-foreground"}`}>Errors</p>
                </div>
              </div>

              {hasAnyErrors && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <span>
                    <strong>{preview.invalidRows} row{preview.invalidRows !== 1 ? "s" : ""} have errors</strong> and will be skipped during import.
                    Fix the issues in your file and re-upload, or proceed to import only the valid rows.
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-auto rounded-xl border">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-muted/40 border-b text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 w-10">#</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Veg</th>
                      <th className="px-3 py-2">Inventory</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <>
                        <tr
                          key={row.rowNumber}
                          className={`border-b transition-colors ${row.status === "ROW_ERROR" ? "bg-red-50/60" : "hover:bg-muted/20"}`}
                        >
                          <td className="px-3 py-2 text-muted-foreground text-xs">{row.rowNumber}</td>
                          <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                          <td className="px-3 py-2 font-medium">{row.name || <span className="text-red-500 italic">missing</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.categoryName || "—"}</td>
                          <td className="px-3 py-2">{row.price != null ? `₹${row.price}` : <span className="text-red-500 italic">missing</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.isVeg ?? "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.inventoryMode ?? "UNLIMITED"}</td>
                          <td className="px-3 py-2">
                            {row.errors?.length > 0 && (
                              <button
                                onClick={() => toggleRowExpand(row.rowNumber)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {expandedRows.has(row.rowNumber) ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Error detail row */}
                        {row.errors?.length > 0 && expandedRows.has(row.rowNumber) && (
                          <tr key={`err-${row.rowNumber}`} className="bg-red-50/80">
                            <td colSpan={8} className="px-3 py-2">
                              <ul className="space-y-1">
                                {row.errors.map((e, i) => (
                                  <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                                    <XCircle className="size-3 mt-0.5 shrink-0" />
                                    <span><strong>{e.column}:</strong> {e.message}</span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Step 3: Summary ─── */}
          {step === 3 && summary && (
            <div className="space-y-5 py-2">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="size-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <CheckCircle2 className="size-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Upload Complete</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Mode: {summary.uploadMode}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Rows", value: summary.totalRows, color: "default" },
                  { label: "Inserted", value: summary.insertedCount, color: "emerald" },
                  { label: "Updated", value: summary.updatedCount, color: "blue" },
                  { label: "Skipped", value: summary.skippedCount, color: "amber" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color === "emerald" ? "border-emerald-200 bg-emerald-50" : s.color === "blue" ? "border-blue-200 bg-blue-50" : s.color === "amber" ? "border-amber-200 bg-amber-50" : "border-border bg-muted/30"}`}>
                    <p className={`text-2xl font-bold ${s.color === "emerald" ? "text-emerald-700" : s.color === "blue" ? "text-blue-700" : s.color === "amber" ? "text-amber-700" : ""}`}>{s.value}</p>
                    <p className={`text-xs mt-0.5 ${s.color === "emerald" ? "text-emerald-600" : s.color === "blue" ? "text-blue-600" : s.color === "amber" ? "text-amber-600" : "text-muted-foreground"}`}>{s.label}</p>
                  </div>
                ))}
              </div>

              {summary.skippedErrors?.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800 mb-2">Skipped Rows ({summary.skippedErrors.length})</p>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {summary.skippedErrors.map((e, i) => (
                      <li key={i} className="text-xs text-amber-800">Row {e.rowNumber} · <strong>{e.column}:</strong> {e.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0">
          {step === 1 && (
            <div className="flex w-full justify-between gap-3">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleValidate} disabled={!file || loading}>
                {loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Validating…</> : "Validate File"}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex w-full justify-between gap-3">
              <Button variant="outline" onClick={() => { setStep(1); setPreview(null); setError(null); }}>
                ← Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button
                  onClick={handleCommit}
                  disabled={loading || preview?.validRows === 0}
                >
                  {loading
                    ? <><Loader2 className="size-4 mr-2 animate-spin" /> Importing…</>
                    : `Import ${preview?.validRows ?? 0} Valid Row${preview?.validRows !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex w-full justify-between gap-3">
              <Button variant="outline" onClick={() => { setStep(1); setFile(null); setPreview(null); setSummary(null); setError(null); }}>
                Upload Another
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

