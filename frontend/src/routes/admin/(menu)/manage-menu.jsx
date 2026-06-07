import { createFileRoute, Navigate, useLocation } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { baseURL } from "@/services";
import { apiClient } from "@/services";
import {
  createMenuItem,
  generateAiImageOptions,
  applyGeneratedImage,
} from "@/services/menu-service";
import { Button } from "@/components/ui/button";
import ComboBoxCreate from "@/components/ui/ComboBoxCreate";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { X, Wand2, Check, Loader2 } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/(menu)/manage-menu")({
  component: AdminCreateMenuPage,
});

// ── Helpers ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  price: "",
  category: "Misc",
  categoryId: null,
  description: "",
  imageUrl: "",
  tag: "",
  tagId: null,
  available: true,
  recommended: false,
  isVeg: false,
  estimatedCost: "",
};

function AdminCreateMenuPage() {
  const location = useLocation();
  const { isAdmin, isSuperUser } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const queryClient = useQueryClient();
  const imageFieldRef = useRef(null);

  // ── AI image generation state ─────────────────────────────────────────────
  const [aiPhase, setAiPhase] = useState("idle");
  // idle | creating | generating | options | applying | done
  const [createdItemId, setCreatedItemId] = useState(null);
  const [aiImageOptions, setAiImageOptions] = useState([]);
  const [selectedAiImage, setSelectedAiImage] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [additionalPrompt, setAdditionalPrompt] = useState("");

  // ── Tags ──────────────────────────────────────────────────────────────────
  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiClient.get("/tags").then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });
  const createTagMutation = useMutation({
    mutationFn: (name) => apiClient.post("/tags", { name }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });

  // ── Categories ────────────────────────────────────────────────────────────
  const { data: allCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get("/categories").then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });
  const createCategoryMutation = useMutation({
    mutationFn: (name) => apiClient.post("/categories", { name }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  // ── Field change handlers ─────────────────────────────────────────────────
  const handleChange = (key) => (event) => {
    setError("");
    setSuccess("");
    const value = event.target ? event.target.value : event;
    setForm((f) => ({ ...f, [key]: value }));
  };
  const handleSwitchChange = (key) => (checked) => {
    setError("");
    setSuccess("");
    setForm((f) => ({ ...f, [key]: checked }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select a valid image file"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be 5MB or smaller"); return; }
    if (previewUrl?.startsWith("blob:")) { try { URL.revokeObjectURL(previewUrl); } catch { /* ignore */ } }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };
  const handleRemoveFile = () => {
    if (previewUrl?.startsWith("blob:")) {
      try { URL.revokeObjectURL(previewUrl); if (imageFieldRef.current) imageFieldRef.current.value = ""; } catch { /* ignore */ }
    }
    setImageFile(null);
    setPreviewUrl("");
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    handleRemoveFile();
    setAiPhase("idle");
    setCreatedItemId(null);
    setAiImageOptions([]);
    setSelectedAiImage(null);
    setAiError(null);
    setAdditionalPrompt("");
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.name.trim()) return "Name is required.";
    if (!form.price || Number.isNaN(Number(form.price))) return "Valid price is required.";
    // Profitability gate
    const costMissing = form.estimatedCost === "" || isNaN(Number(form.estimatedCost));
    if (form.available && costMissing) return "MISSING_COST";
    return null;
  };

  // ── Build submission payload ───────────────────────────────────────────────
  const buildPayload = (includeImage = true) => {
    const costNum = form.estimatedCost !== "" && !isNaN(Number(form.estimatedCost))
      ? Number(form.estimatedCost)
      : null;

    if (includeImage && imageFile) {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("price", String(Number(form.price)));
      if (form.categoryId != null) fd.append("categoryId", String(form.categoryId));
      fd.append("description", form.description.trim());
      fd.append("available", String(form.available));
      fd.append("recommended", String(form.recommended));
      if (form.tagId != null) fd.append("tagId", String(form.tagId));
      fd.append("isVeg", String(Boolean(form.isVeg)));
      if (costNum != null) fd.append("estimatedCost", String(costNum));
      fd.append("image", imageFile);
      return fd;
    }
    return {
      name: form.name.trim(),
      price: Number(form.price),
      categoryId: form.categoryId,
      description: form.description.trim(),
      imageUrl: includeImage ? form.imageUrl.trim() : "",
      available: form.available,
      recommended: form.recommended,
      tagId: form.tagId,
      isVeg: Boolean(form.isVeg),
      estimatedCost: costNum,
    };
  };

  // ── Create mutation (normal flow) ─────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload) => createMenuItem(payload),
    onSuccess: () => {
      setSuccess("Menu item created successfully.");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      window.setTimeout(() => setSuccess(""), 4000);
    },
    onError: (err) => {
      setError(err?.response?.data?.message || err?.response?.data || "Failed to create menu item");
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    // If AI flow already created a draft, just apply the AI image and finish
    if (createdItemId) {
      handleAiFinish();
      return;
    }

    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    createMutation.mutate(buildPayload(true));
  };

  // ── AI image generation flow ──────────────────────────────────────────────

  // Step 1: Save draft → generate options
  const handleAiGenerate = async (isRetry = false) => {
    setAiError(null);
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    try {
      let itemId = createdItemId;

      // First time: auto-save the item before generating
      if (!itemId) {
        setAiPhase("creating");
        const saved = await createMenuItem(buildPayload(false)); // no image — let AI handle it
        itemId = saved.id;
        setCreatedItemId(itemId);
        queryClient.invalidateQueries({ queryKey: ["menu"] });
      }

      setAiPhase("generating");
      const prevUrls = isRetry ? aiImageOptions : [];
      const result = await generateAiImageOptions(itemId, 1, additionalPrompt || null, prevUrls);
      setAiImageOptions(result.imageUrls || []);
      setSelectedAiImage(null);
      setAiPhase("options");
    } catch {
      setAiError("Failed to generate AI image. Please try again.");
      setAiPhase(createdItemId ? "options" : "idle");
    }
  };

  // Step 2: Select / deselect a generated option
  const selectAiImage = (url) => {
    if (selectedAiImage === url) {
      setSelectedAiImage(null);
      setPreviewUrl("");
    } else {
      setSelectedAiImage(url);
      setPreviewUrl(url);
    }
  };

  // Step 3: Finish — apply selected image or just complete with auto-generated
  const handleAiFinish = async () => {
    if (!createdItemId) return;
    setAiPhase("applying");
    try {
      if (selectedAiImage) {
        await applyGeneratedImage(createdItemId, selectedAiImage, aiImageOptions);
      }
      setSuccess("Menu item created with AI image.");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      window.setTimeout(() => setSuccess(""), 4000);
    } catch {
      setAiError("Failed to apply selected image (non-critical). Item was still saved.");
      setAiPhase("options");
    }
  };

  const computeImageSrc = (url) => {
    if (!url) return null;
    if (["http://", "https://", "blob:"].some((p) => url.startsWith(p))) return url;
    return `${baseURL}${url}`;
  };

  if (!isAdmin && !isSuperUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const aiActive = ["creating", "generating", "options", "applying"].includes(aiPhase);
  const submitLabel = () => {
    if (createMutation.isPending) return "Creating…";
    if (aiPhase === "creating") return "Saving item…";
    if (aiPhase === "applying") return "Applying image…";
    if (createdItemId) return selectedAiImage ? "Apply AI Image & Finish" : "Finish";
    return "Create Menu Item";
  };

  return (
    <>
      <AdminHeader
        title="Create Menu Item"
        description="Create a new menu item to be instantly available to your customers."
        className="mb-6"
      />

      <section>
        <form onSubmit={handleSubmit} className="px-4">
          <div className="mb-4 grid gap-4 lg:grid-rows-2 lg:grid-cols-[350px_1fr]">

            {/* ── Visuals panel ─────────────────────────────────────── */}
            <div className="border p-4 rounded-lg">
              <FieldSet>
                <FieldLegend className="font-medium">Visuals</FieldLegend>
                <FieldDescription className="mt-1 text-sm text-muted-foreground">
                  Upload an image, provide a URL, or use AI generation below.
                </FieldDescription>
                <FieldGroup className="grid gap-4">
                  <Field>
                    <FieldLabel>Upload Image</FieldLabel>
                    <FieldContent>
                      <Input type="file" accept="image/*" ref={imageFieldRef} onChange={handleFileChange} />
                      <p className="mt-2 text-xs text-muted-foreground">Max 5MB limit.</p>
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel>External Image URL</FieldLabel>
                    <FieldContent>
                      <Input
                        value={form.imageUrl}
                        onChange={handleChange("imageUrl")}
                        placeholder="https://..."
                        disabled={!!imageFile}
                      />
                    </FieldContent>
                  </Field>
                  {(previewUrl || form.imageUrl) && (
                    <div className="flex flex-col items-start gap-3">
                      <span className="text-sm font-medium">Preview</span>
                      <div className="relative">
                        <img
                          src={computeImageSrc(previewUrl || form.imageUrl)}
                          alt="Preview"
                          className="h-32 w-32 rounded-2xl object-cover shadow-sm border"
                        />
                        {previewUrl && !aiActive && (
                          <Button
                            variant="outline"
                            size="icon"
                            type="button"
                            onClick={handleRemoveFile}
                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full p-0"
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </FieldGroup>

                {/* ── AI Image Generation ─────────────────────────────── */}
                <div className="mt-4 rounded-xl border border-dashed border-purple-300 bg-purple-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Wand2 className="size-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">AI Image Generation</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-purple-300 text-purple-700 hover:bg-purple-100"
                      disabled={aiPhase === "creating" || aiPhase === "generating" || aiPhase === "applying"}
                      onClick={() => handleAiGenerate(false)}
                    >
                      {(aiPhase === "creating" || aiPhase === "generating") ? (
                        <><Loader2 className="size-3.5 mr-1 animate-spin" />{aiPhase === "creating" ? "Saving item…" : "Generating…"}</>
                      ) : aiPhase === "options" ? (
                        <><Wand2 className="size-3.5 mr-1" />Regenerate</>
                      ) : (
                        <><Wand2 className="size-3.5 mr-1" />Generate Image</>
                      )}
                    </Button>
                  </div>

                  {/* Prompt hint */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-purple-700">
                      Prompt hint <span className="font-normal text-purple-400">(optional)</span>
                    </label>
                    <div className="flex gap-2">
                      <Textarea
                        value={additionalPrompt}
                        onChange={(e) => setAdditionalPrompt(e.target.value)}
                        placeholder='e.g. "steam rising, golden colour, rustic wooden plate"'
                        rows={2}
                        className="resize-none text-xs bg-white border-purple-200 focus:border-purple-400"
                        disabled={aiPhase === "creating" || aiPhase === "generating" || aiPhase === "applying"}
                      />
                      {aiPhase === "options" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="self-end shrink-0 border-purple-400 text-purple-700 hover:bg-purple-100"
                          disabled={aiPhase === "generating" || !additionalPrompt.trim()}
                          onClick={() => handleAiGenerate(true)}
                        >
                          {aiPhase === "generating" ? (
                            <><Loader2 className="size-3.5 mr-1 animate-spin" />Retrying…</>
                          ) : (
                            <><Wand2 className="size-3.5 mr-1" />Retry</>
                          )}
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-purple-400">
                      {createdItemId
                        ? "Item saved — generating/retrying with new hint."
                        : "The item will be auto-saved before generation starts."}
                    </p>
                  </div>

                  {aiError && <p className="text-xs text-red-600">{aiError}</p>}

                  {aiPhase === "options" && aiImageOptions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Click an image to select it — then click <strong>Apply AI Image &amp; Finish</strong> to save.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {aiImageOptions.map((url, idx) => (
                          <button
                            key={`${url}-${idx}`}
                            type="button"
                            onClick={() => selectAiImage(url)}
                            className={cn(
                              "relative rounded-xl overflow-hidden border-2 transition-all",
                              selectedAiImage === url
                                ? "border-purple-500 ring-2 ring-purple-300"
                                : "border-transparent hover:border-purple-300"
                            )}
                          >
                            <img src={url} alt="AI option" className="h-24 w-24 object-cover" />
                            {selectedAiImage === url && (
                              <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                <Check className="size-6 text-purple-700 bg-white rounded-full p-0.5" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      {selectedAiImage && (
                        <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
                          <Check className="size-3" />
                          Image selected — click <strong>Apply AI Image &amp; Finish</strong> below.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </FieldSet>
            </div>

            {/* ── Essential Details ──────────────────────────────────── */}
            <div className="border row-span-2 p-4 rounded-lg">
              <FieldSet>
                <FieldLegend>Essential Details</FieldLegend>
                <FieldDescription className="mt-1 text-sm text-muted-foreground">
                  The essential information customers will see.
                </FieldDescription>
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Name</FieldLabel>
                    <FieldContent>
                      <Input value={form.name} onChange={handleChange("name")} placeholder="Item name" />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>Price (₹)</FieldLabel>
                    <FieldContent>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price}
                        onChange={handleChange("price")}
                        placeholder="e.g. 99.50"
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>
                      Estimated Cost (₹){" "}
                      <span className="text-xs font-normal text-muted-foreground">(optional — for profit tracking)</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.estimatedCost}
                        onChange={handleChange("estimatedCost")}
                        placeholder="e.g. 35.00"
                      />
                      {form.price && form.estimatedCost && !isNaN(Number(form.price)) && !isNaN(Number(form.estimatedCost)) && Number(form.price) > 0 && (
                        <p className="mt-1 text-xs text-emerald-600 font-medium">
                          ≈ {(((Number(form.price) - Number(form.estimatedCost)) / Number(form.price)) * 100).toFixed(1)}% margin
                        </p>
                      )}
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>Category</FieldLabel>
                    <FieldContent>
                      <ComboBoxCreate
                        items={allCategories.map((c) => ({ id: c.id, name: c.name }))}
                        value={form.category}
                        onSelect={(item) => setForm((f) => ({ ...f, category: item.name, categoryId: item.id }))}
                        onCreate={(name) => createCategoryMutation.mutateAsync(name)}
                        creating={createCategoryMutation.isPending}
                        placeholder="Select or create category…"
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>Tag</FieldLabel>
                    <FieldContent>
                      <ComboBoxCreate
                        items={allTags.map((t) => ({ id: t.id, name: t.name }))}
                        value={form.tag}
                        onSelect={(item) => setForm((f) => ({ ...f, tag: item.name, tagId: item.id }))}
                        onCreate={(name) => createTagMutation.mutateAsync(name)}
                        creating={createTagMutation.isPending}
                        placeholder="Select or create tag…"
                      />
                    </FieldContent>
                  </Field>

                  <Field className="md:col-span-2">
                    <FieldLabel>Description</FieldLabel>
                    <FieldContent>
                      <Textarea
                        value={form.description}
                        onChange={handleChange("description")}
                        placeholder="Optional description"
                        rows={3}
                        className="resize-none"
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </div>

            {/* ── Attributes ────────────────────────────────────────── */}
            <div className="border p-4 rounded-lg">
              <FieldSet>
                <FieldLegend className="font-medium">Attributes</FieldLegend>
                <FieldDescription className="mt-1 text-sm text-muted-foreground">
                  Configure the item's availability and tags.
                </FieldDescription>
                <FieldGroup className="md:max-w-sm">
                  <Field className="md:max-w-sm" orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="available">Available</FieldLabel>
                      <FieldDescription>Show this item on the menu</FieldDescription>
                    </FieldContent>
                    <Switch id="available" checked={form.available} onCheckedChange={handleSwitchChange("available")} />
                  </Field>
                  <Field className="md:max-w-sm" orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="recommended">Recommended</FieldLabel>
                      <FieldDescription>Show this item in recommendations</FieldDescription>
                    </FieldContent>
                    <Switch id="recommended" checked={form.recommended} onCheckedChange={handleSwitchChange("recommended")} />
                  </Field>
                  <Field className="md:max-w-sm" orientation="horizontal">
                    <FieldContent className="space-y-0.5">
                      <FieldLabel htmlFor="isVeg">Veg Item</FieldLabel>
                      <FieldDescription>Mark as strictly vegetarian</FieldDescription>
                    </FieldContent>
                    <Switch id="isVeg" checked={form.isVeg} onCheckedChange={handleSwitchChange("isVeg")} />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </div>
          </div>

          {/* AI draft info banner */}
          {createdItemId && (
            <div className="my-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 flex items-center gap-3 text-sm text-purple-800">
              <Wand2 className="size-4 text-purple-600 shrink-0" />
              <span>
                Item saved (ID {createdItemId}).{" "}
                {aiPhase === "options"
                  ? "Select an AI image above, then click "
                  : "Click "}
                <strong>Apply AI Image &amp; Finish</strong> to complete, or just <strong>Finish</strong> — auto-generated image will appear shortly.
              </span>
            </div>
          )}

          {error === "MISSING_COST" ? (
            <div className="rounded-lg my-3 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span>
                <strong>Estimated cost is required to create an Active item.</strong>{" "}
                Enter an Estimated Cost above, or turn off the <em>Available</em> switch to save as a draft.
              </span>
            </div>
          ) : error ? (
            <div className="rounded-lg my-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          {success && (
            <div className="rounded-xl my-3 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
          )}

          <div className="p-4 flex gap-3 justify-end border-t">
            <Button
              size="lg"
              type="button"
              variant="outline"
              onClick={() => { resetForm(); setError(""); setSuccess(""); }}
              disabled={createMutation.isPending || aiPhase === "creating" || aiPhase === "generating" || aiPhase === "applying"}
            >
              Reset
            </Button>
            <Button
              size="lg"
              type="submit"
              disabled={createMutation.isPending || aiPhase === "creating" || aiPhase === "generating" || aiPhase === "applying"}
            >
              {submitLabel()}
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
