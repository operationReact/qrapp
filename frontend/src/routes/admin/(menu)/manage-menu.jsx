import {
  createFileRoute,
  Navigate,
  useLocation,
} from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from "@/context/AuthContext";
import { baseURL } from "@/services";
import { apiClient } from "@/services";
import { createMenuItem } from "@/services/menu-service";
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
import { X } from "@boxicons/react";
import AdminHeader from "@/components/admin/AdminHeader";

export const Route = createFileRoute("/admin/(menu)/manage-menu")({
  component: AdminCreateMenuPage,
});

function AdminCreateMenuPage() {
  const location = useLocation();
  const { isAdmin, isSuperUser } = useAuth();

  const [form, setForm] = useState({
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
  });

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const queryClient = useQueryClient();
  const imageFieldRef = useRef(null);

  // ── Tags ──────────────────────────────────────────────────────────────
  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiClient.get("/tags").then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const createTagMutation = useMutation({
    mutationFn: (name) => apiClient.post("/tags", { name }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });

  // ── Categories ────────────────────────────────────────────────────────
  const { data: allCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get("/categories").then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name) => apiClient.post("/categories", { name }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const handleChange = (key) => (event) => {
    setError("");
    setSuccess("");
    const value = event.target ? event.target.value : event;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSwitchChange = (key) => (checked) => {
    setError("");
    setSuccess("");
    setForm((current) => ({ ...current, [key]: checked }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select a valid image file"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be 5MB or smaller"); return; }
    if (previewUrl?.startsWith("blob:")) { try { URL.revokeObjectURL(previewUrl); } catch (err) { console.warn(err); } }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const handleRemoveFile = () => {
    if (previewUrl?.startsWith("blob:")) {
      try { URL.revokeObjectURL(previewUrl); imageFieldRef.current.value = ""; } catch (err) { console.warn(err); }
    }
    setImageFile(null);
    setPreviewUrl("");
  };

  const resetForm = () => {
    setForm({ name: "", price: "", category: "Misc", categoryId: null, description: "", imageUrl: "", tag: "", tagId: null, available: true, recommended: false, isVeg: false });
    handleRemoveFile();
  };

  const createMutation = useMutation({
    mutationFn: (payload) => createMenuItem(payload),
    onSuccess: () => {
      setSuccess("Menu item created successfully");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      window.setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err) => {
      setError(err?.response?.data?.message || err?.response?.data || "Failed to create menu item");
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.price || Number.isNaN(Number(form.price))) { setError("Valid price is required."); return; }

    if (imageFile) {
      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("price", String(Number(form.price)));
      if (form.categoryId != null) formData.append("categoryId", String(form.categoryId));
      formData.append("description", form.description.trim());
      formData.append("available", String(form.available));
      formData.append("recommended", String(form.recommended));
      if (form.tagId != null) formData.append("tagId", String(form.tagId));
      formData.append("isVeg", String(Boolean(form.isVeg)));
      formData.append("image", imageFile);
      createMutation.mutate(formData);
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        price: Number(form.price),
        categoryId: form.categoryId,
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        available: form.available,
        recommended: form.recommended,
        tagId: form.tagId,
        isVeg: Boolean(form.isVeg),
      });
    }
  };

  const computeImageSrc = (url) => {
    if (!url) return null;
    if (["http://", "https://", "blob:"].some((prefix) => url.startsWith(prefix))) return url;
    return `${baseURL}${url}`;
  };

  if (!isAdmin && !isSuperUser) {
    return <Navigate to={"/login"} replace state={{ from: location.pathname }} />;
  }

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
            {/* Visuals */}
            <div className="border p-4 rounded-lg">
              <FieldSet>
                <FieldLegend className="font-medium">Visuals</FieldLegend>
                <FieldDescription className="mt-1 text-sm text-muted-foreground">
                  Upload an image or provide an external link.
                </FieldDescription>
                <FieldGroup className="grid gap-4">
                  <Field>
                    <FieldLabel>Upload Image</FieldLabel>
                    <FieldContent>
                      <div className="flex items-center gap-4">
                        <Input type="file" accept="image/*" ref={imageFieldRef} onChange={handleFileChange} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Max 5MB limit.</p>
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel>External Image URL</FieldLabel>
                    <FieldContent>
                      <Input value={form.imageUrl} onChange={handleChange("imageUrl")} placeholder="https://..." disabled={!!imageFile} />
                    </FieldContent>
                  </Field>
                  {(previewUrl || form.imageUrl) && (
                    <div className="flex flex-col items-start gap-3">
                      <span className="text-sm font-medium">Preview</span>
                      <div className="relative">
                        <img src={computeImageSrc(previewUrl || form.imageUrl)} alt="Preview" className="h-32 w-32 rounded-2xl object-cover shadow-sm border" />
                        {previewUrl && (
                          <Button variant="outline" size="icon" type="button" onClick={handleRemoveFile} className="absolute -top-2 -right-2 h-7 w-7 rounded-full p-0">
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </FieldGroup>
              </FieldSet>
            </div>

            {/* Essential Details */}
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
                    <FieldLabel>Price</FieldLabel>
                    <FieldContent>
                      <Input type="number" step="0.01" value={form.price} onChange={handleChange("price")} placeholder="e.g. 99.50" />
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
                      <Textarea value={form.description} onChange={handleChange("description")} placeholder="Optional description" rows={3} className="resize-none" />
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </div>

            {/* Attributes */}
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

          {error && (
            <div className="rounded-lg my-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-xl my-3 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
          )}

          <div className="p-4 flex gap-3 justify-end border-t">
            <Button size="lg" type="button" variant="outline" onClick={() => { resetForm(); setError(""); setSuccess(""); }}>
              Reset
            </Button>
            <Button size="lg" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating Item..." : "Create Menu Item"}
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
