import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArchiveIcon, CheckCircleIcon, FunnelIcon, MagnifyingGlassIcon, PackageIcon, PlusIcon, SidebarIcon, WarningIcon } from "@phosphor-icons/react";
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
    setMobileFiltersOpen(false);
    setPage(0);
  };
  const hasFilters = search || stockFilter !== "all" || availabilityFilter !== "all" || categoryFilter !== "all" || sortBy !== "name";

  return (
      <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#f7f6f3] text-[#202124]">
        <div className="mx-auto min-w-0 max-w-[1680px] space-y-4 px-3 py-3 pb-24 sm:px-5 sm:py-5 sm:pb-6 lg:px-7 lg:py-6">
          <header className="flex min-w-0 flex-col gap-3 border-b border-[#e5e1db] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#fff0ed] text-[#e52b3a]">
                <PackageIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold tracking-tight text-[#242220] sm:text-2xl">MRP Product</h1>
                  <span className="rounded-full bg-[#ece9e4] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#77736f]">Workspace</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-[#77736f]">Manage products, categories, pricing and location inventory.</p>
              </div>
              <button type="button" onClick={toggleSidebar} aria-label="Open admin navigation" className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#e5e2dd] bg-white text-[#514d48] shadow-sm hover:border-[#f6a2aa] md:hidden">
                <SidebarIcon className="size-[17px]" />
              </button>
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 space-y-1 text-[11px] font-bold uppercase tracking-wide text-[#77736f] sm:min-w-[260px]">
                Location
                <LocationCombobox value={catalogLocationId || effectiveLocationId} options={availableLocations} placeholder="Choose a location"
                                  onChange={(locationId) => { setCatalogLocationId(locationId); setPage(0); setForm((current) => ({ ...current, locationId })); }} />
              </label>
              <button type="button" onClick={() => setCategoryImagesOpen(true)} disabled={!effectiveLocationId} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e5e2dd] bg-white px-4 text-sm font-semibold text-[#514d48] shadow-sm transition hover:border-[#d7cfc5] hover:bg-[#fffaf7] disabled:cursor-not-allowed disabled:opacity-45">
                Manage categories
              </button>
              <button type="button" onClick={openCreateForm} disabled={!effectiveLocationId} style={{ backgroundColor: "#ff2438", color: "#ffffff" }} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2438] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45">
                <PlusIcon weight="bold" className="size-4" /> Add product
              </button>
            </div>
          </header>

          {!effectiveLocationId && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <WarningIcon className="mt-0.5 size-5 shrink-0" />
            <div><p className="font-semibold">Select a location to manage inventory</p><p className="mt-1 text-amber-800">Choose a location above to view stock levels and make location-specific changes.</p></div>
          </div>}

          {effectiveLocationId && <section aria-label="Inventory summary" className="mrp-product-kpi-grid grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Total products", value: overview?.total, icon: <PackageIcon className="size-4" />, tone: "text-slate-700", iconBg: "bg-slate-100" },
              { label: "Available", value: overview?.available, icon: <CheckCircleIcon className="size-4" />, tone: "text-emerald-700", iconBg: "bg-emerald-50" },
              { label: "Low stock", value: overview?.low, icon: <WarningIcon className="size-4" />, tone: "text-amber-700", iconBg: "bg-amber-50" },
              { label: "Out of stock", value: overview?.out, icon: <ArchiveIcon className="size-4" />, tone: "text-red-700", iconBg: "bg-red-50" },
              { label: "Avg. profit margin", value: summaryQuery.data?.averageProfitMarginPercent == null ? null : `${Number(summaryQuery.data.averageProfitMarginPercent).toFixed(2)}%`, icon: <CheckCircleIcon className="size-4" />, tone: "text-blue-700", iconBg: "bg-blue-50" },
            ].map((item) => <div key={item.label} className={`mrp-product-kpi-card flex min-h-[68px] min-w-0 items-center gap-2 rounded-xl border border-[#e9e6e1] bg-white px-2.5 py-2 shadow-sm ${item.className || ""}`}>
              <div className={`grid size-7 shrink-0 place-items-center rounded-lg ${item.iconBg} ${item.tone}`}>{item.icon}</div>
              <div className="min-w-0"><p className="truncate text-xs font-medium text-[#77736f] sm:text-sm">{item.label}</p>
                <p className="mt-0.5 text-lg font-bold tracking-tight sm:text-xl">{summaryQuery.isLoading ? <span className="inline-block h-5 w-8 animate-pulse rounded bg-slate-100" /> : (item.value ?? "—")}</p>
              </div>
            </div>)}
          </section>}

          <section className="overflow-hidden rounded-2xl border border-[#e9e6e1] bg-white shadow-sm">
            <div className="border-b border-[#efede9] p-3 sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <label className="relative block min-w-0 flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#85817c]" />
                  <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }}
                         placeholder="Search product, brand or pack size" aria-label="Search MRP products"
                         className="h-11 w-full rounded-xl border border-[#e5e2dd] bg-[#fcfbfa] pl-9 pr-3 text-sm outline-none transition placeholder:text-[#9b9792] focus:border-[#ff2438] focus:bg-white focus:ring-2 focus:ring-[#ff2438]/10" />
                </label>
                <div className="hidden grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:shrink-0">
                  <CatalogFilterSelect label="Stock" ariaLabel="Filter by stock" value={stockFilter} onChange={(value) => { setStockFilter(value); setPage(0); }} options={[["all", "All stock"], ["in", "In stock"], ["low", "Low stock"], ["out", "Out of stock"]]} className="lg:w-[150px]" />
                  <CatalogFilterSelect label="Availability" ariaLabel="Filter by availability" value={availabilityFilter} onChange={(value) => { setAvailabilityFilter(value); setPage(0); }} options={[["all", "All status"], ["enabled", "Enabled"], ["disabled", "Disabled"]]} className="lg:w-[150px]" />
                  <CatalogFilterSelect label="Sort by" ariaLabel="Sort products" value={sortBy} onChange={(value) => { setSortBy(value); setPage(0); }} options={[["name", "Name: A-Z"], ["mrp", "MRP: low to high"], ["stock", "Stock: low to high"], ["updated", "Recently updated"]]} className="col-span-2 lg:w-[170px] sm:col-span-1" />
                </div>
                <div className="mt-2 flex min-w-0 gap-2 overflow-hidden lg:hidden">
                  <button type="button" aria-expanded={mobileFiltersOpen} onClick={() => setMobileFiltersOpen((open) => !open)} className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold ${mobileFiltersOpen || stockFilter !== "all" || availabilityFilter !== "all" || categoryFilter !== "all" ? "border-[#ff2438] bg-[#fff0ed] text-[#d92335]" : "border-[#e5e2dd] bg-white text-[#514d48]"}`}>
                    <FunnelIcon className="size-4 shrink-0" /> Filters
                    {(stockFilter !== "all" || availabilityFilter !== "all" || categoryFilter !== "all") && <span className="grid size-5 place-items-center rounded-full bg-[#ff2438] text-[10px] text-white"> {[stockFilter !== "all", availabilityFilter !== "all", categoryFilter !== "all"].filter(Boolean).length} </span>}
                  </button>
                  <CatalogFilterSelect label="Sort by" ariaLabel="Sort products" value={sortBy} onChange={(value) => { setSortBy(value); setPage(0); }} options={[["name", "Name: A-Z"], ["mrp", "MRP: low to high"], ["stock", "Stock: low to high"], ["updated", "Recently updated"]]} className="flex-1" />
                </div>
                {mobileFiltersOpen && <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-[#eeeae5] bg-[#fcfbfa] p-2 lg:hidden">
                  <CatalogFilterSelect label="Stock" ariaLabel="Filter by stock" value={stockFilter} onChange={(value) => { setStockFilter(value); setPage(0); }} options={[["all", "All stock"], ["in", "In stock"], ["low", "Low stock"], ["out", "Out of stock"]]} />
                  <CatalogFilterSelect label="Availability" ariaLabel="Filter by availability" value={availabilityFilter} onChange={(value) => { setAvailabilityFilter(value); setPage(0); }} options={[["all", "All status"], ["enabled", "Enabled"], ["disabled", "Disabled"]]} />
                  <div className="col-span-2 flex items-center justify-between gap-2 border-t border-[#eeeae5] pt-2">
                    <button type="button" onClick={clearFilters} disabled={!hasFilters} className="text-xs font-bold text-[#d92335] disabled:opacity-40">Reset all</button>
                    <button type="button" onClick={() => setMobileFiltersOpen(false)} className="rounded-lg bg-[#292725] px-3 py-2 text-xs font-bold text-white">Apply filters</button>
                  </div>
                </div>}
              </div>
              {categoryOptionsQuery.isError && <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                <span>Categories could not be loaded.</span>
                <button type="button" onClick={() => categoryOptionsQuery.refetch()} className="font-semibold underline">Retry</button>
              </div>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[#77736f] sm:text-sm"><span className="font-semibold text-[#292725]">{products.length}</span>{query.data?.totalElements != null ? ` of ${query.data.totalElements}` : ""} products shown {hasFilters ? "after filtering" : "in MRP product"}</p>
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
                  {(search || stockFilter !== "all" || availabilityFilter !== "all" || categoryFilter !== "all" || sortBy !== "name") && <button type="button" onClick={clearFilters} className="text-xs font-semibold text-[#e52b3a] hover:underline">Clear filters</button>}
                </div>
              </div>
            </div>

            {query.isError && <div className="flex items-center justify-between gap-3 bg-red-50 px-4 py-3 text-sm text-red-700"><span>Unable to load MRP products.</span><button type="button" className="font-semibold underline" onClick={() => query.refetch()}>Retry</button></div>}
            {summaryQuery.isError && <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700"><span>Inventory summary is temporarily unavailable.</span><button type="button" className="font-semibold underline" onClick={() => summaryQuery.refetch()}>Retry</button></div>}
            {query.isLoading ? <div className="space-y-3 p-4">{[1, 2, 3, 4].map((item) => <div key={item} className="flex animate-pulse gap-3"><div className="size-12 rounded-lg bg-slate-100" /><div className="flex-1 space-y-2 py-1"><div className="h-3 w-1/3 rounded bg-slate-100" /><div className="h-3 w-1/2 rounded bg-slate-100" /></div></div>)}</div> : <>
              {/* Mobile product cards */}
              <div className="divide-y divide-[#efede9] md:hidden">
                {products.map((product) => {
                  const imageSource = productImageSource(product);
                  return <article key={product.id} className="p-3.5 transition hover:bg-[#fdfcfb] sm:p-4">
                  <div className="flex min-w-0 items-start gap-3">
                      {imageSource ? <img src={imageSource} alt={product.name} loading="lazy" className="size-[68px] shrink-0 rounded-xl border border-[#eeebe6] bg-white object-contain p-1.5" /> :
                          <div className="grid size-[68px] shrink-0 place-items-center rounded-xl border border-dashed border-[#ddd8d1] bg-[#f8f7f4] text-[#a19b93]"><PackageIcon className="size-6" /></div>}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><h2 className="break-words text-sm font-semibold leading-5 text-[#242220]">{product.name}</h2><p className="mt-0.5 truncate text-xs text-[#858079]">{product.brand || "No brand"}{product.variantIdentity && product.variantIdentity !== "DEFAULT" ? ` · ${product.variantIdentity}` : ""}</p></div>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${product.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{product.active ? "Enabled" : "Disabled"}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl border border-[#efede9] bg-[#fcfbfa] p-2.5 text-[11px]">
                          <div className="min-w-0"><p className="truncate text-[#858079]">MRP</p><p className="mt-0.5 truncate font-bold text-[#242220]">{formatMoney(product.mrp)}</p></div>
                          <div className="min-w-0 border-l border-[#e9e6e1] pl-2"><p className="truncate text-[#858079]">Cost</p><p className="mt-0.5 truncate font-semibold text-[#514d48]">{formatMoney(product.costPrice)}</p></div>
                          <div className="min-w-0 border-l border-[#e9e6e1] pl-2"><p className="truncate text-[#858079]">Margin</p><p className="mt-0.5 truncate font-bold text-blue-700">{product.profitMarginPercent == null ? "—" : `${product.profitMarginPercent}%`}</p></div>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2"><span className="truncate text-xs font-semibold text-[#393632]">{stockLabel(product.quantity)}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${product.stock.className}`}>{product.stock.label}</span></div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => openEditForm(product)} className="h-10 rounded-lg border border-[#e5e2dd] bg-white px-3 text-xs font-semibold text-[#514d48] hover:bg-[#f8f7f4]">Edit</button>
                          <button type="button" onClick={() => setSelectedProductId(product.id)} style={{ backgroundColor: "#ff2438", color: "#ffffff" }} className="h-10 rounded-lg px-3 text-xs font-semibold hover:brightness-95">Manage</button>
                        </div>
                      </div>
                    </div>
                  </article>;
                })}
              </div>

              {/* Desktop / tablet table */}
              <div className="relative hidden overflow-x-auto md:block">
                <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent" />
                <table className="w-full min-w-[1020px] text-left text-sm">
                  <thead className="border-b border-[#e9e6e1] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#77736f]"><tr>
                    <th scope="col" className="sticky left-0 z-10 bg-[#faf9f7] px-4 py-3">Product</th><th scope="col" className="px-3 py-3">Category</th><th scope="col" className="px-3 py-3 text-right">MRP</th><th scope="col" className="px-3 py-3 text-right">Cost price</th><th scope="col" className="px-3 py-3 text-right">Profit margin</th><th scope="col" className="px-3 py-3">Location stock</th><th scope="col" className="px-3 py-3">Status</th><th scope="col" className="sticky right-0 z-10 bg-[#faf9f7] px-4 py-3 text-right">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#efede9]">
                  {products.map((product) => {
                    const imageSource = productImageSource(product);
                    return <tr key={product.id} className="transition hover:bg-[#fdfcfb]">
                      <td className="sticky left-0 z-[1] bg-white px-4 py-3"><div className="flex min-w-0 items-center gap-3">
                        {imageSource ? <img src={imageSource} alt={product.name} loading="lazy" className="size-12 shrink-0 rounded-xl border border-[#eeebe6] bg-white object-contain p-1" /> : <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-dashed border-[#ddd8d1] bg-[#f8f7f4] text-[#a19b93]"><PackageIcon className="size-5" /></div>}
                        <div className="min-w-0"><p className="max-w-[260px] truncate font-semibold text-[#242220]">{product.name}</p><p className="mt-0.5 max-w-[260px] truncate text-xs text-[#858079]">{product.brand || "No brand"} · {product.variantIdentity && product.variantIdentity !== "DEFAULT" ? product.variantIdentity : "Default pack"}</p></div>
                      </div></td>
                      <td className="px-3 py-3 text-[#77736f]">{product.categoryName || "Uncategorized"}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatMoney(product.mrp)}</td><td className="px-3 py-3 text-right tabular-nums text-[#77736f]">{formatMoney(product.costPrice)}</td><td className="px-3 py-3 text-right font-semibold tabular-nums text-blue-700">{product.profitMarginPercent == null ? "—" : `${product.profitMarginPercent}%`}</td>
                      <td className="px-3 py-3"><div className="flex flex-col items-start gap-1"><span className="font-semibold tabular-nums">{stockLabel(product.quantity)}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${product.stock.className}`}>{product.stock.label}</span></div></td>
                      <td className="px-3 py-3"><button type="button" onClick={() => status.mutate({ id: product.id, active: !product.active })} disabled={status.isPending} className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${product.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{product.active ? "Enabled" : "Disabled"}</button></td>
                      <td className="sticky right-0 z-[1] bg-white px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEditForm(product)} className="rounded-lg border border-[#e5e2dd] px-3 py-2 text-xs font-semibold text-[#55504a] hover:bg-white">Edit</button><button type="button" onClick={() => setSelectedProductId(product.id)} className="rounded-lg bg-[#ff2438] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e91e32]">Manage</button></div></td>
                    </tr>;
                  })}
                  </tbody>
                </table>
              </div>
              {!products.length && <div className="px-4 py-10 text-center sm:py-14">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff0ed] text-[#e52b3a]"><PackageIcon className="size-6" /></div>
                <h3 className="mt-3 text-base font-bold text-[#242220]">No products in this view</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#858079]">{categoryFilter !== "all" ? `There are no products in ${categoryFilter} for this location.` : "Try changing your search or filters, or add the first MRP product."}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {hasFilters && <button type="button" onClick={clearFilters} className="h-9 rounded-lg border border-[#e5e2dd] bg-white px-3 text-xs font-semibold text-[#514d48]">Clear filters</button>}
                  <button type="button" onClick={openCreateForm} disabled={!effectiveLocationId} className="h-9 rounded-lg bg-[#ff2438] px-3 text-xs font-semibold text-white disabled:opacity-50">Add product</button>
                </div>
              </div>}
            </>}
            <footer className="flex flex-col gap-3 border-t border-[#efede9] bg-[#fdfcfb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#77736f]">Page {page + 1}{query.data?.totalPages ? ` of ${query.data.totalPages}` : ""}</p>
              <div className="flex gap-2"><button type="button" disabled={page === 0 || query.isLoading} onClick={() => setPage((value) => Math.max(0, value - 1))} className="h-9 flex-1 rounded-lg border border-[#e5e2dd] bg-white px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none">Previous</button><button type="button" disabled={!query.data || query.data.last || query.isLoading} onClick={() => setPage((value) => value + 1)} className="h-9 flex-1 rounded-lg border border-[#e5e2dd] bg-white px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none">Next</button></div>
            </footer>
          </section>
          {categoryImagesOpen && <ProductCategoryImages
            locationId={effectiveLocationId}
            categoryNames={categoryNames}
            onClose={() => setCategoryImagesOpen(false)}
          />}
        </div>

        {/* Persistent mobile action: creation remains discoverable while browsing MRP products. */}
        {formOpen && <div className="fixed inset-0 z-50 flex min-h-0 items-start justify-center overflow-y-auto bg-[#171513]/45 py-2 backdrop-blur-[2px] sm:items-center sm:overflow-hidden sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setFormOpen(false); setEditingId(null); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="catalog-form-title" className="flex h-[calc(100svh-1rem)] max-h-none w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e9e6e1] bg-white shadow-2xl sm:h-auto sm:max-h-[94dvh] sm:max-w-2xl">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#efede9] bg-white px-4 py-4 sm:px-6"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e52b3a]">MRP Product</p><h2 id="catalog-form-title" className="mt-1 text-lg font-bold">{editingId ? "Edit product" : "Add new product"}</h2><p className="mt-1 text-xs text-[#77736f]">Enter product information and pricing details.</p></div><button type="button" aria-label="Close product form" onClick={() => { setFormOpen(false); setEditingId(null); }} className="grid size-9 shrink-0 place-items-center rounded-full border border-[#e5e2dd] text-xl text-[#77736f] hover:bg-[#f8f7f4]">×</button></header>
            <form className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleFormSubmit}>
              <div className="h-0 min-h-0 flex-1 space-y-5 overflow-y-scroll overscroll-contain p-4 sm:p-6">
              <section><h3 className="text-sm font-semibold">Product information</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[['name','Product name','text'],['brand','Brand','text'],['variantIdentity','Variant / pack size','text']].map(([name,label,type]) => <label key={name} className="min-w-0 space-y-1.5 text-xs font-semibold text-[#514d48]">{label}{name === 'name' && <span className="text-[#e52b3a]"> *</span>}<input name={name} value={form[name]} placeholder={name === 'variantIdentity' ? 'e.g. 250 g, 1 L, pack of 6' : name === 'brand' ? 'Enter brand' : 'Enter product name'} onChange={setField} required={name === 'name'} type={type} className="h-11 w-full rounded-xl border border-[#e5e2dd] bg-[#fcfbfa] px-3 text-sm font-normal outline-none focus:border-[#ff2438] focus:bg-white focus:ring-2 focus:ring-[#ff2438]/10" /></label>)}
                <label className="min-w-0 space-y-1.5 text-xs font-semibold text-[#514d48]">
                  Category
                  <CategoryCombobox value={form.categoryName} options={categoryNames} onChange={(categoryName) => setForm((current) => ({ ...current, categoryName }))} />
                  <span className="block text-[11px] font-normal text-[#858079]">Select a suggestion or enter a new category name.</span>
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-[#514d48] sm:col-span-2">Description <textarea name="description" value={form.description} onChange={setField} rows={2} placeholder="Optional product description" className="w-full rounded-xl border border-[#e5e2dd] bg-[#fcfbfa] px-3 py-2 text-sm font-normal outline-none focus:border-[#ff2438] focus:bg-white focus:ring-2 focus:ring-[#ff2438]/10" /></label>
              </div></section>
              <section className="border-t border-[#efede9] pt-4"><h3 className="text-sm font-semibold">Product image</h3><p className="mt-1 text-xs text-[#77736f]">{editingId ? "Upload a new image to replace the current product image." : "Add a JPEG, PNG or WEBP image for this product."}</p><label className="mt-3 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-[#d9d4cd] bg-[#fcfbfa] px-3 py-2 text-sm font-semibold text-[#514d48] hover:border-[#ff2438] hover:bg-white"><span className="min-w-0 truncate">{imageFile ? imageFile.name : "Choose product image"}</span><span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-sm">Browse</span><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) setImageFile(selected); }} /></label></section>
              <section className="border-t border-[#efede9] pt-4"><h3 className="text-sm font-semibold">Pricing</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{[['mrp','MRP (₹)'],['costPrice','Cost price (₹)']].map(([name,label]) => <label key={name} className="space-y-1.5 text-xs font-semibold text-[#514d48]">{label} <span className="text-[#e52b3a]">*</span><div className="flex h-11 items-center rounded-xl border border-[#e5e2dd] bg-[#fcfbfa] focus-within:border-[#ff2438] focus-within:ring-2 focus-within:ring-[#ff2438]/10"><span className="pl-3 text-sm text-[#858079]">₹</span><input name={name} value={form[name]} onChange={setField} required type="number" min="0" step="0.01" className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-normal outline-none" placeholder="0.00" /></div></label>)}</div></section>
              {editingId && <section className="border-t border-[#efede9] pt-4"><h3 className="text-sm font-semibold">Location inventory</h3><p className="mt-1 text-xs text-[#77736f]">Set the current stock quantity for the selected location. The change is recorded as an audited adjustment.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-semibold text-[#514d48]">Stock quantity<input name="stockQuantity" value={form.stockQuantity} onChange={setField} type="number" min="0" step="1" required className="h-11 w-full rounded-xl border border-[#e5e2dd] bg-[#fcfbfa] px-3 text-sm font-normal outline-none focus:border-[#ff2438] focus:bg-white focus:ring-2 focus:ring-[#ff2438]/10" /></label><label className="space-y-1.5 text-xs font-semibold text-[#514d48]">Low-stock threshold<input name="lowStockThreshold" value={form.lowStockThreshold} onChange={setField} type="number" min="0" step="1" className="h-11 w-full rounded-xl border border-[#e5e2dd] bg-[#fcfbfa] px-3 text-sm font-normal outline-none focus:border-[#ff2438] focus:bg-white focus:ring-2 focus:ring-[#ff2438]/10" /></label></div></section>}
              {!editingId && <section className="border-t border-[#efede9] pt-4"><h3 className="text-sm font-semibold">Initial location inventory</h3><p className="mt-1 text-xs text-[#77736f]">Stock is created only for the selected location.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-semibold text-[#514d48]">Opening stock<input name="initialStock" value={form.initialStock} onChange={setField} type="number" min="0" step="1" disabled={!effectiveLocationId} className="h-11 w-full rounded-xl border border-[#e5e2dd] bg-[#fcfbfa] px-3 text-sm font-normal outline-none focus:border-[#ff2438] disabled:opacity-50" /></label><label className="space-y-1.5 text-xs font-semibold text-[#514d48]">Low-stock threshold<input name="lowStockThreshold" value={form.lowStockThreshold} onChange={setField} type="number" min="0" step="1" className="h-11 w-full rounded-xl border border-[#e5e2dd] bg-[#fcfbfa] px-3 text-sm font-normal outline-none focus:border-[#ff2438]" /></label></div></section>}
              </div>
              <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#efede9] bg-white px-4 py-3 shadow-[0_-8px_20px_rgba(32,33,36,0.06)] sm:flex-row sm:justify-end sm:px-6"><button type="button" onClick={() => { setFormOpen(false); setEditingId(null); }} className="h-11 rounded-xl border border-[#e5e2dd] px-5 text-sm font-semibold text-[#514d48]">Cancel</button>{editingId && editingProduct && <button type="button" onClick={() => { setFormOpen(false); setAiStudio({ product: editingProduct, source: null, preview: null, session: null }); }} className="h-11 rounded-xl bg-[#fff0ed] px-5 text-sm font-semibold text-[#d92334] hover:bg-[#ffe5e0]">AI image studio</button>}<button type="submit" disabled={create.isPending || edit.isPending} style={{ backgroundColor: "#ff2438", color: "#ffffff" }} className="inline-flex h-11 min-w-[140px] items-center justify-center whitespace-nowrap rounded-xl px-5 text-sm font-semibold shadow-sm hover:bg-[#e91e32] disabled:cursor-not-allowed disabled:opacity-50">{create.isPending || edit.isPending ? "Saving…" : editingId ? "Save changes" : "Create product"}</button></footer>
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
  return (
      <Drawer open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DrawerContent className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-none border-[#e9e6e1] bg-[#f8f7f4] sm:ml-auto sm:max-w-[560px]">
          <DrawerHeader className="sticky top-0 z-10 shrink-0 border-b border-[#ece8e2] bg-white px-4 py-3 text-left sm:px-6 sm:py-4">
            <div className="flex items-start gap-3">
              {imageSource ? <img src={imageSource} alt={product.name} className="size-[68px] shrink-0 rounded-xl border border-[#ece8e2] bg-white object-contain p-1.5" /> : <div className="grid size-[68px] shrink-0 place-items-center rounded-xl border border-dashed border-[#ddd8d1] bg-[#f8f7f4] text-[#a19b93]"><PackageIcon className="size-6" /></div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><DrawerTitle className="min-w-0 text-base font-bold leading-5 text-[#242220]">{product.name}</DrawerTitle><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${product.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{product.active ? "Enabled" : "Disabled"}</span></div>
                <DrawerDescription className="mt-1 text-xs leading-5 text-[#77736f]">{product.brand || "No brand"} · {product.categoryName || "Uncategorized"} · {product.variantIdentity && product.variantIdentity !== "DEFAULT" ? product.variantIdentity : "Default pack"}</DrawerDescription>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3"><span className="text-sm font-bold text-[#242220]">MRP ₹{product.mrp}</span><span className="text-xs text-[#77736f]">Cost ₹{product.costPrice}</span></div>
              </div>
              <DrawerClose asChild><button type="button" aria-label="Close manage product" className="grid size-9 shrink-0 place-items-center rounded-full border border-[#e5e2dd] text-xl leading-none text-[#514d48] hover:bg-[#f8f7f4]">×</button></DrawerClose>
            </div>
          </DrawerHeader>

          <div className="sticky top-0 z-[1] grid shrink-0 grid-cols-2 gap-1 border-b border-[#e9e6e1] bg-white p-2 sm:px-5">
            {[
              ["inventory", "Inventory", "Stock, movements and alerts"],
              ["details", "Product details", "Pricing, image and status"],
            ].map(([panel, label, description]) => (
              <button key={panel} type="button" onClick={() => setActivePanel(panel)} className={`rounded-xl px-3 py-2 text-left transition ${activePanel === panel ? "bg-[#fff0ed] text-[#d92334] shadow-sm" : "text-[#77736f] hover:bg-[#f8f7f4]"}`}>
                <span className="block text-xs font-bold">{label}</span><span className="mt-0.5 block text-[10px] leading-4">{description}</span>
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-5">
            {activePanel === "inventory" && <>
            <section className="rounded-xl border border-[#e9e6e1] bg-white p-4">
              <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-[#292725]">Location inventory</h3><p className="mt-1 text-xs text-[#77736f]">{assignment?.locationName || "Selected location"}</p></div>{assignment && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${productStock.className}`}>{stockLabel(product.quantity)} · {productStock.label}</span>}</div>
              {assignment ? <>
                <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#e9e6e1] bg-[#fbfaf8] p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#77736f]">Current stock</p><p className="mt-1 text-2xl font-bold tabular-nums text-[#242220]">{product.quantity == null ? "—" : product.quantity}<span className="ml-1 text-xs font-medium text-[#77736f]">{product.quantity == null ? "not configured" : "units"}</span></p><p className="mt-1 text-[11px] text-[#77736f]">Quantity currently recorded for this location</p></div><div className="rounded-xl border border-[#e9e6e1] bg-[#fbfaf8] p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#77736f]">Stock status</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${productStock.className}`}>{productStock.label}</span><p className="mt-2 text-[11px] text-[#77736f]">Alert at {assignment.lowStockThreshold ?? product.threshold} units</p></div></div>
                <div className="mt-4 rounded-xl border border-[#e9e6e1] p-3 sm:p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-bold text-[#292725]">Stock adjustment</h4><p className="mt-1 text-xs leading-5 text-[#77736f]">Record stock received or stock removed. Each movement needs a reason.</p></div><span className="rounded-lg bg-[#fff0ed] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#d92334]">Audited movement</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-semibold text-[#514d48]">Quantity to move<input type="number" min="1" step="1" inputMode="numeric" value={stockDraft.quantity || ""} onChange={(event) => setDraft({ quantity: event.target.value })} placeholder="e.g. 24" className="h-11 w-full rounded-lg border border-[#e5e2dd] bg-white px-3 text-sm font-normal outline-none focus:border-[#ff2438] focus:ring-2 focus:ring-[#ff2438]/10" /></label><label className="space-y-1.5 text-xs font-semibold text-[#514d48]">Reason <span className="text-[#d92334]">*</span><input value={stockDraft.reason || ""} onChange={(event) => setDraft({ reason: event.target.value })} placeholder="Purchase receipt, damaged goods…" className="h-11 w-full rounded-lg border border-[#e5e2dd] bg-white px-3 text-sm font-normal outline-none focus:border-[#ff2438] focus:ring-2 focus:ring-[#ff2438]/10" /></label></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={movement.isPending} onClick={() => submitMovement("ADD_STOCK")} style={{ backgroundColor: "#ff2438", color: "#ffffff" }} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold shadow-sm hover:brightness-95 disabled:opacity-50">{movement.isPending ? "Saving…" : "+ Receive stock"}</button><button type="button" disabled={movement.isPending} onClick={() => submitMovement("REDUCE_STOCK")} style={{ color: "#514d48" }} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e5e2dd] bg-white px-3 text-sm font-bold hover:bg-[#f8f7f4] disabled:opacity-50">− Remove stock</button></div><p className="mt-3 rounded-lg bg-[#f8f7f4] p-2.5 text-[11px] leading-5 text-[#77736f]">This records a stock movement; it does not overwrite the current balance. The backend must reject invalid or excessive reductions.</p></div>
                <div className="mt-4 rounded-xl border border-[#e9e6e1] bg-white p-3 sm:p-4">
                  <h4 className="text-sm font-bold text-[#292725]">Set exact stock quantity</h4>
                  <p className="mt-1 text-xs leading-5 text-[#77736f]">Enter the physical count from your shelf. The app records only the difference as an audited stock movement.</p>
                  <label className="mt-3 block space-y-1.5 text-xs font-semibold text-[#514d48]">Actual counted quantity
                    <input type="number" min="0" step="1" inputMode="numeric" value={stockDraft.targetQuantity ?? ""} onChange={(event) => setDraft({ targetQuantity: event.target.value })} placeholder={`Current: ${product.quantity}`} className="h-11 w-full rounded-lg border border-[#e5e2dd] bg-white px-3 text-sm font-normal outline-none focus:border-[#ff2438] focus:ring-2 focus:ring-[#ff2438]/10" />
                  </label>
                  <label className="mt-3 block space-y-1.5 text-xs font-semibold text-[#514d48]">Count / adjustment reason <span className="text-[#d92334]">*</span>
                    <input value={stockDraft.targetReason ?? ""} onChange={(event) => setDraft({ targetReason: event.target.value })} placeholder="Physical stock count, reconciliation…" className="h-11 w-full rounded-lg border border-[#e5e2dd] bg-white px-3 text-sm font-normal outline-none focus:border-[#ff2438] focus:ring-2 focus:ring-[#ff2438]/10" />
                  </label>
                  <button type="button" disabled={movement.isPending || stockDraft.targetQuantity === "" || stockDraft.targetQuantity == null || !Number.isInteger(Number(stockDraft.targetQuantity)) || Number(stockDraft.targetQuantity) < 0 || !String(stockDraft.targetReason || "").trim() || Number(stockDraft.targetQuantity) === Number(product.quantity)} onClick={() => {
                    const target = Number(stockDraft.targetQuantity);
                    const current = Number(product.quantity);
                    const delta = target - current;
                    if (!Number.isInteger(target) || target < 0) { toast.error("Enter a valid whole-number stock count"); return; }
                    if (!String(stockDraft.targetReason || "").trim()) { toast.error("Enter a reason for the stock count"); return; }
                    if (delta === 0) { toast.info("Count matches the current stock"); return; }
                    movement.mutate({ id: product.id, payload: { locationId: assignment.locationId, movementType: delta > 0 ? "ADD_STOCK" : "REDUCE_STOCK", quantity: Math.abs(delta), reason: `Stock reconciliation: ${String(stockDraft.targetReason).trim()} (counted ${target}; previous ${current})` } });
                  }} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#292725] px-4 text-sm font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40">{movement.isPending ? "Saving stock count…" : "Save counted quantity"}</button>
                </div>
                <div className="mt-4 rounded-xl border border-[#e9e6e1] p-3 sm:p-4"><div><h4 className="text-sm font-bold text-[#292725]">Low-stock alert</h4><p className="mt-1 text-xs leading-5 text-[#77736f]">Set the quantity at which this location should be flagged for replenishment.</p></div><div className="mt-3 flex items-end gap-3"><label className="flex-1 space-y-1.5 text-xs font-semibold text-[#514d48]">Alert threshold (units)<input type="number" min="0" step="1" inputMode="numeric" value={stockDraft.threshold ?? String(assignment.lowStockThreshold ?? product.threshold ?? 5)} onChange={(event) => setDraft({ threshold: event.target.value })} className="h-11 w-full rounded-lg border border-[#e5e2dd] bg-white px-3 text-sm font-normal outline-none focus:border-[#ff2438] focus:ring-2 focus:ring-[#ff2438]/10" /></label><button type="button" disabled={update.isPending || !Number.isInteger(Number(stockDraft.threshold ?? assignment.lowStockThreshold ?? product.threshold)) || Number(stockDraft.threshold ?? assignment.lowStockThreshold ?? product.threshold) < 0} onClick={() => update.mutate({ id: product.id, locationId: assignment.locationId, payload: { locationId: assignment.locationId, visible: assignment.visible, available: assignment.available, lowStockThreshold: Number(stockDraft.threshold ?? assignment.lowStockThreshold ?? product.threshold) } })} className="h-11 shrink-0 rounded-lg border border-[#e5e2dd] bg-white px-4 text-sm font-bold text-[#514d48] hover:bg-[#f8f7f4] disabled:opacity-50">{update.isPending ? "Saving…" : "Save alert"}</button></div></div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#efede9] pt-4"><div><p className="text-sm font-semibold">Visible in this location</p><p className="mt-0.5 text-xs text-[#77736f]">Controls MRP product visibility for this location.</p></div><button type="button" disabled={update.isPending} aria-pressed={Boolean(assignment.visible)} onClick={() => update.mutate({ id: product.id, locationId: assignment.locationId, payload: { locationId: assignment.locationId, visible: !assignment.visible, available: assignment.available, lowStockThreshold: assignment.lowStockThreshold } })} className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${assignment.visible ? "bg-[#ff2438]" : "bg-[#d6d3cf]"}`}><span className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition ${assignment.visible ? "left-[22px]" : "left-0.5"}`} /></button></div>
              </> : <div className="mt-4 rounded-lg border border-dashed border-[#ddd8d1] bg-[#faf9f7] p-4"><p className="text-sm font-semibold">Not assigned to this location</p><p className="mt-1 text-xs leading-5 text-[#77736f]">This product has no inventory assignment for the selected location. Use the existing assignment workflow to make it available here.</p></div>}
            </section>
            </>}

            {activePanel === "details" && <section className="rounded-xl border border-[#e9e6e1] bg-white p-4">
              <h3 className="text-sm font-bold text-[#292725]">Product actions</h3><p className="mt-1 text-xs text-[#77736f]">Manage product details and imagery.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"><button type="button" onClick={onEdit} className="h-10 rounded-lg border border-[#e5e2dd] px-3 text-sm font-semibold text-[#514d48] hover:bg-[#f8f7f4]">Edit details</button><label className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-[#e5e2dd] px-3 text-sm font-semibold text-[#514d48] hover:bg-[#f8f7f4]">Replace image<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const fileValue = event.target.files?.[0]; if (fileValue) onReplace(fileValue); }} /></label><button type="button" onClick={onAiImage} className="h-10 rounded-lg bg-[#fff0ed] px-3 text-sm font-semibold text-[#d92334] hover:bg-[#ffe5e0]">AI image studio</button></div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#efede9] pt-3"><div><p className="text-sm font-semibold">MRP Product status</p><p className="mt-0.5 text-xs text-[#77736f]">{product.active ? "This product is enabled." : "This product is disabled."}</p></div><button type="button" disabled={statusPending} onClick={onToggleStatus} className="rounded-lg border border-[#e5e2dd] px-3 py-2 text-xs font-semibold text-[#514d48] disabled:opacity-50">{statusPending ? "Saving…" : product.active ? "Disable product" : "Enable product"}</button></div>
            </section>}
          </div>
          <DrawerFooter className="shrink-0 border-t border-[#ece8e2] bg-white px-4 py-3 sm:px-6"><DrawerClose asChild><button type="button" className="h-10 w-full rounded-xl border border-[#e5e2dd] px-4 text-sm font-semibold text-[#514d48] hover:bg-[#f8f7f4]">Close</button></DrawerClose></DrawerFooter>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="product-category-images-title" className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#ece8e2] p-4">
          <div className="min-w-0">
            <h2 id="product-category-images-title" className="text-base font-bold text-[#242220]">Product category images</h2>
            <p className="mt-1 text-xs leading-5 text-[#77736f]">Upload an image for each category used by MRP products.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close category images" className="grid size-9 shrink-0 place-items-center rounded-full border border-[#e5e2dd] text-xl leading-none text-[#514d48]">×</button>
        </header>
        <form onSubmit={(event) => { event.preventDefault(); addCategory(); }} className="flex gap-2 border-b border-[#ece8e2] p-3 sm:p-4">
          <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="New category name" className="h-10 min-w-0 flex-1 rounded-lg border border-[#e5e2dd] px-3 text-sm outline-none focus:border-[#ff2438] focus:ring-2 focus:ring-[#ff2438]/10" />
          <button type="submit" disabled={!newCategoryName.trim() || Boolean(busyName)} className="h-10 shrink-0 rounded-lg bg-[#ff2438] px-3 text-xs font-bold text-white disabled:opacity-50">Add category</button>
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

function CatalogFilterSelect({ label, ariaLabel, value, onChange, options, className = "" }) {
 const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1] || options[0]?.[1];
 return (
   <div className={`min-w-0 ${className}`}>
     <span className="mb-1 block px-0.5 text-[10px] font-bold uppercase tracking-wide text-[#77736f]">{label}</span>
     <Select value={value} onValueChange={onChange}>
       <SelectTrigger
         aria-label={ariaLabel}
         className="h-10 w-full min-w-0 max-w-full rounded-lg border-[#e5e2dd] bg-white px-2.5 text-sm outline-none focus:border-[#ff2438] focus:ring-2 focus:ring-[#ff2438]/10 sm:h-11 sm:rounded-xl sm:px-3"
       >
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
  return <div className="fixed inset-x-0 top-14 bottom-0 z-30 flex items-end justify-center bg-black/50 p-0 sm:top-16 sm:items-center sm:p-2">
    <section className="flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] w-full min-w-0 max-w-3xl flex-col overflow-hidden rounded-none bg-card shadow-xl sm:h-auto sm:max-h-[calc(100dvh-5rem)] sm:rounded-2xl sm:p-6">
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-4 sm:h-12 sm:border-0 sm:px-0">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold">Create product image</h2>
          <p className="truncate text-xs text-muted-foreground">{studio.product.name} · {studio.product.brand || "No brand"} · {studio.product.variantIdentity}</p>
        </div>
        <button type="button" onClick={() => setStudio(null)} className="grid size-9 shrink-0 place-items-center rounded-full border text-xl leading-none hover:bg-muted" aria-label="Close image studio">×</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-0">
        <button type="button" onClick={() => setStudio(null)} className="mb-3 rounded-full border px-3 py-2 text-sm font-semibold hover:bg-muted">
          ← Back to catalog
        </button>
        <div className="mt-0 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 sm:mt-4">
          AI may alter package text, logos, prices, barcodes and regulatory marks. Review the result against the source before publishing.
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border p-3">
            <h3 className="font-semibold">Source reference</h3>
            {studio.preview ? <img src={studio.preview} alt="Source reference preview" className="mt-2 aspect-[4/3] w-full rounded-lg object-contain bg-muted sm:aspect-square" /> :
                <div className="mt-2 flex aspect-[4/3] items-center justify-center rounded-lg bg-muted text-center text-sm text-muted-foreground sm:aspect-square">Take a package photo or choose a file</div>}
            <label className="mt-3 block cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold">
              {studio.source ? "Retake / replace source" : "Choose or take source photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={chooseSource} />
            </label>
            {studio.source && <button type="button" className="mt-2 w-full text-xs text-destructive" onClick={() => setStudio((current) => ({ ...current, source: null, preview: null, session: null }))}>Remove source</button>}
          </div>
          <div className="rounded-xl border p-3">
            <h3 className="font-semibold">Generated preview</h3>
            {session?.generatedUrl ? <img src={session.generatedUrl} alt="Generated product preview" className="mt-2 aspect-[4/3] w-full rounded-lg object-contain bg-muted sm:aspect-square" /> :
                <div className="mt-2 flex aspect-[4/3] items-center justify-center rounded-lg bg-muted text-center text-sm text-muted-foreground sm:aspect-square">{generating ? "Generating…" : "Your unpublished preview appears here"}</div>}
            {session?.error && <p className="mt-2 text-sm text-destructive">{session.error}</p>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {!session?.generatedUrl && <button type="button" disabled={!studio.source || working} onClick={onGenerate} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{generating ? "Generating…" : "Generate preview"}</button>}
          {session?.generatedUrl && session.status === "GENERATED" && <>
            <button type="button" disabled={working} onClick={onDiscard} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{discarding ? "Discarding…" : "Discard"}</button>
            <button type="button" disabled={working} onClick={onRegenerate} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">{regenerating ? "Regenerating…" : "Regenerate"}</button>
            <button type="button" disabled={working} onClick={onApprove} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{approving ? "Approving…" : "Approve & publish"}</button>
          </>}
          {session?.status === "APPROVED" && <button type="button" onClick={() => setStudio(null)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Done</button>}
        </div>
        <p className="mt-3 pb-2 text-xs text-muted-foreground">Source and generated assets are stored separately. Nothing is published until approval.</p>
      </div>
    </section>
  </div>;
}
