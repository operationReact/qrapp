import { useState, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updateMenuItem,
  generateAiImageOptions,
  applyGeneratedImage,
} from "@/services/menu-service";
import { baseURL } from "@/services";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  UploadIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  Wand2,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ImageOff,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function computeSrc(url) {
  if (!url) return null;
  if (["http://", "https://", "blob:"].some((p) => url.startsWith(p))) return url;
  return `${baseURL}${url}`;
}

// ─── Per-item card ─────────────────────────────────────────────────────────────

function ItemCard({ item, onSaved }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  /* ── local state ── */
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState(null); // null | "upload" | "ai"
  const [savedLocally, setSavedLocally] = useState(false);

  // upload state
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // AI state
  const [aiOptions, setAiOptions] = useState([]);
  const [selectedAiUrl, setSelectedAiUrl] = useState(null);
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [aiError, setAiError] = useState(null);

  // ── save via file / url ──
  const saveMutation = useMutation({
    mutationFn: ({ itemId, payload }) => updateMenuItem(itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      toast.success(`Image saved for "${item.name}"`);
      setSavedLocally(true);
      onSaved(item.id);
      cleanupPreview();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to save image");
    },
  });

  // ── AI mutations ──
  const generateMutation = useMutation({
    mutationFn: ({ isRetry = false } = {}) =>
      generateAiImageOptions(
        item.id,
        1,
        additionalPrompt || null,
        isRetry ? aiOptions : []
      ),
    onSuccess: (data) => {
      setAiOptions(data.imageUrls || []);
      setSelectedAiUrl(null);
      setAiError(null);
    },
    onError: () => setAiError("Failed to generate AI images. Try again."),
  });
  const saveAiMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAiUrl) throw new Error("No image selected");
      await updateMenuItem(item.id, { imageUrl: selectedAiUrl });
      const unselected = aiOptions.filter((u) => u !== selectedAiUrl);
      try {
        await applyGeneratedImage(item.id, selectedAiUrl, unselected);
      } catch {
        // non-critical
      }
      return selectedAiUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      toast.success(`AI image saved for "${item.name}"`);
      setSavedLocally(true);
      onSaved(item.id);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to save AI image");
    },
  });

  // ── file helpers ──
  function cleanupPreview() {
    if (previewUrl?.startsWith("blob:")) {
      try { URL.revokeObjectURL(previewUrl); } catch { /* noop */ }
    }
    setPreviewUrl(null);
    setImageFile(null);
    setUrlInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function pickFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    if (previewUrl?.startsWith("blob:")) {
      try { URL.revokeObjectURL(previewUrl); } catch { /* noop */ }
    }
    const url = URL.createObjectURL(file);
    setImageFile(file);
    setPreviewUrl(url);
    setUrlInput("");
  }

  function handleFileInputChange(e) {
    pickFile(e.target.files?.[0]);
  }

  // drag-and-drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSaveUpload() {
    if (imageFile) {
      const fd = new FormData();
      fd.append("name", item.name);
      fd.append("price", String(item.price));
      if (item.category?.id != null) fd.append("categoryId", String(item.category.id));
      fd.append("available", String(!!item.available));
      fd.append("recommended", String(!!item.recommended));
      if (item.tag?.id != null) fd.append("tagId", String(item.tag.id));
      fd.append("isVeg", String(!!item.isVeg));
      fd.append("image", imageFile);
      saveMutation.mutate({ itemId: item.id, payload: fd });
    } else if (urlInput.trim()) {
      saveMutation.mutate({ itemId: item.id, payload: { imageUrl: urlInput.trim() } });
    }
  }

  function handleModeSwitch(next) {
    setMode(next);
    cleanupPreview();
    setAiOptions([]);
    setSelectedAiUrl(null);
    setAiError(null);
  }

  const isSaving = saveMutation.isPending || saveAiMutation.isPending;
  const canSaveUpload = !!(imageFile || urlInput.trim());
  const canSaveAi = !!selectedAiUrl;

  /* ── done state ── */
  if (savedLocally) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircleIcon weight="fill" className="size-5 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800 truncate">{item.name}</p>
          <p className="text-xs text-green-600">Image saved ✓</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border transition-all overflow-hidden",
        expanded
          ? "border-purple-200 shadow-sm shadow-purple-100"
          : "border-border hover:border-muted-foreground/30"
      )}
    >
      {/* ── collapsed row ── */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => {
          setExpanded((v) => !v);
          if (!expanded && !mode) setMode("upload");
        }}
      >
        {/* thumb placeholder */}
        <div className="size-12 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-dashed border-muted-foreground/30">
          <ImageOff className="size-5 text-muted-foreground/50" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {item.category?.name ?? "No category"}
            {item.available ? "" : " · Unavailable"}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px] gap-1 text-amber-700 border-amber-300 bg-amber-50">
            <WarningCircleIcon weight="fill" className="size-3" />
            No image
          </Badge>
          {expanded
            ? <ChevronUp className="size-4 text-muted-foreground" />
            : <ChevronDown className="size-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* ── expanded panel ── */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 pt-3 pb-4 space-y-4">

          {/* mode switcher */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleModeSwitch("upload")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold border transition-all",
                mode === "upload"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-foreground hover:border-primary/50"
              )}
            >
              <UploadIcon className="size-3.5" /> Upload / URL
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("ai")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold border transition-all",
                mode === "ai"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-background border-border text-foreground hover:border-purple-300"
              )}
            >
              <Wand2 className="size-3.5" /> AI Generate
            </button>
          </div>

          {/* ── UPLOAD MODE ── */}
          {mode === "upload" && (
            <div className="space-y-3">
              {/* drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-6 px-4",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : previewUrl
                      ? "border-green-400 bg-green-50"
                      : "border-border hover:border-primary/60 hover:bg-muted/40"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileInputChange}
                />
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={computeSrc(previewUrl)}
                      alt="Preview"
                      className="h-28 w-28 rounded-xl object-cover shadow-sm border"
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); cleanupPreview(); }}
                      className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <UploadIcon className="size-7 text-muted-foreground/60" />
                    <div className="text-center">
                      <p className="text-xs font-medium text-foreground">Drop image here or click to browse</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, WebP · max 5 MB</p>
                    </div>
                  </>
                )}
              </div>

              {/* OR divider + URL input */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground font-medium">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <Input
                placeholder="Paste external image URL…"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setImageFile(null); setPreviewUrl(null); }}
                className="text-sm"
              />
              {urlInput.trim() && (
                <img
                  src={computeSrc(urlInput.trim())}
                  alt="URL preview"
                  className="h-20 w-20 rounded-lg object-cover border"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}

              <Button
                type="button"
                className="w-full"
                disabled={!canSaveUpload || isSaving}
                onClick={handleSaveUpload}
              >
                {isSaving ? <><Loader2 className="size-4 mr-2 animate-spin" />Saving…</> : "Save Image"}
              </Button>
            </div>
          )}

          {/* ── AI MODE ── */}
          {mode === "ai" && (
            <div className="space-y-3">
              {/* prompt hint */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-purple-700">
                  Prompt hint <span className="font-normal text-purple-500">(optional)</span>
                </label>
                <Textarea
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  placeholder={`e.g. "golden crust, steam rising, rustic wooden plate"`}
                  rows={2}
                  className="text-xs resize-none border-purple-200 focus:border-purple-400 bg-white"
                  disabled={generateMutation.isPending}
                />
              </div>

              {/* generate / retry button */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate({ isRetry: aiOptions.length > 0 })}
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" />Generating…</>
                ) : aiOptions.length > 0 ? (
                  <><RefreshCw className="size-4 mr-2" />Regenerate</>
                ) : (
                  <><Wand2 className="size-4 mr-2" />Generate Image</>
                )}
              </Button>

              {aiError && (
                <p className="text-xs text-destructive">{aiError}</p>
              )}

              {/* AI thumbnails */}
              {aiOptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    Select an image, then click <strong>Save AI Image</strong>.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {aiOptions.map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => setSelectedAiUrl((prev) => prev === url ? null : url)}
                        className={cn(
                          "relative rounded-xl overflow-hidden border-2 transition-all shrink-0",
                          selectedAiUrl === url
                            ? "border-purple-500 ring-2 ring-purple-300"
                            : "border-transparent hover:border-purple-300"
                        )}
                      >
                        <img
                          src={url}
                          alt="AI generated option"
                          className="h-24 w-24 object-cover"
                        />
                        {selectedAiUrl === url && (
                          <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                            <Check className="size-6 text-purple-700 bg-white rounded-full p-0.5 shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedAiUrl && (
                    <p className="text-[11px] text-purple-600 font-medium flex items-center gap-1">
                      <Check className="size-3" /> Image selected — click Save below.
                    </p>
                  )}

                  <Button
                    type="button"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={!canSaveAi || isSaving}
                    onClick={() => saveAiMutation.mutate()}
                  >
                    {isSaving ? (
                      <><Loader2 className="size-4 mr-2 animate-spin" />Saving…</>
                    ) : (
                      <><Check className="size-4 mr-1" />Save AI Image</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

ItemCard.propTypes = {
  item: PropTypes.object.isRequired,
  onSaved: PropTypes.func.isRequired,
};

// ─── Main sheet ────────────────────────────────────────────────────────────────

export default function MissingImagesSheet({ open, onOpenChange, items = [] }) {
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState(new Set());

  const handleOpenChange = (next) => {
    if (!next) setSavedIds(new Set());
    onOpenChange(next);
  };

  const missingItems = items.filter((i) => !i.imageUrl);
  const remaining = missingItems.filter((i) => !savedIds.has(i.id));
  const totalMissing = missingItems.length;
  const fixedCount = savedIds.size;

  const displayed = remaining.filter((i) =>
    !search.trim() || i.name?.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSaved = (id) => setSavedIds((prev) => new Set([...prev, id]));

  const progressPct = totalMissing > 0
    ? Math.round((fixedCount / totalMissing) * 100)
    : 100;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col max-w-lg! p-0 gap-0">

        {/* ── header ── */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <ImageIcon weight="fill" className="size-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold flex items-center gap-2">
                Missing Images
                {remaining.length > 0 && (
                  <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 leading-none rounded-full">
                    {remaining.length}
                  </Badge>
                )}
                {remaining.length === 0 && totalMissing > 0 && (
                  <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 leading-none rounded-full">
                    All done!
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Upload a photo or generate one with AI for each item.
              </SheetDescription>
            </div>
          </div>

          {/* progress bar */}
          {totalMissing > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{fixedCount} of {totalMissing} fixed</span>
                <span className={cn("font-semibold", progressPct === 100 ? "text-green-600" : "text-amber-600")}>
                  {progressPct}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progressPct === 100 ? "bg-green-500" : "bg-amber-500"
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </SheetHeader>

        {/* ── search ── */}
        <div className="px-5 py-3 border-b shrink-0">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm h-9"
            />
          </div>
        </div>

        {/* ── list ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

          {totalMissing === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="size-16 rounded-2xl bg-green-50 flex items-center justify-center">
                <CheckCircleIcon weight="fill" className="size-8 text-green-500" />
              </div>
              <p className="text-base font-semibold text-foreground">All items have images!</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Every menu item has a photo. Your menu is looking great.
              </p>
            </div>
          )}

          {totalMissing > 0 && remaining.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="size-16 rounded-2xl bg-green-50 flex items-center justify-center">
                <CheckCircleIcon weight="fill" className="size-8 text-green-500" />
              </div>
              <p className="text-base font-semibold text-foreground">All done this session!</p>
              <p className="text-sm text-muted-foreground">
                Close and reopen to verify the full list.
              </p>
            </div>
          )}

          {displayed.length > 0 && displayed.map((item) => (
            <ItemCard key={item.id} item={item} onSaved={handleSaved} />
          ))}

          {displayed.length === 0 && remaining.length > 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No items match your search.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

MissingImagesSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  items: PropTypes.array,
};

