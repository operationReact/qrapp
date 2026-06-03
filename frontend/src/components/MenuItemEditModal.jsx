import { useEffect, useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import PropTypes from "prop-types";
import { updateMenuItem, generateAiImageOptions, applyGeneratedImage } from "../services/menu-service";
import { apiClient } from "../services";
import { baseURL } from "../services";
import ComboBoxCreate from "@/components/ui/ComboBoxCreate";
import { Button } from "@/components/ui/button";
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function MenuItemEditModal({
  item,
  onClose,
  onSuccess,
  onPreviewChange,
}) {
  const previewRef = useRef(null);
  const imageFieldRef = useRef(null);
  const formRef = useRef(null); // always points to latest form — prevents stale closure in mutationFn

  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    categoryId: null,
    description: "",
    imageUrl: "",
    available: true,
    recommended: false,
    tag: "",
    tagId: null,
    isVeg: false,
    imageFile: null,
    previewUrl: "",
  });
  const [error, setError] = useState(null);
  formRef.current = form; // keep ref in sync with latest state on every render
  const queryClient = useQueryClient();

  // AI image generation state — v2
  const [aiImageOptions, setAiImageOptions] = useState([]);
  const [selectedAiImage, setSelectedAiImage] = useState(null);
  const [aiGenerateCount, setAiGenerateCount] = useState(0);
  const [aiError, setAiError] = useState(null);
  const [additionalPrompt, setAdditionalPrompt] = useState("");

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiClient.get("/tags").then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const createTagMutation = useMutation({
    mutationFn: (name) => apiClient.post("/tags", { name }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get("/categories").then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name) => apiClient.post("/categories", { name }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const generateAiOptionsMutation = useMutation({
    mutationFn: ({ isRetry = false } = {}) =>
      generateAiImageOptions(
        item.id,
        1,
        additionalPrompt || null,
        isRetry ? aiImageOptions : []
      ),
    onSuccess: (data, variables) => {
      setAiImageOptions(data.imageUrls || []);
      setSelectedAiImage(null);
      if (!variables?.isRetry) setAiGenerateCount((c) => c + 1);
      setAiError(null);
    },
    onError: () => setAiError("Failed to generate AI images. Please try again."),
  });

  const applyAiImageMutation = useMutation({
    mutationFn: ({ selectedUrl, unselectedUrls }) =>
      applyGeneratedImage(item.id, selectedUrl, unselectedUrls),
    onError: () => setAiError("Failed to clean up unselected images (non-critical)."),
  });

  useEffect(() => {
    if (item) {
      const initialPreview = item.imageUrl || "";
      setForm({
        name: item.name || "",
        price: item.price != null ? String(item.price) : "",
        category: item?.category?.name || "",
        categoryId: item?.category?.id ?? null,
        description: item.description || "",
        imageUrl: item.imageUrl || "",
        available: item.available == null ? true : !!item.available,
        recommended: !!item.recommended,
        tag: item?.tag?.name || "",
        tagId: item?.tag?.id ?? null,
        isVeg: !!item.isVeg,
        imageFile: null,
        previewUrl: initialPreview,
      });
      // ensure previewRef is synced to existing url when initialized
      previewRef.current = initialPreview || null;
      setError(null);
      // Reset AI state when a new item is opened
      setAiImageOptions([]);
      setSelectedAiImage(null);
      setAiGenerateCount(0);
      setAiError(null);
      setAdditionalPrompt("");
      if (onPreviewChange) onPreviewChange(initialPreview);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const computeImageSrc = (url) => {
    if (!url) return null;
    if (
      ["http://", "https://", "blob:"].some((prefix) => url.startsWith(prefix))
    )
      return url;
    return `${baseURL}${url}`;
  };

  const handleChange = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (form.price === "" || isNaN(Number(form.price)))
      return "Valid price is required";
    return null;
  };

  // Selecting an AI thumbnail immediately updates the form so "Save Changes" picks it up
  const selectAiImage = (url) => {
    if (selectedAiImage === url) {
      // Deselect — revert to previous imageUrl
      setSelectedAiImage(null);
      const prev = item.imageUrl || "";
      setForm((f) => ({ ...f, imageUrl: prev, previewUrl: prev, imageFile: null }));
      previewRef.current = prev;
      if (onPreviewChange) onPreviewChange(prev);
    } else {
      setSelectedAiImage(url);
      setForm((f) => ({ ...f, imageUrl: url, previewUrl: url, imageFile: null }));
      previewRef.current = url;
      if (onPreviewChange) onPreviewChange(url);
    }
  };

  // handle file selection and preview
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // basic validation
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_BYTES) {
      setError("Image must be 5MB or smaller");
      return;
    }
    // revoke previous preview if any
    if (
      previewRef.current &&
      typeof previewRef.current === "string" &&
      previewRef.current.startsWith("blob:")
    ) {
      try {
        URL.revokeObjectURL(previewRef.current);
      } catch {
        /* ignore */
      }
    }
    const preview = URL.createObjectURL(file);
    previewRef.current = preview;
    setForm((f) => ({ ...f, imageFile: file, previewUrl: preview }));
    setError(null);
    if (onPreviewChange) onPreviewChange(preview);
  };

  const handleRemoveFile = () => {
    if (
      previewRef.current &&
      typeof previewRef.current === "string" &&
      previewRef.current.startsWith("blob:")
    ) {
      try {
        URL.revokeObjectURL(previewRef.current);
        imageFieldRef.current.value = "";
      } catch {
        /* ignore */
      }
    }
    previewRef.current = null;
    setForm((f) => ({ ...f, imageFile: null, previewUrl: "" }));
    if (onPreviewChange) onPreviewChange("");
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      const f = formRef.current; // read latest form — never stale
      if (f.imageFile) {
        const fd = new FormData();
        fd.append("name", f.name.trim());
        fd.append("price", String(Number(f.price)));
        if (f.categoryId != null) fd.append("categoryId", String(f.categoryId));
        fd.append("description", f.description.trim());
        fd.append("available", String(!!f.available));
        fd.append("recommended", String(!!f.recommended));
        if (f.tagId != null) fd.append("tagId", String(f.tagId));
        fd.append("isVeg", String(!!f.isVeg));
        fd.append("image", f.imageFile);
        return updateMenuItem(item.id, fd);
      }
      const payload = {
        name: f.name.trim(),
        price: Number(f.price),
        categoryId: f.categoryId,
        description: f.description.trim(),
        imageUrl: f.imageUrl ? f.imageUrl.trim() : item.imageUrl || "",
        available: !!f.available,
        recommended: !!f.recommended,
        tagId: f.tagId,
        isVeg: !!f.isVeg,
      };
      console.log("[MenuItemEditModal] Save Changes payload:", {
        id: item.id,
        imageUrl: payload.imageUrl,
        form_imageUrl: f.imageUrl,
        item_imageUrl: item.imageUrl,
      });
      return updateMenuItem(item.id, payload);
    },
    onSuccess: (data) => {
      // Clean up unselected AI images from S3 (best-effort, non-blocking)
      if (selectedAiImage && aiImageOptions.length > 0) {
        const unselected = aiImageOptions.filter(u => u !== selectedAiImage);
        if (unselected.length > 0) {
          applyAiImageMutation.mutate({ selectedUrl: selectedAiImage, unselectedUrls: unselected });
        }
      }
      onSuccess(data);
      onClose?.();
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
    onError: (err) => {
      console.error(err);
      setError(err?.response?.data || "Failed to update menu item");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    updateMutation.mutate();
  };

  if (!item) return null;

  return (
    <Sheet
      open={!!item}
      onOpenChange={(open) => {
        if (!open) {
          if (onPreviewChange) onPreviewChange("");
          onClose();
        }
      }}
    >
      <SheetContent>
        <SheetHeader className="border-b">
          <SheetTitle className="font-medium">Update Menu Item</SheetTitle>
        </SheetHeader>
        <form
          id="edit-menu-form"
          className="px-4 no-scrollbar overflow-y-auto"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <FieldSet>
              <FieldLegend>Essential Details</FieldLegend>
              <FieldDescription className="mt-1 text-sm text-muted-foreground">
                The essential information customers will see.
              </FieldDescription>
              <FieldGroup className="mt-4 grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <FieldContent>
                    <Input
                      value={form.name}
                      onChange={handleChange("name")}
                      placeholder="Item name"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Price</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={handleChange("price")}
                      placeholder="e.g. 99.50"
                    />
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

            <FieldSet className="mt-6">
              <FieldLegend className="font-medium">Visuals</FieldLegend>
              <FieldDescription className="mt-1 text-sm text-muted-foreground">
                Upload an image, provide an external link, or generate one with AI.
              </FieldDescription>

              <FieldGroup className="mt-4 grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Upload Image</FieldLabel>
                  <FieldContent>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        ref={imageFieldRef}
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Max 5MB limit.
                    </p>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>External Image URL</FieldLabel>
                  <FieldContent>
                    <Input
                      value={form.imageUrl}
                      onChange={handleChange("imageUrl")}
                      placeholder="https://..."
                      disabled={!!form.imageFile}
                    />
                  </FieldContent>
                </Field>

                {form.previewUrl && (
                  <div className="md:col-span-2 flex flex-col items-start gap-3">
                    <span className="text-sm font-medium">Preview</span>
                    <div className="relative">
                      <img
                        src={computeImageSrc(form.previewUrl)}
                        alt="Preview"
                        className="h-32 w-32 rounded-2xl object-cover shadow-sm border"
                      />
                      {form.previewUrl && (
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

              {/* AI Image Generation */}
              <div className="mt-6 rounded-xl border border-dashed border-purple-300 bg-purple-50/50 p-4 space-y-3">
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
                    disabled={generateAiOptionsMutation.isPending}
                    onClick={() => generateAiOptionsMutation.mutate({ isRetry: false })}
                  >
                    {generateAiOptionsMutation.isPending && !additionalPrompt ? (
                      <><Loader2 className="size-3.5 mr-1 animate-spin" />Generating…</>
                    ) : (
                      <><Wand2 className="size-3.5 mr-1" />{aiImageOptions.length > 0 ? "Regenerate" : "Generate Image"}</>
                    )}
                  </Button>
                </div>

                {/* Additional prompt hint — shown always so admin can pre-fill before first generation too */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-purple-700">
                    Prompt hint <span className="font-normal text-purple-400">(optional – describe what you want)</span>
                  </label>
                  <div className="flex gap-2">
                    <Textarea
                      value={additionalPrompt}
                      onChange={(e) => setAdditionalPrompt(e.target.value)}
                      placeholder='e.g. "add steam rising, more golden colour, show side garnish, rustic wooden plate"'
                      rows={2}
                      className="resize-none text-xs bg-white border-purple-200 focus:border-purple-400"
                      disabled={generateAiOptionsMutation.isPending}
                    />
                    {aiImageOptions.length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="self-end shrink-0 border-purple-400 text-purple-700 hover:bg-purple-100"
                        disabled={generateAiOptionsMutation.isPending || !additionalPrompt.trim()}
                        onClick={() => generateAiOptionsMutation.mutate({ isRetry: true })}
                        title="Retry generation with your prompt hint"
                      >
                        {generateAiOptionsMutation.isPending && additionalPrompt.trim() ? (
                          <><Loader2 className="size-3.5 mr-1 animate-spin" />Retrying…</>
                        ) : (
                          <><Wand2 className="size-3.5 mr-1" />Retry</>
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-purple-400">
                    Your hint is appended to the base prompt. You can retry as many times as needed.
                  </p>
                </div>

                {aiError && (
                  <p className="text-xs text-red-600">{aiError}</p>
                )}

                {aiImageOptions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Click the image to select it — it will be saved when you click <strong>Save Changes</strong>.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {aiImageOptions.map((url, idx) => (
                        <button
                          key={`${url}-${idx}`}
                          type="button"
                          onClick={() => selectAiImage(url)}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                            selectedAiImage === url
                              ? "border-purple-500 ring-2 ring-purple-300"
                              : "border-transparent hover:border-purple-300"
                          }`}
                        >
                          <img
                            src={url}
                            alt="AI generated"
                            className="h-24 w-24 object-cover"
                          />
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
                        AI image selected — click <strong>Save Changes</strong> below to save it.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </FieldSet>

            <FieldSet className="mt-6">
              <FieldLegend className="font-medium">Attributes</FieldLegend>
              <FieldDescription className="mt-1 text-sm text-muted-foreground">
                Configure the item's availability and tags.
              </FieldDescription>

              <FieldGroup className="md:max-w-sm">
                <Field className="md:max-w-sm" orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="available-edit">Available</FieldLabel>
                    <FieldDescription>
                      Show this item on the menu
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="available-edit"
                    checked={form.available}
                    onCheckedChange={(c) =>
                      handleChange("available")({
                        target: { type: "checkbox", checked: c },
                      })
                    }
                  />
                </Field>

                <Field className="md:max-w-sm" orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="recommended-edit">
                      Recommended
                    </FieldLabel>
                    <FieldDescription>
                      Show this item in recommendations
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="recommended-edit"
                    checked={form.recommended}
                    onCheckedChange={(c) =>
                      handleChange("recommended")({
                        target: { type: "checkbox", checked: c },
                      })
                    }
                  />
                </Field>

                <Field className="md:max-w-sm" orientation="horizontal">
                  <FieldContent className="space-y-0.5">
                    <FieldLabel htmlFor="isVeg-edit">Veg Item</FieldLabel>
                    <FieldDescription>
                      Mark as strictly vegetarian
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="isVeg-edit"
                    checked={form.isVeg}
                    onCheckedChange={(c) =>
                      handleChange("isVeg")({
                        target: { type: "checkbox", checked: c },
                      })
                    }
                  />
                </Field>
              </FieldGroup>
            </FieldSet>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </form>
        <SheetFooter>
          <Button
            size="lg"
            type="submit"
            form="edit-menu-form"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            size="lg"
            type="button"
            variant="outline"
            onClick={() => {
              if (onPreviewChange) onPreviewChange("");
              onClose();
            }}
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

MenuItemEditModal.propTypes = {
  item: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  onPreviewChange: PropTypes.func,
};
