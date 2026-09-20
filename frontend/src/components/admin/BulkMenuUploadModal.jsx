import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  bulkMenuValidate,
  bulkMenuCommit,
  bulkMenuDownloadTemplate,
} from "../../services/menu-service";
import { CheckCircleIcon, CircleNotchIcon, DownloadIcon, MicrosoftExcelLogoIcon, UploadIcon, XCircleIcon } from "@phosphor-icons/react";
import { useLocation as useActiveLocation } from "@/context/LocationContext";

const STEP = {
  IDLE: "IDLE",
  VALIDATING: "VALIDATING",
  PREVIEW: "PREVIEW",
  COMMITTING: "COMMITTING",
  DONE: "DONE",
};

export default function BulkMenuUploadModal({ open, onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(STEP.IDLE);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null); // BulkMenuPreviewResponse
  const [summary, setSummary] = useState(null); // BulkMenuUploadSummary
  const [uploadMode, setUploadMode] = useState("UPSERT");
  const [error, setError] = useState(null);
  const { activeLocationId } = useActiveLocation();

  // ---- helpers ----
  const reset = () => {
    setStep(STEP.IDLE);
    setSelectedFile(null);
    setPreview(null);
    setSummary(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickFile = (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError("Please upload an Excel file (.xlsx or .xls).");
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files[0]);
  };

  const handleValidate = async () => {
    if (!selectedFile) return;
    setStep(STEP.VALIDATING);
    setError(null);
    try {
      const res = await bulkMenuValidate(selectedFile, activeLocationId);
      setPreview(res.data);
      setStep(STEP.PREVIEW);
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Validation failed.",
      );
      setStep(STEP.IDLE);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    const validRows = preview.rows.filter((r) => r.status === "ROW_OK");
    if (validRows.length === 0) return;
    setStep(STEP.COMMITTING);
    setError(null);
    try {
      const res = await bulkMenuCommit(validRows, uploadMode, activeLocationId);
      setSummary(res.data);
      setStep(STEP.DONE);
      onSuccess?.();
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Commit failed.",
      );
      setStep(STEP.PREVIEW);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await bulkMenuDownloadTemplate();
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "menu_bulk_upload_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download template.");
    }
  };

  const hasErrors = preview && preview.invalidRows > 0;
  const canCommit =
    preview && preview.invalidRows === 0 && preview.validRows > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <MicrosoftExcelLogoIcon weight="fill" className="size-5 text-primary" />
                Bulk Menu Upload
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Upload an Excel file to add or update multiple menu items at
                once.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body – scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* ---- IDLE / file picker ---- */}
          {(step === STEP.IDLE || step === STEP.VALIDATING) && (
            <>
              {/* Download template hint */}
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <DownloadIcon className="size-4 shrink-0" />
                <span>
                  Don't have the template?{" "}
                  <button
                    onClick={handleDownloadTemplate}
                    className="font-semibold underline underline-offset-2 hover:text-blue-900"
                  >
                    Download the Excel template
                  </button>{" "}
                  and fill it in before uploading.
                </span>
              </div>

              {/* Drop zone */}
              <div
                className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-colors cursor-pointer py-12 ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : selectedFile
                      ? "border-green-400 bg-green-50"
                      : "border-slate-200 bg-slate-50 hover:border-primary/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files[0])}
                />
                {selectedFile ? (
                  <>
                    <CheckCircleIcon className="size-10 text-green-500" />
                    <div className="text-center">
                      <p className="font-semibold text-green-700">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB — click to
                        change
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <UploadIcon className="size-10 text-slate-400" />
                    <div className="text-center">
                      <p className="font-semibold text-slate-700">
                        Drop your Excel file here
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        or click to browse (.xlsx / .xls, max 10 MB)
                      </p>
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <XCircleIcon className="size-4 shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}

          {/* ---- PREVIEW ---- */}
          {(step === STEP.PREVIEW || step === STEP.COMMITTING) && preview && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Total Rows"
                  value={preview.totalRows}
                  color="slate"
                />
                <StatCard
                  label="Valid"
                  value={preview.validRows}
                  color="green"
                />
                <StatCard
                  label="Errors"
                  value={preview.invalidRows}
                  color={preview.invalidRows > 0 ? "red" : "green"}
                />
              </div>

              {/* Error banner */}
              {hasErrors && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <XCircleIcon className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      Fix all errors before committing
                    </p>
                    <p className="text-xs mt-0.5">
                      Correct the highlighted rows in your Excel file and
                      re-upload.
                    </p>
                  </div>
                </div>
              )}

              {canCommit && (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <CheckCircleIcon className="size-4 shrink-0" />
                  All rows are valid. Ready to commit{" "}
                  <span className="font-semibold">
                    {preview.validRows} items
                  </span>
                  .
                </div>
              )}

              {/* Upload mode selector */}
              {canCommit && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground font-medium">
                    Upload mode:
                  </span>
                  {["UPSERT", "INSERT_ONLY", "UPDATE_ONLY"].map((mode) => (
                    <label
                      key={mode}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="uploadMode"
                        value={mode}
                        checked={uploadMode === mode}
                        onChange={() => setUploadMode(mode)}
                        className="accent-primary"
                      />
                      <span
                        className={
                          uploadMode === mode
                            ? "font-semibold text-primary"
                            : "text-slate-600"
                        }
                      >
                        {mode === "UPSERT"
                          ? "Upsert"
                          : mode === "INSERT_ONLY"
                            ? "Insert only"
                            : "Update only"}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Row table */}
              <div className="rounded-xl border overflow-hidden text-sm">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-12">
                          #
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                          Name
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                          Category
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                          Price
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                          Status
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                          Errors
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.rows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={
                            row.status === "ROW_ERROR"
                              ? "bg-red-50"
                              : "bg-white"
                          }
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.rowNumber}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {row.name || (
                              <span className="text-muted-foreground italic">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.categoryName || "—"}
                          </td>
                          <td className="px-3 py-2">
                            {row.price != null ? `₹${row.price}` : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {row.status === "ROW_OK" ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs">
                                OK
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs">
                                Error
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-red-600">
                            {row.errors && row.errors.length > 0 ? (
                              <ul className="space-y-0.5">
                                {row.errors.map((e, i) => (
                                  <li key={i}>
                                    <span className="font-semibold">
                                      {e.column}:
                                    </span>{" "}
                                    {e.message}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <XCircleIcon className="size-4 shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}

          {/* ---- DONE ---- */}
          {step === STEP.DONE && summary && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <CheckCircleIcon className="size-14 text-green-500" />
              <div>
                <h3 className="text-lg font-semibold">Upload Complete!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your menu has been updated successfully.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 w-full max-w-sm mt-2">
                <StatCard
                  label="Inserted"
                  value={summary.insertedCount}
                  color="green"
                />
                <StatCard
                  label="Updated"
                  value={summary.updatedCount}
                  color="blue"
                />
                <StatCard
                  label="Skipped"
                  value={summary.skippedCount}
                  color="slate"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50/60 shrink-0 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={step === STEP.DONE ? handleClose : reset}
            disabled={step === STEP.VALIDATING || step === STEP.COMMITTING}
          >
            {step === STEP.DONE ? "Close" : "Reset"}
          </Button>

          <div className="flex gap-2">
            {step === STEP.DONE ? null : step === STEP.PREVIEW ||
              step === STEP.COMMITTING ? (
              <>
                <Button
                  variant="outline"
                  onClick={reset}
                  disabled={step === STEP.COMMITTING}
                >
                  Re-upload
                </Button>
                <Button
                  onClick={handleCommit}
                  disabled={!canCommit || step === STEP.COMMITTING}
                  className="gap-2"
                >
                  {step === STEP.COMMITTING && (
                    <CircleNotchIcon className="size-4 animate-spin" />
                  )}
                  {step === STEP.COMMITTING
                    ? "Committing…"
                    : `Commit ${preview?.validRows ?? ""} Items`}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleValidate}
                disabled={!selectedFile || step === STEP.VALIDATING}
                className="gap-2"
              >
                {step === STEP.VALIDATING && (
                  <CircleNotchIcon className="size-4 animate-spin" />
                )}
                {step === STEP.VALIDATING ? "Validating…" : "Validate File"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    slate: "bg-slate-50 border-slate-200 text-slate-700",
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
  };
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-center ${colors[color] || colors.slate}`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-0.5 font-medium">{label}</div>
    </div>
  );
}
