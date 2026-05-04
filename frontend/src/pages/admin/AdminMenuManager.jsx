import { useState, useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import API, { createMenuItem } from "../../services/api";
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
import { X } from "@boxicons/react";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminMenuManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, setAdmin } = useAdminAuth();

  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "Misc",
    description: "",
    imageUrl: "",
    tag: "",
    available: true,
    recommended: false,
    isVeg: false,
  });

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const imageFieldRef = useRef(null);

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
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5MB or smaller");
      return;
    }
    if (previewUrl?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch (err) {
        console.warn(err);
      }
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const handleRemoveFile = () => {
    if (previewUrl?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(previewUrl);
        imageFieldRef.current.value = "";
      } catch (err) {
        console.warn(err);
      }
    }
    setImageFile(null);
    setPreviewUrl("");
  };

  const resetForm = () => {
    setForm({
      name: "",
      price: "",
      category: "Misc",
      description: "",
      imageUrl: "",
      tag: "",
      available: true,
      recommended: false,
      isVeg: false,
    });
    handleRemoveFile();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.price || Number.isNaN(Number(form.price))) {
      setError("Valid price is required.");
      return;
    }

    setCreating(true);
    try {
      if (imageFile) {
        const formData = new FormData();
        formData.append("name", form.name.trim());
        formData.append("price", String(Number(form.price)));
        formData.append("category", form.category.trim() || "Misc");
        formData.append("description", form.description.trim());
        formData.append("available", String(form.available));
        formData.append("recommended", String(form.recommended));
        formData.append("tag", form.tag.trim());
        formData.append("isVeg", String(Boolean(form.isVeg)));
        formData.append("image", imageFile);
        await createMenuItem(formData);
      } else {
        await createMenuItem({
          name: form.name.trim(),
          price: Number(form.price),
          category: form.category.trim() || "Misc",
          description: form.description.trim(),
          imageUrl: form.imageUrl.trim(),
          available: form.available,
          recommended: form.recommended,
          tag: form.tag.trim(),
          isVeg: Boolean(form.isVeg),
        });
      }
      setSuccess("Menu item created successfully");
      resetForm();
      window.setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setAdmin(null);
        navigate("/login", {
          replace: true,
          state: { from: location.pathname },
        });
        return;
      }
      setError(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Failed to create menu item",
      );
    } finally {
      setCreating(false);
    }
  };

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

  if (!admin?.username || !admin?.password) {
    return (
      <Navigate to={"/login"} replace state={{ from: location.pathname }} />
    );
  }

  return (
    <>
      <AdminHeader
        title="Menu Management"
        description="Create a new menu item to be instantly available to your customers."
        className="mb-6"
      />

      <section>
        <form onSubmit={handleSubmit}>
          <div className="px-4 pb-4 space-y-2">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <FieldSet>
              <FieldLegend>Essential Details</FieldLegend>
              <FieldDescription className="mt-1 text-sm text-muted-foreground">
                The essential information customers will see.
              </FieldDescription>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
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

              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Upload Image</FieldLabel>
                  <FieldContent>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="image/*"
                        ref={imageFieldRef}
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
                      disabled={!!imageFile}
                    />
                  </FieldContent>
                </Field>

                {(previewUrl || form.imageUrl) && (
                  <div className="md:col-span-2 flex flex-col items-start gap-3">
                    <span className="text-sm font-medium">Preview</span>
                    <div className="relative">
                      <img
                        src={computeImageSrc(previewUrl || form.imageUrl)}
                        alt="Preview"
                        className="h-32 w-32 rounded-2xl object-cover shadow-sm border"
                      />
                      {previewUrl && (
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

              <FieldGroup className="md:max-w-sm">
                <Field className="md:max-w-sm" orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="available">Available</FieldLabel>
                    <FieldDescription>
                      Show this item on the menu
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="available"
                    checked={form.available}
                    onCheckedChange={handleSwitchChange("available")}
                  />
                </Field>

                <Field className="md:max-w-sm" orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="recommended">Recommended</FieldLabel>
                    <FieldDescription>
                      Show this item in recommendations
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="recommended"
                    checked={form.recommended}
                    onCheckedChange={handleSwitchChange("recommended")}
                  />
                </Field>

                <Field className="md:max-w-sm" orientation="horizontal">
                  <FieldContent className="space-y-0.5">
                    <FieldLabel htmlFor="isVeg">Veg Item</FieldLabel>
                    <FieldDescription>
                      Mark as strictly vegetarian
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="isVeg"
                    checked={form.isVeg}
                    onCheckedChange={handleSwitchChange("isVeg")}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </div>

          <div className="p-4 flex gap-3 justify-end border-t">
            <Button
              size="lg"
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setError("");
                setSuccess("");
              }}
              className="h-12 text-sm! w-full sm:max-w-37 font-medium!"
            >
              Reset
            </Button>
            <Button
              size="lg"
              type="submit"
              disabled={creating}
              className="h-12 text-sm! w-full sm:max-w-37 font-medium!"
            >
              {creating ? "Creating Item..." : "Create Menu Item"}
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
