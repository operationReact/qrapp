import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArchiveIcon, CheckCircleIcon, MagnifyingGlassIcon, PackageIcon, PlusIcon, SidebarIcon, WarningIcon, PencilSimpleIcon, ImageIcon, SparkleIcon, MinusIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocation } from "@/context/LocationContext";
import { useSidebar } from "@/components/ui/sidebar";
import { baseURL } from "@/services";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCatalogProduct,
  updateCatalogProduct,
  getCatalogProducts,
  updateCatalogAssignment,
  recordCatalogMovement,
  setCatalogProductActive,
  uploadCatalogImage,
  generateProductAiImage,
  approveProductAiImage,
  regenerateProductAiImage,
  discardProductAiImage,
  getCatalogSummary,
  getSimilarCatalogProducts,
  reuseCatalogProductImage,
  assignCatalogProduct,
} from "@/services/mrp-product-service";
import {
  createMrpProductCategory,
  getMrpProductCategories,
  removeCategoryImage,
  uploadCategoryImage,
} from "@/services/category-service";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export const Route = createFileRoute("/admin/(menu)/mrp-product")({
  component: ProductCatalogPage,
});
const EMPTY = {
  variantIdentity: "", name: "", brand: "", categoryName: "", description: "",
  mrp: "", costPrice: "", locationId: "", initialStock: "0", stockQuantity: "", lowStockThreshold: "5",
};

function productImageSource(product) {
  if (!product?.imageUrl) return null;
  return product.imageUrl.startsWith("http") ? product.imageUrl : `${baseURL}${product.imageUrl}`;
}

function productInitials(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return words.slice(0, 2).map((word) => word[0].toUpperCase()).join("");
}

function selectedAssignment(product, locationId) {
  return (product.assignments || []).find((item) => String(item.locationId) === String(locationId));
}

function stockState(quantity, threshold) {
  if (quantity == null) return { label: "Not configured", className: "bg-slate-100 text-slate-600" };
  if (quantity <= 0) return { label: "Out of stock", className: "bg-red-50 text-red-700" };
  if (quantity <= threshold) return { label: "Low stock", className: "bg-amber-50 text-amber-700" };
  return { label: "In stock", className: "bg-emerald-50 text-emerald-700" };
}

function stockLabel(quantity) {
  return quantity == null ? "Not configured" : `${quantity} units`;
}

function formatMoney(value) {
  if (value == null || value === "") return "—";
  return `₹${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}`;
}

function ProductCatalogPage() {
  const { availableLocations = [], activeLocationId } = useLocation();
  const { toggleSidebar } = useSidebar();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [categoryImagesOpen, setCategoryImagesOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [stock, setStock] = useState({});
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [aiStudio, setAiStudio] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [catalogLocationId, setCatalogLocationId] = useState("");
  const selectedLocation = availableLocations.find((location) => String(location.id) === String(catalogLocationId));
  const effectiveLocationId = selectedLocation ? String(selectedLocation.id)
      : catalogLocationId ? String(catalogLocationId)
          : activeLocationId ? String(activeLocationId) : "";
  const query = useQuery({
    queryKey: ["mrp-products", effectiveLocationId, search, stockFilter, availabilityFilter, categoryFilter, sortBy, page],
    queryFn: () => getCatalogProducts(effectiveLocationId, true, {
      search: search || undefined,
      stockStatus: stockFilter,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      active: availabilityFilter === "all" ? undefined : availabilityFilter === "enabled",
      sortBy,
      categoryName: categoryFilter === "all" ? undefined : categoryFilter,
      page,
      size: 20,
    }),
    enabled: Boolean(effectiveLocationId),
  });
  const summaryQuery = useQuery({
    queryKey: ["mrp-product-summary", effectiveLocationId],
    queryFn: () => getCatalogSummary(effectiveLocationId),
    enabled: Boolean(effectiveLocationId),
  });
  const categoryOptionsQuery = useQuery({
    queryKey: ["mrp-product-category-options", effectiveLocationId],
    queryFn: () => getMrpProductCategories(effectiveLocationId),
    enabled: Boolean(effectiveLocationId),
  });
  const [similarName, setSimilarName] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSimilarName(form.name.trim()), 350);
    return () => clearTimeout(timer);
  }, [form.name]);
  const similarQuery = useQuery({
    queryKey: ["mrp-similar", effectiveLocationId, similarName],
    queryFn: () => getSimilarCatalogProducts(effectiveLocationId, similarName),
    enabled: formOpen && Boolean(effectiveLocationId) && similarName.length >= 2,
  });
  const similarProducts = (similarQuery.data || []).filter((item) => String(item.productId) !== String(editingId));
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["mrp-products"] });
    queryClient.invalidateQueries({ queryKey: ["mrp-product-summary", effectiveLocationId] });
  };
  const create = useMutation({
    mutationFn: (variables) => {
      const payload = { ...variables };
      delete payload.imageFile;
      return createCatalogProduct(payload);
    },
    onSuccess: (product, variables) => {
      setForm(EMPTY);
      setFormOpen(false);
      setImageFile(null);
      invalidate();
      if (variables.imageFile && product?.id) image.mutate({ id: product.id, selected: variables.imageFile });
      toast.success("Product created for this location");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to create product"),
  });
  const edit = useMutation({
    mutationFn: ({ id, payload }) => updateCatalogProduct(id, payload),
    onSuccess: (_result, variables) => {
      setForm(EMPTY);
      setFormOpen(false);
      setEditingId(null);
      setImageFile(null);
      invalidate();
      if (variables.imageFile) image.mutate({ id: variables.id, selected: variables.imageFile });
      toast.success("Product updated");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to update product"),
  });
  const update = useMutation({
    mutationFn: ({ id, locationId, payload }) => updateCatalogAssignment(id, locationId, payload),
    onSuccess: () => { invalidate(); toast.success("Location inventory settings saved"); },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to update location settings"),
  });
  const movement = useMutation({
    mutationFn: ({ id, payload }) => recordCatalogMovement(id, payload),
    onSuccess: (_result, variables) => {
      invalidate();
      const product = queryClient.getQueryData(["mrp-products", effectiveLocationId, search, stockFilter, availabilityFilter, categoryFilter, sortBy, page])?.content?.find((item) => String(item.id) === String(variables.id));
      const assignment = product && selectedAssignment(product, variables.payload.locationId);
      if (assignment) setStock((all) => ({ ...all, [assignment.locationProductId]: { ...(all[assignment.locationProductId] || {}), quantity: "", reason: "" } }));
      toast.success("Stock movement recorded");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to update stock"),
  });
  const status = useMutation({
    mutationFn: ({ id, active }) => setCatalogProductActive(id, active, effectiveLocationId),
    onSuccess: invalidate,
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to change product status"),
  });
  const image = useMutation({
    mutationFn: ({ id, selected }) => uploadCatalogImage(id, effectiveLocationId, selected),
    onSuccess: invalidate,
    onError: () => toast.error("Image upload failed"),
  });
  const assignSimilar = useMutation({
    mutationFn: (productId) => assignCatalogProduct(productId, {
      locationId: Number(effectiveLocationId),
      lowStockThreshold: Number(form.lowStockThreshold || 5),
      initialStock: 0,
    }),
    onSuccess: () => {
      setForm(EMPTY);
      setFormOpen(false);
      setImageFile(null);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["mrp-similar"] });
      toast.success("Existing product added to this location");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to add product to this location"),
  });
  const reuseImage = useMutation({
    mutationFn: ({ id, sourceProductId }) => reuseCatalogProductImage(id, effectiveLocationId, sourceProductId),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["mrp-similar"] });
      toast.success("Image reused from the similar product");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to reuse image"),
  });
  const aiGenerate = useMutation({
    mutationFn: ({ id, source }) => generateProductAiImage(id, source),
    onSuccess: (session) => setAiStudio((current) => ({ ...current, session })),
    onError: (error) => toast.error(error?.response?.data?.message || "AI image generation is unavailable"),
  });
  const aiApprove = useMutation({
    mutationFn: ({ id, sessionId }) => approveProductAiImage(id, sessionId),
    onSuccess: (session) => {
      setAiStudio((current) => ({ ...current, session }));
      invalidate();
      toast.success("AI image approved and published");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Approval failed"),
  });
  const aiRegenerate = useMutation({
    mutationFn: ({ id, sessionId }) => regenerateProductAiImage(id, sessionId),
    onSuccess: (session) => setAiStudio((current) => ({ ...current, session })),
    onError: (error) => toast.error(error?.response?.data?.message || "Regeneration failed"),
  });
  const aiDiscard = useMutation({
    mutationFn: ({ id, sessionId }) => discardProductAiImage(id, sessionId),
    onSuccess: () => setAiStudio(null),
    onError: (error) => toast.error(error?.response?.data?.message || "Discard failed"),
  });
  const setField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const products = (query.data?.content || [])
      .map((product) => {
        const assignment = selectedAssignment(product, effectiveLocationId);
        const quantity = assignment?.availableQuantity ?? product.availableQuantity ?? null;
        const threshold = assignment?.lowStockThreshold ?? product.lowStockThreshold ?? 0;
        return { ...product, assignment, quantity, threshold, stock: stockState(quantity, threshold) };
      })
  ;
  const overview = summaryQuery.data
      ? {
        total: summaryQuery.data.totalProducts,
        available: summaryQuery.data.availableProducts,
        low: summaryQuery.data.lowStockProducts,
        out: summaryQuery.data.outOfStockProducts,
      }
      : null;
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const editingProduct = products.find((product) => String(product.id) === String(editingId));
  const visibleSimilar = !editingId ? similarProducts
    : editingProduct && !editingProduct.imageUrl ? similarProducts.filter((item) => item.shareableImage)
      : [];
  const categoryNames = Array.from(new Set([
    ...(categoryOptionsQuery.data || []).map((category) => category.name),
    ...(query.data?.content || []).map((product) => product.categoryName),
  ])).filter(Boolean).sort((a, b) => a.localeCompare(b));

  const openCreateForm = () => {
    setEditingId(null);
    setImageFile(null);
    setForm({ ...EMPTY, locationId: effectiveLocationId });
    setFormOpen(true);
  };
  const openEditForm = (product) => {
    setEditingId(product.id);
    setImageFile(null);
    setForm({
      variantIdentity: product.variantIdentity === "DEFAULT" ? "" : (product.variantIdentity || ""),
      name: product.name || "",
      brand: product.brand || "",
      categoryName: product.categoryName || "",
      description: product.description || "",
      mrp: product.mrp ?? "",
      costPrice: product.costPrice ?? "",
      locationId: effectiveLocationId,
      initialStock: "0",
      stockQuantity: product.quantity ?? "",
      lowStockThreshold: String(product.threshold ?? 5),
    });
    setSelectedProductId(null);
    setFormOpen(true);
  };
  const handleFormSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      locationId: effectiveLocationId ? Number(effectiveLocationId) : null,
      mrp: Number(form.mrp),
      costPrice: Number(form.costPrice),
      initialStock: Number(form.initialStock || 0),
      availableQuantity: form.stockQuantity === "" ? null : Number(form.stockQuantity),
      lowStockThreshold: Number(form.lowStockThreshold || 0),
    };
    if (editingId) {
      const { initialStock: _initialStock, stockQuantity: _stockQuantity, ...updatePayload } = payload;
      edit.mutate({ id: editingId, payload: updatePayload, imageFile });
    } else {
      create.mutate({ ...payload, imageFile });
    }
  };
  const clearFilters = () => {
    setSearch("");
    setStockFilter("all");
    setAvailabilityFilter("all");
    setCategoryFilter("all");
    setSortBy("name");
    setPage(0);
  };
  const hasFilters = search || stockFilter !== "all" || availabilityFilter !== "all" || categoryFilter !== "all" || sortBy !== "name";

  const fieldClass = "h-11 w-full rounded-xl border border-[#ece8e2] bg-[#fbf8f6] px-3 text-sm font-normal outline-none transition placeholder:text-[#a8a29b] focus:border-[#ff2438] focus:bg-white focus:ring-4 focus:ring-[#ff2438]/10";
  const sectionTitleClass = "text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#858079]";
  const labelClass = "min-w-0 space-y-1.5 text-xs font-semibold text-[#514d48]";
  return (
      <main className="mrp-catalog-premium relative min-h-screen min-w-0 overflow-x-hidden bg-[#fbf8f6] text-[#242220]">
        <style>{`
          @keyframes mrpRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
          @keyframes mrpShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          .mrp-rise { animation: mrpRise .5s cubic-bezier(.2,.7,.2,1) both; }
          .mrp-btn-brand { background: linear-gradient(135deg,#ff2438 0%,#d91a2b 100%); color: #ffffff; box-shadow: 0 8px 20px -10px rgba(255,36,56,.6); transition: transform .2s ease, filter .2s ease; }
          .mrp-btn-brand:hover { filter: brightness(1.06); transform: translateY(-1px); }
          .mrp-btn-brand:disabled { opacity: .5; transform: none; cursor: not-allowed; }
          .mrp-skeleton { background: linear-gradient(90deg,#f3efeb 25%,#fbf8f6 50%,#f3efeb 75%); background-size: 200% 100%; animation: mrpShimmer 1.4s linear infinite; }
          @media (prefers-reduced-motion: reduce) { .mrp-rise, .mrp-skeleton { animation: none; } }
          .mrp-hdr { display: grid; gap: 20px; position: relative; overflow: hidden; padding: 20px; border-radius: 24px; background: #ffffff; border: 1px solid #ece8e2; box-shadow: 0 1px 2px rgba(36,34,32,.04), 0 12px 28px -20px rgba(217,26,43,.35); }
          .mrp-hdr::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: linear-gradient(180deg,#ff2438 0%,#d91a2b 100%); }
          .mrp-hdr-top { display: flex; align-items: flex-start; gap: 14px; min-width: 0; }
          .mrp-hdr-icon { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: 12px; border: 1px solid #ece8e2; background: #fbf8f6; color: #d92334; cursor: pointer; }
          .mrp-hdr-title { min-width: 0; flex: 1; }
          .mrp-hdr-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: #d92334; }
          .mrp-hdr-h1 { margin-top: 4px; font-size: 24px; line-height: 1.15; font-weight: 800; letter-spacing: -.01em; color: #242220; }
          .mrp-hdr-sub { margin-top: 6px; font-size: 14px; line-height: 1.5; color: #77736f; }
          .mrp-hdr-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .mrp-hdr-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 14px; border-radius: 12px; font-size: 14px; font-weight: 700; white-space: nowrap; min-width: 0; cursor: pointer; }
          .mrp-hdr-btn-ghost { background: #ffffff; color: #514d48; border: 1px solid #e5e2dd; transition: border-color .2s ease, color .2s ease; }
          .mrp-hdr-btn-ghost:hover { border-color: rgba(255,36,56,.45); color: #d92334; }
          .mrp-hdr-btn:disabled { opacity: .45; cursor: not-allowed; }
          @media (min-width: 1024px) {
            .mrp-hdr { grid-template-columns: 1fr auto; align-items: center; padding: 24px 28px; }
            .mrp-hdr-actions { grid-template-columns: auto auto; }
            .mrp-hdr-btn { padding: 0 18px; }
          }
        `}</style>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(900px_300px_at_12%_-8%,rgba(255,36,56,0.10),transparent),radial-gradient(700px_260px_at_96%_0%,rgba(255,138,149,0.16),transparent)]" />
        <div className="relative mx-auto min-w-0 max-w-[1680px] space-y-4 px-3 py-3 pb-24 sm:px-5 sm:py-5 sm:pb-8 lg:px-7 lg:py-6">
          <header className="mrp-rise mrp-hdr" style={{ animationDelay: "0ms" }}>
            <div className="mrp-hdr-top">
              <button type="button" onClick={toggleSidebar} aria-label="Open admin navigation" className="mrp-hdr-icon">
                <SidebarIcon className="size-[18px]" />
              </button>
              <div className="mrp-hdr-title">
                <p className="mrp-hdr-eyebrow">Catalog workspace</p>
                <h1 className="mrp-hdr-h1">MRP Products</h1>
                <p className="mrp-hdr-sub">Manage products, categories, pricing and location inventory.</p>
              </div>
            </div>
            <div className="mrp-hdr-actions">
              <button type="button" onClick={() => setCategoryImagesOpen(true)} disabled={!effectiveLocationId} className="mrp-hdr-btn mrp-hdr-btn-ghost">
                Manage categories
              </button>
              <button type="button" onClick={openCreateForm} disabled={!effectiveLocationId} className="mrp-btn-brand mrp-hdr-btn">
                <PlusIcon weight="bold" className="size-4" /> Add product
              </button>
            </div>
          </header>

          <section className="mrp-rise flex flex-col gap-3 rounded-2xl border border-[#ece8e2] bg-white p-3 shadow-sm sm:flex-row sm:items-end sm:p-4" style={{ animationDelay: "60ms" }}>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-md">
              <span className={sectionTitleClass}>Location</span>
              <LocationCombobox value={catalogLocationId || effectiveLocationId} options={availableLocations} placeholder="Choose a location"
                                onChange={(locationId) => { setCatalogLocationId(locationId); setPage(0); setForm((current) => ({ ...current, locationId })); }} />
            </div>
            <p className="text-xs leading-5 text-[#858079] sm:max-w-xs">Stock, visibility and alerts below apply only to the selected location.</p>
          </section>

          {!effectiveLocationId && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <WarningIcon className="mt-0.5 size-5 shrink-0" />
            <div><p className="font-semibold">Select a location to manage inventory</p><p className="mt-1 text-amber-800">Choose a location above to view stock levels and make location-specific changes.</p></div>
          </div>}

          {effectiveLocationId && <section aria-label="Inventory summary" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { label: "Total products", value: overview?.total, icon: PackageIcon, accent: "#ff2438", soft: "#fff0ed" },
              { label: "Available", value: overview?.available, icon: CheckCircleIcon, accent: "#16a34a", soft: "#ecfdf3" },
              { label: "Low stock", value: overview?.low, icon: WarningIcon, accent: "#d97706", soft: "#fff7e6" },
              { label: "Out of stock", value: overview?.out, icon: ArchiveIcon, accent: "#b91c1c", soft: "#fdecec" },
              { label: "Avg. profit margin", value: summaryQuery.data?.averageProfitMarginPercent == null ? null : `${Number(summaryQuery.data.averageProfitMarginPercent).toFixed(2)}%`, icon: SparkleIcon, accent: "#7c3aed", soft: "#f3ecff" },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={`mrp-rise relative overflow-hidden rounded-2xl border border-[#ece8e2] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${index === 4 ? "col-span-2 lg:col-span-1" : ""}`} style={{ animationDelay: `${index * 60}ms` }}>
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: item.accent }} />
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-[#77736f]">{item.label}</p>
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl" style={{ background: item.soft, color: item.accent }}><Icon className="size-4" /></span>
                  </div>
                  <p className="mt-3 text-2xl font-extrabold tabular-nums tracking-tight text-[#242220]">{summaryQuery.isLoading ? <span className="mrp-skeleton inline-block h-7 w-14 rounded-lg" /> : (item.value ?? "—")}</p>
                </div>
              );
            })}
          </section>}

          <section className="mrp-rise overflow-hidden rounded-2xl border border-[#ece8e2] bg-white shadow-sm" style={{ animationDelay: "120ms" }}>
            <div className="space-y-3 border-b border-[#f1ede8] p-3 sm:p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <label className="relative block min-w-0 flex-1">
                  <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#a19b93]" />
                  <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }}
                         placeholder="Search product, brand or pack size" aria-label="Search MRP products"
                         className="h-11 w-full rounded-xl border border-[#ece8e2] bg-[#fbf8f6] pl-10 pr-3 text-sm outline-none transition placeholder:text-[#a8a29b] focus:border-[#ff2438] focus:bg-white focus:ring-4 focus:ring-[#ff2438]/10" />
                </label>
                <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3">
                  <FilterPills ariaLabel="Filter by stock" label="Stock" value={stockFilter} onChange={(value) => { setStockFilter(value); setPage(0); }}
                               options={[["all", "All"], ["in", "In stock"], ["low", "Low"], ["out", "Out"]]} />
                  <FilterPills ariaLabel="Filter by availability" label="Status" value={availabilityFilter} onChange={(value) => { setAvailabilityFilter(value); setPage(0); }}
                               options={[["all", "All"], ["enabled", "Enabled"], ["disabled", "Disabled"]]} />
                  <CatalogFilterSelect label="Sort by" ariaLabel="Sort products" value={sortBy} onChange={(value) => { setSortBy(value); setPage(0); }} options={[["name", "Name: A-Z"], ["mrp", "MRP: low to high"], ["stock", "Stock: low to high"], ["updated", "Recently updated"]]} className="w-full sm:w-[190px]" />
                </div>
              </div>
              {categoryOptionsQuery.isError && <div className="flex items-center justify-between gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                <span>Categories could not be loaded.</span>
                <button type="button" onClick={() => categoryOptionsQuery.refetch()} className="font-semibold underline">Retry</button>
              </div>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fdfbfa] px-4 py-2.5 text-xs text-[#77736f] sm:px-5">
              <p><span className="font-bold text-[#242220]">{products.length}</span>{query.data?.totalElements != null ? ` of ${query.data.totalElements}` : ""} products {hasFilters ? "after filtering" : "in this location"}</p>
              {hasFilters && <button type="button" onClick={clearFilters} className="font-semibold text-[#d92334] hover:underline">Clear filters</button>}
            </div>

            {query.isError && <div className="flex items-center justify-between gap-3 bg-red-50 px-4 py-3 text-sm text-red-700"><span>Unable to load MRP products.</span><button type="button" className="font-semibold underline" onClick={() => query.refetch()}>Retry</button></div>}
            {summaryQuery.isError && <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700"><span>Inventory summary is temporarily unavailable.</span><button type="button" className="font-semibold underline" onClick={() => summaryQuery.refetch()}>Retry</button></div>}

            {query.isLoading ? <div className="space-y-3 p-4">{[1, 2, 3, 4].map((item) => <div key={item} className="flex gap-3"><div className="mrp-skeleton size-12 rounded-xl" /><div className="flex-1 space-y-2 py-1"><div className="mrp-skeleton h-3 w-1/3 rounded" /><div className="mrp-skeleton h-3 w-1/2 rounded" /></div></div>)}</div> : <>
              <div className="divide-y divide-[#f1ede8] md:hidden">
                {products.map((product, index) => {
                  const imageSource = productImageSource(product);
                  return <article key={product.id} className="mrp-rise p-3.5 transition hover:bg-[#fffafa] sm:p-4" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                    <div className="flex min-w-0 items-start gap-3">
                      <ProductThumb name={product.name} imageSource={imageSource} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><h2 className="break-words text-sm font-bold leading-5 text-[#242220]">{product.name}</h2><p className="mt-0.5 truncate text-xs text-[#858079]">{product.brand || "No brand"}{product.variantIdentity && product.variantIdentity !== "DEFAULT" ? ` · ${product.variantIdentity}` : ""}</p></div>
                          <div className="shrink-0"><StatusToggle active={product.active} disabled={status.isPending} onClick={() => status.mutate({ id: product.id, active: !product.active })} /></div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[#f1ede8] bg-[#f1ede8] text-[11px]">
                          <div className="bg-[#fdfbfa] p-2"><p className="text-[#858079]">MRP</p><p className="mt-0.5 truncate font-bold text-[#242220]">{formatMoney(product.mrp)}</p></div>
                          <div className="bg-[#fdfbfa] p-2"><p className="text-[#858079]">Cost</p><p className="mt-0.5 truncate font-semibold text-[#514d48]">{formatMoney(product.costPrice)}</p></div>
                          <div className="bg-[#fdfbfa] p-2"><p className="text-[#858079]">Margin</p><p className="mt-0.5 truncate font-bold text-blue-700">{product.profitMarginPercent == null ? "—" : `${product.profitMarginPercent}%`}</p></div>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#393632]">{stockLabel(product.quantity)}</span>
                          <StockBadge stock={product.stock} />
                        </div>
                        <button type="button" onClick={() => setSelectedProductId(product.id)} className="mt-3 h-10 w-full rounded-xl border border-[#ffd3cd] bg-[#fff7f5] px-3 text-xs font-bold text-[#d92334] transition hover:bg-[#ffe9e5]">Open product workspace</button>
                      </div>
                    </div>
                  </article>;
                })}
              </div>

              <div className="relative hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1020px] text-left text-sm">
                  <thead className="border-b border-[#f1ede8] bg-[#fcfaf8] text-[11px] font-bold uppercase tracking-wider text-[#858079]"><tr>
                    <th scope="col" className="sticky left-0 z-10 bg-[#fcfaf8] px-4 py-3">Product</th><th scope="col" className="px-3 py-3">Category</th><th scope="col" className="px-3 py-3 text-right">MRP</th><th scope="col" className="px-3 py-3 text-right">Cost price</th><th scope="col" className="px-3 py-3 text-right">Profit margin</th><th scope="col" className="px-3 py-3">Location stock</th><th scope="col" className="px-3 py-3">Status</th><th scope="col" className="sticky right-0 z-10 bg-[#fcfaf8] px-4 py-3 text-right">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#f1ede8]">
                  {products.map((product) => {
                    const imageSource = productImageSource(product);
                    return <tr key={product.id} className="group transition hover:bg-[#fffafa]">
                      <td className="sticky left-0 z-[1] bg-white px-4 py-3 group-hover:bg-[#fffafa]"><div className="flex min-w-0 items-center gap-3">
                        <ProductThumb name={product.name} imageSource={imageSource} />
                        <div className="min-w-0"><p className="max-w-[260px] truncate font-bold text-[#242220]">{product.name}</p><p className="mt-0.5 max-w-[260px] truncate text-xs text-[#858079]">{product.brand || "No brand"} · {product.variantIdentity && product.variantIdentity !== "DEFAULT" ? product.variantIdentity : "Default pack"}</p></div>
                      </div></td>
                      <td className="px-3 py-3"><span className="inline-flex rounded-lg bg-[#f6f2ef] px-2 py-1 text-xs font-semibold text-[#514d48]">{product.categoryName || "Uncategorized"}</span></td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums">{formatMoney(product.mrp)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-[#77736f]">{formatMoney(product.costPrice)}</td>
                      <td className="px-3 py-3 text-right"><span className="inline-flex rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold tabular-nums text-blue-700">{product.profitMarginPercent == null ? "—" : `${product.profitMarginPercent}%`}</span></td>
                      <td className="px-3 py-3"><div className="flex flex-col items-start gap-1.5"><span className="text-sm font-bold tabular-nums">{stockLabel(product.quantity)}</span><StockBadge stock={product.stock} /></div></td>
                      <td className="px-3 py-3"><StatusToggle active={product.active} disabled={status.isPending} onClick={() => status.mutate({ id: product.id, active: !product.active })} /></td>
                      <td className="sticky right-0 z-[1] bg-white px-4 py-3 group-hover:bg-[#fffafa]">                      <div className="flex justify-end"><button type="button" onClick={() => setSelectedProductId(product.id)} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#ffd3cd] bg-[#fff7f5] px-3.5 text-xs font-bold text-[#d92334] transition hover:bg-[#ffe9e5]">Open workspace<span aria-hidden="true">→</span></button></div></td>
                    </tr>;
                  })}
                  </tbody>
                </table>
              </div>
              {!products.length && <div className="px-4 py-12 text-center sm:py-16">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl text-[#d92334]" style={{ background: "linear-gradient(135deg,#fff0ed 0%,#ffe3df 100%)" }}><PackageIcon className="size-7" /></div>
                <h3 className="mt-4 text-base font-extrabold text-[#242220]">No products in this view</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#858079]">{categoryFilter !== "all" ? `There are no products in ${categoryFilter} for this location.` : "Try changing your search or filters, or add the first MRP product."}</p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {hasFilters && <button type="button" onClick={clearFilters} className="h-10 rounded-xl border border-[#e5e2dd] bg-white px-4 text-xs font-semibold text-[#514d48] transition hover:border-[#ff2438]/40 hover:text-[#d92334]">Clear filters</button>}
                  <button type="button" onClick={openCreateForm} disabled={!effectiveLocationId} className="mrp-btn-brand h-10 rounded-xl px-4 text-xs font-bold">Add product</button>
                </div>
              </div>}
            </>}
            <footer className="flex flex-col gap-3 border-t border-[#f1ede8] bg-[#fdfbfa] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#77736f]">Page <span className="font-bold text-[#242220]">{page + 1}</span>{query.data?.totalPages ? ` of ${query.data.totalPages}` : ""}</p>
              <div className="flex gap-2">
                <button type="button" disabled={page === 0 || query.isLoading} onClick={() => setPage((value) => Math.max(0, value - 1))} className="h-10 flex-1 rounded-xl border border-[#e5e2dd] bg-white px-4 text-sm font-semibold text-[#514d48] transition hover:border-[#ff2438]/40 hover:text-[#d92334] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none">Previous</button>
                <button type="button" disabled={!query.data || query.data.last || query.isLoading} onClick={() => setPage((value) => value + 1)} className="h-10 flex-1 rounded-xl border border-[#e5e2dd] bg-white px-4 text-sm font-semibold text-[#514d48] transition hover:border-[#ff2438]/40 hover:text-[#d92334] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none">Next</button>
              </div>
            </footer>
          </section>
          {categoryImagesOpen && <ProductCategoryImages
              locationId={effectiveLocationId}
              categoryNames={categoryNames}
              onClose={() => setCategoryImagesOpen(false)}
          />}
        </div>

        {formOpen && <div className="fixed inset-0 z-50 flex min-h-0 items-start justify-center overflow-y-auto bg-[#1f1614]/40 py-2 backdrop-blur-sm sm:items-center sm:overflow-hidden sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setFormOpen(false); setEditingId(null); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="catalog-form-title" className="mrp-rise flex h-[calc(100svh-1rem)] max-h-none w-full min-w-0 flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:h-auto sm:max-h-[94dvh] sm:max-w-2xl">
            <header className="flex shrink-0 items-start justify-between gap-3 px-5 py-4 sm:px-6" style={{ background: "linear-gradient(135deg,#fff7f7 0%,#ffffff 100%)" }}>
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d92334]">MRP Product</p><h2 id="catalog-form-title" className="mt-1 text-lg font-extrabold text-[#242220]">{editingId ? "Edit product" : "Add new product"}</h2><p className="mt-1 text-xs text-[#77736f]">Enter product information and pricing details.</p></div>
              <button type="button" aria-label="Close product form" onClick={() => { setFormOpen(false); setEditingId(null); }} className="grid size-9 shrink-0 place-items-center rounded-full border border-[#e5e2dd] bg-white text-xl leading-none text-[#77736f] transition hover:bg-[#f8f7f4]">×</button>
            </header>
            <form className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleFormSubmit}>
              <div className="h-0 min-h-0 flex-1 space-y-6 overflow-y-scroll overscroll-contain p-4 sm:p-6">
                <section className="space-y-3">
                  <h3 className={sectionTitleClass}>Product information</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[['name','Product name','text'],['brand','Brand','text'],['variantIdentity','Variant / pack size','text']].map(([name,label,type]) => <label key={name} className={labelClass}>{label}{name === 'name' && <span className="text-[#d92334]"> *</span>}<input name={name} value={form[name]} placeholder={name === 'variantIdentity' ? 'e.g. 250 g, 1 L, pack of 6' : name === 'brand' ? 'Enter brand' : 'Enter product name'} onChange={setField} required={name === 'name'} type={type} className={fieldClass} /></label>)}
                    <label className={labelClass}>
                      Category
                      <CategoryCombobox value={form.categoryName} options={categoryNames} onChange={(categoryName) => setForm((current) => ({ ...current, categoryName }))} />
                      <span className="block text-[11px] font-normal text-[#858079]">Select a suggestion or enter a new category name.</span>
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>Description <textarea name="description" value={form.description} onChange={setField} rows={2} placeholder="Optional product description" className="w-full rounded-xl border border-[#ece8e2] bg-[#fbf8f6] px-3 py-2 text-sm font-normal outline-none transition focus:border-[#ff2438] focus:bg-white focus:ring-4 focus:ring-[#ff2438]/10" /></label>
                  </div>
                </section>
                {visibleSimilar.length > 0 && (
                  <section className="rounded-2xl border border-[#ffd3d8] bg-[#fff7f8] p-4">
                    <h3 className="text-sm font-bold text-[#9b1721]">{editingId ? "Reuse an image from a similar product" : "Similar product already exists"}</h3>
                    <p className="mt-1 text-xs text-[#77736f]">{editingId ? "The image is shared by reference, so nothing is stored twice." : "Add it to this location instead of creating a duplicate."}</p>
                    <ul className="mt-3 space-y-2">
                      {visibleSimilar.map((item) => {
                        const thumb = productImageSource(item);
                        return (
                          <li key={item.productId} className="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm">
                            <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f4f2ee]">{thumb ? <img src={thumb} alt="" className="size-full object-cover" /> : <PackageIcon size={18} className="text-[#a09b95]" />}</div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{item.name}</p>
                              <p className="truncate text-xs text-[#77736f]">{[item.brand, item.variantIdentity, item.categoryName].filter(Boolean).join(" · ")}</p>
                            </div>
                            {editingId ? (
                              <button type="button" disabled={reuseImage.isPending} onClick={() => reuseImage.mutate({ id: editingId, sourceProductId: item.productId })} className="mrp-btn-brand h-9 shrink-0 rounded-lg px-3 text-xs font-bold">Use image</button>
                            ) : item.assignedToLocation ? (
                              <span className="shrink-0 rounded-full bg-[#eef8f0] px-2.5 py-1 text-[11px] font-semibold text-[#1f7a3d]">Already here</span>
                            ) : (
                              <button type="button" disabled={assignSimilar.isPending} onClick={() => assignSimilar.mutate(item.productId)} className="mrp-btn-brand h-9 shrink-0 rounded-lg px-3 text-xs font-bold">Add to this location</button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
                <section className="space-y-3">
                  <h3 className={sectionTitleClass}>Product image</h3>
                  <p className="text-xs leading-5 text-[#77736f]">{editingId ? "Upload a new image to replace the current product image." : "Add a JPEG, PNG or WEBP image for this product."} Images are auto-enhanced: subject cropped, tone balanced, sharpened and framed on a square card.</p>
                  <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-[#e0d6cd] bg-[#fbf8f6] px-3 py-2 text-sm font-semibold text-[#514d48] transition hover:border-[#ff2438] hover:bg-white"><span className="min-w-0 truncate">{imageFile ? imageFile.name : "Choose product image"}</span><span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#d92334] shadow-sm">Browse</span><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) setImageFile(selected); }} /></label>
                </section>
                <section className="space-y-3">
                  <h3 className={sectionTitleClass}>Pricing</h3>
                  <div className="grid gap-3 sm:grid-cols-2">{[['mrp','MRP (₹)'],['costPrice','Cost price (₹)']].map(([name,label]) => <label key={name} className={labelClass}>{label} <span className="text-[#d92334]">*</span><div className="flex h-11 items-center rounded-xl border border-[#ece8e2] bg-[#fbf8f6] transition focus-within:border-[#ff2438] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#ff2438]/10"><span className="pl-3 text-sm text-[#858079]">₹</span><input name={name} value={form[name]} onChange={setField} required type="number" min="0" step="0.01" className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-normal outline-none" placeholder="0.00" /></div></label>)}</div>
                </section>
                {editingId && <section className="space-y-3">
                  <h3 className={sectionTitleClass}>Location inventory</h3>
                  <p className="text-xs text-[#77736f]">Set the current stock quantity for the selected location. The change is recorded as an audited adjustment.</p>
                  <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Stock quantity<input name="stockQuantity" value={form.stockQuantity} onChange={setField} type="number" min="0" step="1" required className={fieldClass} /></label><label className={labelClass}>Low-stock threshold<input name="lowStockThreshold" value={form.lowStockThreshold} onChange={setField} type="number" min="0" step="1" className={fieldClass} /></label></div>
                </section>}
                {!editingId && <section className="space-y-3">
                  <h3 className={sectionTitleClass}>Initial location inventory</h3>
                  <p className="text-xs text-[#77736f]">Stock is created only for the selected location.</p>
                  <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Opening stock<input name="initialStock" value={form.initialStock} onChange={setField} type="number" min="0" step="1" disabled={!effectiveLocationId} className={`${fieldClass} disabled:opacity-50`} /></label><label className={labelClass}>Low-stock threshold<input name="lowStockThreshold" value={form.lowStockThreshold} onChange={setField} type="number" min="0" step="1" className={fieldClass} /></label></div>
                </section>}
              </div>
              <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#f1ede8] bg-white px-4 py-3 shadow-[0_-8px_20px_rgba(32,33,36,0.05)] sm:flex-row sm:justify-end sm:px-6">
                <button type="button" onClick={() => { setFormOpen(false); setEditingId(null); }} className="h-11 rounded-xl border border-[#e5e2dd] bg-white px-5 text-sm font-semibold text-[#514d48] transition hover:bg-[#f8f7f4]">Cancel</button>
                {editingId && editingProduct && <button type="button" onClick={() => { setFormOpen(false); setAiStudio({ product: editingProduct, source: null, preview: null, session: null }); }} className="h-11 rounded-xl bg-[#fff0ed] px-5 text-sm font-semibold text-[#d92334] transition hover:bg-[#ffe3df]">AI image studio</button>}
                <button type="submit" disabled={create.isPending || edit.isPending} className="mrp-btn-brand inline-flex h-11 min-w-[140px] items-center justify-center whitespace-nowrap rounded-xl px-5 text-sm font-bold">{create.isPending || edit.isPending ? "Saving…" : editingId ? "Save changes" : "Create product"}</button>
              </footer>
            </form>
          </section>
        </div>}

        {selectedProduct && <ProductManageDrawer product={selectedProduct} onClose={() => setSelectedProductId(null)} locationId={effectiveLocationId} stock={stock} setStock={setStock} update={update} movement={movement} onEdit={() => openEditForm(selectedProduct)} onReplace={(fileValue) => image.mutate({ id: selectedProduct.id, selected: fileValue })} onAiImage={() => { setSelectedProductId(null); setAiStudio({ product: selectedProduct, source: null, preview: null, session: null }); }} onToggleStatus={() => status.mutate({ id: selectedProduct.id, active: !selectedProduct.active })} statusPending={status.isPending} />}
        {aiStudio && <ProductAiStudio studio={aiStudio} setStudio={setAiStudio} generating={aiGenerate.isPending} approving={aiApprove.isPending} regenerating={aiRegenerate.isPending} discarding={aiDiscard.isPending} onGenerate={() => aiGenerate.mutate({ id: aiStudio.product.id, source: aiStudio.source })} onApprove={() => aiApprove.mutate({ id: aiStudio.product.id, sessionId: aiStudio.session.sessionId })} onRegenerate={() => aiRegenerate.mutate({ id: aiStudio.product.id, sessionId: aiStudio.session.sessionId })} onDiscard={() => aiDiscard.mutate({ id: aiStudio.product.id, sessionId: aiStudio.session.sessionId })} />}
      </main>
  );
}

function ProductManageDrawer({ product, onClose, locationId, stock, setStock, update, movement, onEdit, onReplace, onAiImage, onToggleStatus, statusPending }) {
  const [activePanel, setActivePanel] = useState("inventory");
  const assignment = selectedAssignment(product, locationId);
  const stockDraft = assignment ? (stock[assignment.locationProductId] || {}) : {};
  const imageSource = productImageSource(product);
  const productStock = stockState(product.quantity, product.threshold);
  const threshold = Number(assignment?.lowStockThreshold ?? product.threshold ?? 5);
  const fillPercent = Math.min(100, Math.round((Number(product.quantity || 0) / Math.max(threshold * 3, 1)) * 100));
  const setDraft = (patch) => {
    if (!assignment) return;
    setStock((all) => ({ ...all, [assignment.locationProductId]: { ...(all[assignment.locationProductId] || {}), ...patch } }));
  };
  const submitMovement = (movementType) => {
    const quantity = Number(stockDraft.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error("Enter a whole number greater than zero");
      return;
    }
    if (!String(stockDraft.reason || "").trim()) {
      toast.error("Enter a reason for this stock adjustment");
      return;
    }
    movement.mutate({
      id: product.id,
      payload: {
        locationId: assignment.locationId,
        movementType,
        quantity,
        reason: String(stockDraft.reason).trim(),
      },
    });
  };
  const inputClass = "h-11 w-full rounded-xl border border-[#e5e2dd] bg-[#fcfbfa] px-3 text-sm font-normal outline-none transition focus:border-[#ff2438] focus:bg-white focus:ring-4 focus:ring-[#ff2438]/10";
  const cardClass = "rounded-2xl bg-white p-4 shadow-sm border border-[#ece8e2] sm:p-5";
  const brandButton = { background: "linear-gradient(135deg,#ff2438 0%,#d91a2b 100%)", color: "#ffffff" };
  return (
      <Drawer open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DrawerContent className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-none border-0 bg-[#f6f4f1] sm:ml-auto sm:max-w-[580px]">
          <DrawerHeader className="relative shrink-0 overflow-hidden px-5 pb-5 pt-5 text-left text-[#242220]" style={{ background: "linear-gradient(180deg,#fff7f7 0%,#ffffff 100%)" }}>
            
            
            <div className="relative flex items-start gap-4">
              {imageSource ? <img src={imageSource} alt={product.name} className="size-[76px] shrink-0 rounded-2xl border border-[#ece8e2] bg-white object-contain p-1.5 shadow-sm" /> : <div className="grid size-[76px] shrink-0 place-items-center rounded-2xl border border-dashed border-[#ddd8d1] bg-[#f8f7f4] text-[#a19b93]"><PackageIcon className="size-7" /></div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DrawerTitle className="min-w-0 text-lg font-extrabold leading-6 tracking-tight text-[#242220]">{product.name}</DrawerTitle>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${product.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}><span className={`size-1.5 rounded-full ${product.active ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`} />{product.active ? "Enabled" : "Disabled"}</span>
                </div>
                <DrawerDescription className="mt-1 text-xs leading-5 text-[#77736f]">{product.brand || "No brand"} · {product.categoryName || "Uncategorized"} · {product.variantIdentity && product.variantIdentity !== "DEFAULT" ? product.variantIdentity : "Default pack"}</DrawerDescription>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-[#fff0ed] px-2.5 py-1 text-xs font-bold text-[#d92334]">MRP ₹{product.mrp}</span>
                  <span className="rounded-lg bg-[#f6f4f1] px-2.5 py-1 text-xs font-semibold text-[#514d48]">Cost ₹{product.costPrice}</span>
                </div>
              </div>
              <DrawerClose asChild><button type="button" aria-label="Close product workspace" className="grid size-9 shrink-0 place-items-center rounded-full border border-[#e5e2dd] bg-white text-lg leading-none text-[#514d48] transition hover:bg-[#f8f7f4]">×</button></DrawerClose>
            </div>
          </DrawerHeader>

          <div className="shrink-0 bg-white px-4 py-3 shadow-[0_6px_16px_rgba(32,33,36,0.05)] sm:px-5">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#f1efeb] p-1">
              {[
                ["inventory", "Inventory", "Stock & movements"],
                ["details", "Product details", "Pricing, image & status"],
              ].map(([panel, label, description]) => (
                <button key={panel} type="button" onClick={() => setActivePanel(panel)} className={`rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${activePanel === panel ? "bg-white text-[#d92334] shadow-md border border-[#ece8e2]" : "text-[#77736f] hover:text-[#242220]"}`}>
                  <span className="block text-sm font-bold">{label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 opacity-80">{description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-6 pt-4 sm:px-5">
            {activePanel === "inventory" && <>
              <section className={cardClass}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e52b3a]">Location inventory</p>
                    <h3 className="mt-1 truncate text-base font-bold text-[#242220]">{assignment?.locationName || "Selected location"}</h3>
                  </div>
                  {assignment && <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${productStock.className}`}>{stockLabel(product.quantity)} · {productStock.label}</span>}
                </div>
                {assignment ? <>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-[#f3dcdf] p-4 text-[#242220]" style={{ background: "linear-gradient(135deg,#fff7f7 0%,#ffffff 100%)" }}>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#77736f]">Current stock</p>
                        <p className="mt-1 text-4xl font-extrabold tabular-nums leading-none">{product.quantity == null ? "—" : product.quantity}<span className="ml-2 text-sm font-medium text-[#77736f]">{product.quantity == null ? "not configured" : "units"}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#77736f]">Alert at</p>
                        <p className="mt-1 text-lg font-bold">{threshold} units</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#f1efeb]">
                      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${fillPercent}%`, background: "linear-gradient(90deg,#ff2438 0%,#ff8a95 100%)" }} />
                    </div>
                    <p className="mt-2 text-[11px] text-[#a19b93]">Bar shows stock against three times the alert level.</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#fbfaf8] p-3 border border-[#ece8e2]"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#77736f]">Stock status</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${productStock.className}`}>{productStock.label}</span></div>
                    <div className="rounded-xl bg-[#fbfaf8] p-3 border border-[#ece8e2]"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#77736f]">Visibility</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${assignment.visible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{assignment.visible ? "Visible" : "Hidden"}</span></div>
                  </div>
                </> : <div className="mt-4 rounded-xl border border-dashed border-[#ddd8d1] bg-[#faf9f7] p-4"><p className="text-sm font-semibold">Not assigned to this location</p><p className="mt-1 text-xs leading-5 text-[#77736f]">This product has no inventory assignment for the selected location. Use the existing assignment workflow to make it available here.</p></div>}
              </section>

              {assignment && <>
                <section className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div><h4 className="text-sm font-bold text-[#242220]">Stock adjustment</h4><p className="mt-1 text-xs leading-5 text-[#77736f]">Record stock received or removed. Every movement needs a reason.</p></div>
                    <span className="shrink-0 rounded-lg bg-[#fff0ed] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#d92334]">Audited</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-semibold text-[#514d48]">Quantity to move<input type="number" min="1" step="1" inputMode="numeric" value={stockDraft.quantity || ""} onChange={(event) => setDraft({ quantity: event.target.value })} placeholder="e.g. 24" className={inputClass} /></label>
                    <label className="space-y-1.5 text-xs font-semibold text-[#514d48]">Reason <span className="text-[#d92334]">*</span><input value={stockDraft.reason || ""} onChange={(event) => setDraft({ reason: event.target.value })} placeholder="Purchase receipt, damaged goods…" className={inputClass} /></label>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" disabled={movement.isPending} onClick={() => submitMovement("ADD_STOCK")} style={brandButton} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-sm shadow-[#ff2438]/20 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"><PlusIcon className="size-4" weight="bold" />{movement.isPending ? "Saving…" : "Receive stock"}</button>
                    <button type="button" disabled={movement.isPending} onClick={() => submitMovement("REDUCE_STOCK")} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e5e2dd] bg-white text-sm font-bold text-[#514d48] transition hover:border-[#ff2438]/40 hover:text-[#d92334] active:scale-[0.98] disabled:opacity-50"><MinusIcon className="size-4" weight="bold" />Remove stock</button>
                  </div>
                  <p className="mt-3 rounded-xl bg-[#f8f7f4] p-3 text-[11px] leading-5 text-[#77736f]">This records a stock movement; it does not overwrite the current balance. The backend rejects invalid or excessive reductions.</p>
                </section>

                <section className={cardClass}>
                  <h4 className="text-sm font-bold text-[#242220]">Set exact stock quantity</h4>
                  <p className="mt-1 text-xs leading-5 text-[#77736f]">Enter the physical count from your shelf. Only the difference is recorded as an audited movement.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-semibold text-[#514d48]">Actual counted quantity<input type="number" min="0" step="1" inputMode="numeric" value={stockDraft.targetQuantity ?? ""} onChange={(event) => setDraft({ targetQuantity: event.target.value })} placeholder={`Current: ${product.quantity}`} className={inputClass} /></label>
                    <label className="space-y-1.5 text-xs font-semibold text-[#514d48]">Count reason <span className="text-[#d92334]">*</span><input value={stockDraft.targetReason ?? ""} onChange={(event) => setDraft({ targetReason: event.target.value })} placeholder="Physical stock count, reconciliation…" className={inputClass} /></label>
                  </div>
                  <button type="button" disabled={movement.isPending || stockDraft.targetQuantity === "" || stockDraft.targetQuantity == null || !Number.isInteger(Number(stockDraft.targetQuantity)) || Number(stockDraft.targetQuantity) < 0 || !String(stockDraft.targetReason || "").trim() || Number(stockDraft.targetQuantity) === Number(product.quantity)} onClick={() => {
                    const target = Number(stockDraft.targetQuantity);
                    const current = Number(product.quantity);
                    const delta = target - current;
                    if (!Number.isInteger(target) || target < 0) { toast.error("Enter a valid whole-number stock count"); return; }
                    if (!String(stockDraft.targetReason || "").trim()) { toast.error("Enter a reason for the stock count"); return; }
                    if (delta === 0) { toast.info("Count matches the current stock"); return; }
                    movement.mutate({ id: product.id, payload: { locationId: assignment.locationId, movementType: delta > 0 ? "ADD_STOCK" : "REDUCE_STOCK", quantity: Math.abs(delta), reason: `Stock reconciliation: ${String(stockDraft.targetReason).trim()} (counted ${target}; previous ${current})` } });
                  }} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e5e2dd] bg-white text-sm font-bold text-[#242220] transition hover:border-[#ff2438]/40 hover:text-[#d92334] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40">{movement.isPending ? "Saving stock count…" : "Save counted quantity"}</button>
                </section>

                <section className={cardClass}>
                  <h4 className="text-sm font-bold text-[#242220]">Low-stock alert</h4>
                  <p className="mt-1 text-xs leading-5 text-[#77736f]">Set the quantity at which this location should be flagged for replenishment.</p>
                  <div className="mt-3 flex items-end gap-3">
                    <label className="flex-1 space-y-1.5 text-xs font-semibold text-[#514d48]">Alert threshold (units)<input type="number" min="0" step="1" inputMode="numeric" value={stockDraft.threshold ?? String(assignment.lowStockThreshold ?? product.threshold ?? 5)} onChange={(event) => setDraft({ threshold: event.target.value })} className={inputClass} /></label>
                    <button type="button" disabled={update.isPending || !Number.isInteger(Number(stockDraft.threshold ?? assignment.lowStockThreshold ?? product.threshold)) || Number(stockDraft.threshold ?? assignment.lowStockThreshold ?? product.threshold) < 0} onClick={() => update.mutate({ id: product.id, locationId: assignment.locationId, payload: { locationId: assignment.locationId, visible: assignment.visible, available: assignment.available, lowStockThreshold: Number(stockDraft.threshold ?? assignment.lowStockThreshold ?? product.threshold) } })} className="h-11 shrink-0 rounded-xl border border-[#e5e2dd] bg-white px-4 text-sm font-bold text-[#514d48] transition hover:border-[#ff2438]/40 hover:text-[#d92334] disabled:opacity-50">{update.isPending ? "Saving…" : "Save alert"}</button>
                  </div>
                </section>

                <section className={`${cardClass} flex items-center justify-between gap-3`}>
                  <div><p className="text-sm font-bold text-[#242220]">Visible in this location</p><p className="mt-0.5 text-xs text-[#77736f]">Controls MRP product visibility for this location.</p></div>
                  <button type="button" disabled={update.isPending} aria-pressed={Boolean(assignment.visible)} onClick={() => update.mutate({ id: product.id, locationId: assignment.locationId, payload: { locationId: assignment.locationId, visible: !assignment.visible, available: assignment.available, lowStockThreshold: assignment.lowStockThreshold } })} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${assignment.visible ? "bg-[#ff2438] shadow-inner shadow-black/10" : "bg-[#d6d3cf]"}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow-md transition-all duration-300 ${assignment.visible ? "left-6" : "left-1"}`} /></button>
                </section>
              </>}
            </>}

            {activePanel === "details" && <>
              <section className={cardClass}>
                <h3 className="text-sm font-bold text-[#242220]">Product actions</h3>
                <p className="mt-1 text-xs text-[#77736f]">Manage product details and imagery.</p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button type="button" onClick={onEdit} className="group flex items-center gap-3 rounded-2xl border border-[#e5e2dd] bg-[#fcfbfa] p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#ff2438]/40 hover:shadow-md">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl text-[#d92334]" style={{ background: "#fff0ed" }}><PencilSimpleIcon className="size-4" /></span>
                    <span className="text-sm font-bold text-[#242220]">Edit details</span>
                  </button>
                  <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e5e2dd] bg-[#fcfbfa] p-3.5 text-left transition hover:-translate-y-0.5 hover:border-[#ff2438]/40 hover:shadow-md">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl text-[#d92334]" style={{ background: "#fff0ed" }}><ImageIcon className="size-4" /></span>
                    <span className="text-sm font-bold text-[#242220]">Replace image</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const fileValue = event.target.files?.[0]; if (fileValue) onReplace(fileValue); }} />
                  </label>
                  <button type="button" onClick={onAiImage} className="flex items-center gap-3 rounded-2xl border border-[#f3dcdf] bg-[#fff7f7] p-3.5 text-left text-[#242220] transition hover:-translate-y-0.5 hover:shadow-md">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fff0ed] text-[#d92334]"><SparkleIcon className="size-4" /></span>
                    <span className="text-sm font-bold">AI image studio</span>
                  </button>
                </div>
              </section>
              <section className={`${cardClass} flex items-center justify-between gap-3`}>
                <div><p className="text-sm font-bold text-[#242220]">MRP Product status</p><p className="mt-0.5 text-xs text-[#77736f]">{product.active ? "This product is enabled." : "This product is disabled."}</p></div>
                <button type="button" disabled={statusPending} onClick={onToggleStatus} className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:opacity-50 ${product.active ? "border border-[#e5e2dd] bg-white text-[#514d48] hover:border-[#ff2438]/40 hover:text-[#d92334]" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>{statusPending ? "Saving…" : product.active ? "Disable product" : "Enable product"}</button>
              </section>
            </>}
          </div>
          <DrawerFooter className="shrink-0 border-t border-[#ece8e2] bg-white px-4 py-3 sm:px-6"><DrawerClose asChild><button type="button" className="h-11 w-full rounded-xl border border-[#e5e2dd] px-4 text-sm font-bold text-[#514d48] transition hover:bg-[#f8f7f4]">Close</button></DrawerClose></DrawerFooter>
        </DrawerContent>
      </Drawer>
  );
}

function ProductCategoryImages({ locationId, categoryNames, onClose }) {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: ["mrp-product-category-options", locationId],
    queryFn: () => getMrpProductCategories(locationId),
    enabled: Boolean(locationId),
  });
  const [busyName, setBusyName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const categories = categoriesQuery.data || [];
  const categoryByName = new Map(categories.map((category) => [category.name.trim().toLowerCase(), category]));
  const displayNames = Array.from(new Set([...categoryNames, ...categories.map((category) => category.name)])).sort((a, b) => a.localeCompare(b));

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categoryByName.has(name.toLowerCase())) {
      toast.error("That category already exists");
      return;
    }
    setBusyName(name);
    try {
      await createMrpProductCategory({ name }, locationId);
      await queryClient.invalidateQueries({ queryKey: ["mrp-product-category-options", locationId] });
      setNewCategoryName("");
      toast.success(`${name} category added`);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to add category");
    } finally {
      setBusyName("");
    }
  };

  const saveImage = async (name, file) => {
    if (!file) return;
    setBusyName(name);
    try {
      let category = categoryByName.get(name.trim().toLowerCase());
      if (!category) category = await createMrpProductCategory({ name }, locationId);
      await uploadCategoryImage(category.id, file, locationId);
      await queryClient.invalidateQueries({ queryKey: ["mrp-product-category-options", locationId] });
      toast.success(`${name} image saved`);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to save category image");
    } finally {
      setBusyName("");
    }
  };

  const removeImage = async (name) => {
    const category = categoryByName.get(name.trim().toLowerCase());
    if (!category) return;
    setBusyName(name);
    try {
      await removeCategoryImage(category.id, locationId);
      await queryClient.invalidateQueries({ queryKey: ["mrp-product-category-options", locationId] });
      toast.success(`${name} image removed`);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to remove category image");
    } finally {
      setBusyName("");
    }
  };

  return (
      <div className="mrp-category-overlay fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="product-category-images-title" className="mrp-category-dialog flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#ece8e2] p-4">
            <div className="min-w-0">
              <h2 id="product-category-images-title" className="text-base font-bold text-[#242220]">Product category images</h2>
              <p className="mt-1 text-xs leading-5 text-[#77736f]">Upload an image for each category used by MRP products.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close category images" className="grid size-9 shrink-0 place-items-center rounded-full border border-[#e5e2dd] text-xl leading-none text-[#514d48]">×</button>
          </header>
          <form onSubmit={(event) => { event.preventDefault(); addCategory(); }} className="flex gap-2 border-b border-[#ece8e2] p-3 sm:p-4">
            <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="New category name" className="h-10 min-w-0 flex-1 rounded-lg border border-[#e5e2dd] px-3 text-sm outline-none focus:border-[#ff2438] focus:ring-2 focus:ring-[#ff2438]/10" />
            <button type="submit" disabled={!newCategoryName.trim() || Boolean(busyName)} className="mrp-btn-brand h-10 shrink-0 rounded-lg px-4 text-xs font-bold disabled:opacity-50">Add category</button>
          </form>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            {displayNames.length === 0 ? <p className="p-6 text-center text-sm text-[#77736f]">No product categories found.</p> :
                <div className="grid gap-2">
                  {displayNames.map((name) => {
                    const category = categoryByName.get(name.trim().toLowerCase());
                    const busy = busyName === name;
                    return (
                        <div key={name} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#e9e6e1] p-2.5">
                          {category?.imageUrl ? <img src={category.imageUrl} alt="" className="size-12 shrink-0 rounded-lg border border-[#eeeae5] object-cover" /> : <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#f8f7f4] text-[10px] text-[#99938c]">No image</div>}
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#393632]">{name}</span>
                          <label className={`shrink-0 cursor-pointer rounded-lg border border-[#e5e2dd] px-2.5 py-2 text-xs font-semibold text-[#514d48] hover:bg-[#f8f7f4] ${busy ? "pointer-events-none opacity-50" : ""}`}>
                            {busy ? "Saving…" : category?.imageUrl ? "Replace" : "Upload"}
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; saveImage(name, file); }} />
                          </label>
                          {category?.imageUrl && <button type="button" disabled={busy} onClick={() => removeImage(name)} className="shrink-0 px-1 text-xs font-semibold text-[#d92334] disabled:opacity-50">Remove</button>}
                        </div>
                    );
                  })}
                </div>}
          </div>
        </section>
      </div>
  );
}

function ProductThumb({ name, imageSource, size = "md" }) {
  const dimension = size === "lg" ? "size-[68px]" : "size-12";
  if (imageSource) {
    return <img src={imageSource} alt={name} loading="lazy" className={`${dimension} shrink-0 rounded-xl border border-[#ece8e2] bg-white object-contain p-1`} />;
  }
  return <div aria-hidden="true" className={`${dimension} grid shrink-0 place-items-center rounded-xl text-sm font-extrabold tracking-wide`} style={{ background: "linear-gradient(135deg,#fff4f1 0%,#ffd9d3 100%)", color: "#c81e2e" }}>{productInitials(name)}</div>;
}

function StockBadge({ stock }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${stock.className}`}><span className="size-1.5 rounded-full bg-current" />{stock.label}</span>;
}

function StatusToggle({ active, disabled, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={Boolean(active)}
            className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold transition disabled:opacity-50 ${active ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100" : "bg-[#f1efeb] text-[#77736f] ring-1 ring-[#e5e2dd] hover:bg-[#e9e6e1]"}`}>
      <span className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-[#b5afa8]"}`} />
      {active ? "Enabled" : "Disabled"}
    </button>
  );
}

function FilterPills({ value, onChange, options, ariaLabel, label }) {
  return (
    <div className="flex min-w-0 max-w-full items-center gap-2">
      {label && <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a19b93]">{label}</span>}
      <div role="group" aria-label={ariaLabel} className="flex min-w-0 max-w-full gap-0.5 overflow-x-auto rounded-xl p-1" style={{ background: "#f4f1ed" }}>
        {options.map(([optionValue, optionLabel]) => {
          const active = value === optionValue;
          return (
            <button key={optionValue} type="button" aria-pressed={active} onClick={() => onChange(optionValue)}
                    className="h-8 shrink-0 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition"
                    style={active
                      ? { background: "#ffffff", color: "#d92334", boxShadow: "0 1px 2px rgba(36,34,32,0.08), 0 0 0 1px #ece8e2" }
                      : { background: "transparent", color: "#6f6a65" }}>
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CatalogFilterSelect({ label, ariaLabel, value, onChange, options, className = "" }) {
  const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1] || options[0]?.[1];
  return (
      <div className={`min-w-0 ${className}`}>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
              aria-label={ariaLabel}
              className="h-10 w-full min-w-0 max-w-full rounded-xl border-[#ece8e2] bg-white px-3 text-sm outline-none transition focus:border-[#ff2438] focus:ring-4 focus:ring-[#ff2438]/10"
          >
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-[#a19b93]">{label}</span>
            <SelectValue>{selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-1rem)]">
            {options.map(([optionValue, optionLabel]) => (
                <SelectItem key={optionValue} value={optionValue} className="max-w-full whitespace-normal break-words">
                  {optionLabel}
                </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
  );
}

function LocationCombobox({ value, options, placeholder, onChange }) {
  const anchor = useComboboxAnchor();
  const items = options;
  const selected = items.find((location) => String(location.id) === String(value));
  const selectedLabel = selected?.name || selected?.title || "";

  return (
      <Combobox
          items={items.map((location) => location.name || location.title || `Location ${location.id}`)}
          value={selectedLabel}
          onValueChange={(label) => {
            const location = items.find((item) => (item.name || item.title || `Location ${item.id}`) === label);
            onChange(location ? String(location.id) : "");
          }}
      >
        <div ref={anchor} className="min-w-0">
          <ComboboxInput
              aria-label="Select location"
              placeholder={placeholder}
              className="h-10 w-full min-w-0 rounded-lg"
          />
        </div>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No matching locations.</ComboboxEmpty>
          <ComboboxList>
            {items.map((location) => {
              const label = location.name || location.title || `Location ${location.id}`;
              return <ComboboxItem key={location.id} value={label}>{label}</ComboboxItem>;
            })}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
  );
}

function CategoryCombobox({ value, options, onChange }) {
  const anchor = useComboboxAnchor();
  return (
      <Combobox
          items={options}
          value={value}
          onValueChange={onChange}
          onInputValueChange={onChange}
      >
        <div ref={anchor} className="min-w-0">
          <ComboboxInput
              aria-label="Product category"
              value={value}
              placeholder="Choose or type a new category"
              className="h-10 w-full rounded-lg"
              onChange={(event) => onChange(event.target.value)}
          />
        </div>
        <ComboboxContent anchor={anchor} className="max-w-[calc(100vw-1rem)]">
          <ComboboxEmpty>Type a new category or choose a suggestion.</ComboboxEmpty>
          <ComboboxList>
            {options.map((name) => <ComboboxItem key={name} value={name}>{name}</ComboboxItem>)}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
  );
}

function ProductAiStudio({ studio, setStudio, generating, approving, regenerating, discarding,
                           onGenerate, onApprove, onRegenerate, onDiscard }) {
  useEffect(() => () => {
    if (studio.preview?.startsWith("blob:")) URL.revokeObjectURL(studio.preview);
  }, [studio.preview]);
  const chooseSource = (event) => {
    const source = event.target.files?.[0];
    if (!source) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(source.type)) {
      toast.error("Choose a JPEG, PNG or WEBP image");
      return;
    }
    setStudio((current) => ({ ...current, source, preview: URL.createObjectURL(source), session: null }));
  };
  const session = studio.session;
  const working = generating || approving || regenerating || discarding;
  return <div className="fixed inset-x-0 top-14 bottom-0 z-30 flex items-end justify-center bg-[#1f1614]/40 backdrop-blur-sm p-0 sm:top-16 sm:items-center sm:p-2">
    <section className="flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] w-full min-w-0 max-w-3xl flex-col overflow-hidden rounded-none bg-white shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-5rem)] sm:rounded-3xl sm:p-6">
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#f1ede8] bg-white px-4 sm:h-12 sm:border-0 sm:px-0">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold">Create product image</h2>
          <p className="truncate text-xs text-[#77736f]">{studio.product.name} · {studio.product.brand || "No brand"} · {studio.product.variantIdentity}</p>
        </div>
        <button type="button" onClick={() => setStudio(null)} className="grid size-9 shrink-0 place-items-center rounded-full border border-[#ece8e2] text-xl leading-none hover:bg-[#f8f7f4]" aria-label="Close image studio">×</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-0">
        <button type="button" onClick={() => setStudio(null)} className="mb-3 rounded-full border border-[#ece8e2] px-3 py-2 text-sm font-semibold hover:bg-[#f8f7f4]">
          ← Back to catalog
        </button>
        <div className="mt-0 rounded-lg border border-[#ece8e2] border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 sm:mt-4">
          AI may alter package text, logos, prices, barcodes and regulatory marks. Review the result against the source before publishing.
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#ece8e2] p-3">
            <h3 className="font-semibold">Source reference</h3>
            {studio.preview ? <img src={studio.preview} alt="Source reference preview" className="mt-2 aspect-[4/3] w-full rounded-lg object-contain bg-[#f8f7f4] sm:aspect-square" /> :
                <div className="mt-2 flex aspect-[4/3] items-center justify-center rounded-lg bg-[#f8f7f4] text-center text-sm text-[#77736f] sm:aspect-square">Take a package photo or choose a file</div>}
            <label className="mt-3 block cursor-pointer rounded-lg border border-[#ece8e2] px-3 py-2 text-center text-sm font-semibold">
              {studio.source ? "Retake / replace source" : "Choose or take source photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={chooseSource} />
            </label>
            {studio.source && <button type="button" className="mt-2 w-full text-xs text-[#d92334]" onClick={() => setStudio((current) => ({ ...current, source: null, preview: null, session: null }))}>Remove source</button>}
          </div>
          <div className="rounded-xl border border-[#ece8e2] p-3">
            <h3 className="font-semibold">Generated preview</h3>
            {session?.generatedUrl ? <img src={session.generatedUrl} alt="Generated product preview" className="mt-2 aspect-[4/3] w-full rounded-lg object-contain bg-[#f8f7f4] sm:aspect-square" /> :
                <div className="mt-2 flex aspect-[4/3] items-center justify-center rounded-lg bg-[#f8f7f4] text-center text-sm text-[#77736f] sm:aspect-square">{generating ? "Generating…" : "Your unpublished preview appears here"}</div>}
            {session?.error && <p className="mt-2 text-sm text-[#d92334]">{session.error}</p>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {!session?.generatedUrl && <button type="button" disabled={!studio.source || working} onClick={onGenerate} className="rounded-lg mrp-btn-brand px-4 py-2 text-sm font-semibold disabled:opacity-50">{generating ? "Generating…" : "Generate preview"}</button>}
          {session?.generatedUrl && session.status === "GENERATED" && <>
            <button type="button" disabled={working} onClick={onDiscard} className="rounded-lg border border-[#ece8e2] px-4 py-2 text-sm disabled:opacity-50">{discarding ? "Discarding…" : "Discard"}</button>
            <button type="button" disabled={working} onClick={onRegenerate} className="rounded-lg border border-[#ece8e2] px-4 py-2 text-sm disabled:opacity-50">{regenerating ? "Regenerating…" : "Regenerate"}</button>
            <button type="button" disabled={working} onClick={onApprove} className="rounded-lg mrp-btn-brand px-4 py-2 text-sm font-semibold disabled:opacity-50">{approving ? "Approving…" : "Approve & publish"}</button>
          </>}
          {session?.status === "APPROVED" && <button type="button" onClick={() => setStudio(null)} className="rounded-lg mrp-btn-brand px-4 py-2 text-sm font-semibold">Done</button>}
        </div>
        <p className="mt-3 pb-2 text-xs text-[#77736f]">Source and generated assets are stored separately. Nothing is published until approval.</p>
      </div>
    </section>
  </div>;
}

