import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { updateMenuItem } from "../services/api";
import API from "../services/api";
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
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
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

  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    imageUrl: "",
    available: true,
    recommended: false,
    tag: "",
    isVeg: false,
    imageFile: null,
    previewUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (item) {
      const initialPreview = item.imageUrl || "";
      setForm({
        name: item.name || "",
        price: item.price != null ? String(item.price) : "",
        category: item.category || "",
        description: item.description || "",
        imageUrl: item.imageUrl || "",
        available: item.available == null ? true : !!item.available,
        recommended: !!item.recommended,
        tag: item.tag || "",
        isVeg: !!item.isVeg,
        imageFile: null,
        previewUrl: initialPreview,
      });
      // ensure previewRef is synced to existing url when initialized
      previewRef.current = initialPreview || null;
      setError(null);
      if (onPreviewChange) onPreviewChange(initialPreview);
    }
  }, [item, onPreviewChange]);

  const computeImageSrc = (url) => {
    if (!url) return null;
    if (
      ["http://", "https://", "blob:"].some((prefix) => url.startsWith(prefix))
    )
      return url;
    const base =
      API && API.defaults && API.defaults.baseURL ? API.defaults.baseURL : "";
    return `${base}${url}`;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // If an image file is selected, send multipart/form-data
      let res;
      if (form.imageFile) {
        const fd = new FormData();
        fd.append("name", form.name.trim());
        fd.append("price", String(Number(form.price)));
        fd.append("category", form.category.trim());
        fd.append("description", form.description.trim());
        fd.append("available", String(!!form.available));
        fd.append("recommended", String(!!form.recommended));
        fd.append("tag", form.tag.trim());
        fd.append("isVeg", String(!!form.isVeg));
        fd.append("image", form.imageFile);
        res = await updateMenuItem(item.id, fd);
      } else {
        const payload = {
          name: form.name.trim(),
          price: Number(form.price),
          category: form.category.trim(),
          description: form.description.trim(),
          imageUrl: form.imageUrl ? form.imageUrl.trim() : item.imageUrl || "",
          available: !!form.available,
          recommended: !!form.recommended,
          tag: form.tag.trim(),
          isVeg: !!form.isVeg,
        };
        res = await updateMenuItem(item.id, payload);
      }

      const updated = res?.data || { ...item, ...form };
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      console.error("update failed", err);
      setError(err?.response?.data?.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
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
      <SheetContent className="overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Edit Item</SheetTitle>
        </SheetHeader>
        <form className="px-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

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
                      className="h-12 text-sm!"
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
                      className="h-12 text-sm!"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <FieldContent>
                    <Input
                      value={form.category}
                      onChange={handleChange("category")}
                      placeholder="e.g. Main Course"
                      className="h-12 text-sm!"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel>Tag</FieldLabel>
                  <FieldContent>
                    <Input
                      value={form.tag}
                      onChange={handleChange("tag")}
                      placeholder="e.g. Bestseller"
                      className="h-12 text-sm!"
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
                      className="resize-none text-sm!"
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet className="mt-6">
              <FieldLegend className="font-medium">Visuals</FieldLegend>
              <FieldDescription className="mt-1 text-sm text-muted-foreground">
                Upload an image or provide an external link.
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
                        className="flex-1 cursor-pointer file:cursor-pointer file:border-0 file:bg-transparent file:text-sm file:font-medium h-12 pt-3 text-sm!"
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
                      className="h-12 text-sm!"
                      disabled={!!form.imageFile}
                    />
                  </FieldContent>
                </Field>

                {(form.previewUrl || form.imageUrl) && (
                  <div className="md:col-span-2 flex flex-col items-start gap-3">
                    <span className="text-sm font-medium">Preview</span>
                    <div className="relative">
                      <img
                        src={computeImageSrc(form.previewUrl || form.imageUrl)}
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
            </FieldSet>

            <FieldSet className="mt-6">
              <FieldLegend className="font-medium">Attributes</FieldLegend>
              <FieldDescription className="mt-1 text-sm text-muted-foreground">
                Configure the item's availability and tags.
              </FieldDescription>

              <FieldGroup className="mt-4 md:max-w-sm">
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
          </div>
          <div className="py-4 flex gap-3 justify-end border-t rounded-b-lg mt-6">
            <Button
              size="lg"
              type="button"
              variant="outline"
              onClick={() => {
                if (onPreviewChange) onPreviewChange("");
                onClose();
              }}
              className="h-12 text-sm! w-full sm:max-w-37 font-medium!"
            >
              Cancel
            </Button>
            <Button
              size="lg"
              type="submit"
              disabled={submitting}
              className="h-12 text-sm! w-full sm:max-w-37 font-medium!"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
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
