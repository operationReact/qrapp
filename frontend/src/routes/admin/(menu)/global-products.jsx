import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, SidebarIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocation } from "@/context/LocationContext";
import { useSidebar } from "@/components/ui/sidebar";
import { baseURL } from "@/services";
import {
  assignCatalogProduct,
  copyCatalogAssignments,
  getGlobalCatalogBrands,
  getGlobalCatalogProducts,
} from "@/services/mrp-product-service";
import { getMrpProductCategories } from "@/services/category-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_OPTIONS = [
  { value: "relevance", label: "Best match" },
  { value: "name", label: "Name (A–Z)" },
  { value: "brand", label: "Brand (A–Z)" },
  { value: "updated", label: "Recently updated" },
  { value: "newest", label: "Newest first" },
];
const SORTS = SORT_OPTIONS.map((option) => option.value);
const ANY = "any";
const VEG_OPTIONS = [
  { value: ANY, label: "All types" },
  { value: "veg", label: "Veg only" },
  { value: "nonveg", label: "Non-veg only" },
];
const IMAGE_OPTIONS = [
  { value: ANY, label: "Any image" },
  { value: "with", label: "With image" },
  { value: "without", label: "Without image" },
];
const LOCATION_OPTIONS = [
  { value: ANY, label: "All products" },
  { value: "in", label: "In this location" },
  { value: "out", label: "Not in this location" },
];
const EMPTY_FORM = { mrp: "", costPrice: "", categoryName: "" };

export const Route = createFileRoute("/admin/(menu)/global-products")({
  validateSearch: (search) => {
    const page = Number(search.page);
    return {
      q: typeof search.q === "string" && search.q ? search.q : undefined,
      brand: typeof search.brand === "string" && search.brand ? search.brand : undefined,
      veg: parseBool(search.veg),
      hasImage: parseBool(search.hasImage),
      inLocation: parseBool(search.inLocation),
      sort: SORTS.includes(search.sort) ? search.sort : undefined,
      from: Number.isInteger(Number(search.from)) && Number(search.from) > 0 ? Number(search.from) : undefined,
      view: search.view === "table" ? "table" : undefined,
      page: Number.isInteger(page) && page > 1 ? page : undefined,
    };
  },
  component: GlobalProductsPage,
});

function parseBool(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function triToParam(value, yesKey, noKey) {
  if (value === yesKey) return true;
  if (value === noKey) return false;
  return undefined;
}

function triFromParam(value, yesKey, noKey) {
  if (value === true) return yesKey;
  if (value === false) return noKey;
  return ANY;
}

function imageSource(imageUrl) {
  if (!imageUrl) return null;
  return imageUrl.startsWith("http") ? imageUrl : `${baseURL}${imageUrl}`;
}

function variantLabel(variant) {
  return variant && variant !== "DEFAULT" ? variant : null;
}

function locationLabel(location) {
  return location?.name || location?.title || (location ? `Location ${location.id}` : "");
}

function categoryNamesFrom(data) {
  return (Array.isArray(data) ? data : [])
    .map((category) => category.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

// Pricing is copied from the product's latest location; the category only if the target location has it.
function assignPayload(product, locationId, allowedCategories) {
  return {
    locationId: Number(locationId),
    mrp: Number(product.referenceMrp),
    costPrice: Number(product.referenceCostPrice ?? 0),
    categoryName: allowedCategories.includes(product.referenceCategoryName) ? product.referenceCategoryName : null,
    visible: true,
    available: true,
    lowStockThreshold: 5,
    initialStock: 0,
  };
}

function FilterSelect({ label, value, onChange, options, active = false }) {
  const current = options.find((option) => option.value === value);
  return (
    <div className={`gp-fsel${active ? " is-active" : ""}`}>
      <span className="gp-fsel-label">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="gp-filter">
          <SelectValue>{current?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function GlobalProductsPage() {
  const { availableLocations = [], activeLocationId } = useLocation();
  const { toggleSidebar } = useSidebar();
  const queryClient = useQueryClient();
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchInput, setSearchInput] = useState(filters.q ?? "");
  const [picked, setPicked] = useState(null);
  const [dialogLocationId, setDialogLocationId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(() => new Map());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLocationId, setBulkLocationId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTargetId, setCopyTargetId] = useState("");
  const [copyScope, setCopyScope] = useState("all");
  const [copyBusy, setCopyBusy] = useState(false);

  const view = filters.view === "table" ? "table" : "cards";
  const pageIndex = filters.page ? filters.page - 1 : 0;

  // The active location decides which products show as "already in this location".
  const activeId = activeLocationId ? String(activeLocationId) : "";
  const activeLocation = availableLocations.find((location) => String(location.id) === activeId);
  const dialogLocation = availableLocations.find((location) => String(location.id) === dialogLocationId);
  const bulkLocation = availableLocations.find((location) => String(location.id) === bulkLocationId);

  const updateSearch = (patch, { resetPage = true } = {}) => navigate({
    search: (previous) => ({ ...previous, ...(resetPage ? { page: undefined } : {}), ...patch }),
    replace: true,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== (filters.q ?? "")) updateSearch({ q: next || undefined });
    }, 250);
    return () => clearTimeout(timer);
    // Debounce only on typing; including the URL state here would reset the timer on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query = useQuery({
    queryKey: ["global-products", activeId, filters.q, filters.brand, filters.veg, filters.hasImage, filters.inLocation, filters.sort, filters.from, pageIndex],
    queryFn: () => getGlobalCatalogProducts(activeId, {
      search: filters.q,
      brand: filters.brand,
      veg: filters.veg,
      hasImage: filters.hasImage,
      inLocation: filters.inLocation,
      sort: filters.sort,
      sourceLocationId: filters.from,
      page: pageIndex,
    }),
    enabled: Boolean(activeId),
    placeholderData: (previous) => previous,
  });

  const brandsQuery = useQuery({
    queryKey: ["global-product-brands", activeId],
    queryFn: () => getGlobalCatalogBrands(activeId),
    enabled: Boolean(activeId),
  });

  const categoriesQuery = useQuery({
    queryKey: ["mrp-categories", dialogLocationId],
    queryFn: () => getMrpProductCategories(dialogLocationId),
    enabled: Boolean(picked && dialogLocationId),
  });
  const categoryNames = categoryNamesFrom(categoriesQuery.data);
  // A pre-filled category from another location only applies if this location has it too.
  const selectedCategory = categoryNames.includes(form.categoryName) ? form.categoryName : "";

  const bulkCategoriesQuery = useQuery({
    queryKey: ["mrp-categories", bulkLocationId],
    queryFn: () => getMrpProductCategories(bulkLocationId),
    enabled: Boolean(bulkOpen && bulkLocationId),
  });
  const bulkCategoryNames = categoryNamesFrom(bulkCategoriesQuery.data);

  const addToLocation = useMutation({
    mutationFn: (productId) => assignCatalogProduct(productId, {
      locationId: Number(dialogLocationId),
      mrp: Number(form.mrp),
      costPrice: Number(form.costPrice || 0),
      categoryName: selectedCategory || null,
      visible: true,
      available: true,
      lowStockThreshold: 5,
      initialStock: 0,
    }),
    onSuccess: () => {
      const name = locationLabel(dialogLocation);
      setPicked(null);
      queryClient.invalidateQueries({ queryKey: ["global-products"] });
      queryClient.invalidateQueries({ queryKey: ["mrp-products"] });
      toast.success(`Added to ${name}`);
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to add product to this location"),
  });

  const openPicker = (product) => {
    setForm({
      mrp: product.referenceMrp != null ? String(product.referenceMrp) : "",
      costPrice: product.referenceCostPrice != null ? String(product.referenceCostPrice) : "",
      categoryName: product.referenceCategoryName || "",
    });
    setDialogLocationId(activeId);
    setPicked(product);
  };

  const toggleSelected = (product) => setSelected((current) => {
    const next = new Map(current);
    if (next.has(product.productId)) next.delete(product.productId);
    else next.set(product.productId, product);
    return next;
  });

  const data = query.data;
  const products = data?.content || [];
  const selectableOnPage = products.filter((product) => !product.assignedToLocation);
  const allOnPageSelected = selectableOnPage.length > 0 && selectableOnPage.every((product) => selected.has(product.productId));

  const toggleAllOnPage = () => setSelected((current) => {
    const next = new Map(current);
    if (allOnPageSelected) selectableOnPage.forEach((product) => next.delete(product.productId));
    else selectableOnPage.forEach((product) => next.set(product.productId, product));
    return next;
  });

  const selectedProducts = [...selected.values()];
  const bulkReady = selectedProducts.filter((product) => product.referenceMrp != null);
  const bulkSkipped = selectedProducts.length - bulkReady.length;

  const openBulk = () => {
    setBulkLocationId(activeId);
    setBulkOpen(true);
  };

  const runBulkAdd = async () => {
    const targetId = Number(bulkLocationId);
    const targetName = locationLabel(bulkLocation);
    let added = 0;
    let failed = 0;
    setBulkBusy(true);
    for (const product of bulkReady) {
      try {
        await assignCatalogProduct(product.productId, assignPayload(product, targetId, bulkCategoryNames));
        added += 1;
      } catch {
        failed += 1;
      }
    }
    setBulkBusy(false);
    setBulkOpen(false);
    setSelected(new Map());
    queryClient.invalidateQueries({ queryKey: ["global-products"] });
    queryClient.invalidateQueries({ queryKey: ["mrp-products"] });
    const skippedNote = bulkSkipped ? ` · ${bulkSkipped} skipped (no pricing yet)` : "";
    const failedNote = failed ? ` · ${failed} failed` : "";
    if (failed) toast.error(`Added ${added} to ${targetName}${failedNote}${skippedNote}`);
    else toast.success(`Added ${added} to ${targetName}${skippedNote}`);
  };

  const mrpValid = form.mrp !== "" && Number(form.mrp) >= 0;
  const costValid = form.costPrice === "" || Number(form.costPrice) >= 0;
  const canSubmit = Boolean(dialogLocationId) && mrpValid && costValid && !addToLocation.isPending;

  const brandOptions = [...(brandsQuery.data ?? [])];
  if (filters.brand && !brandOptions.includes(filters.brand)) brandOptions.unshift(filters.brand);
  const hasActiveFilters = Boolean(filters.q || filters.brand || filters.veg !== undefined
    || filters.hasImage !== undefined || filters.inLocation !== undefined || filters.sort || filters.from);

  const clearFilters = () => {
    setSearchInput("");
    updateSearch({ q: undefined, brand: undefined, veg: undefined, hasImage: undefined, inLocation: undefined, sort: undefined, from: undefined });
  };

  const sourceLocation = availableLocations.find((location) => String(location.id) === String(filters.from ?? ""));
  const copyTargets = availableLocations.filter((location) => String(location.id) !== String(filters.from ?? ""));
  const copyTarget = availableLocations.find((location) => String(location.id) === copyTargetId);

  const openCopy = () => {
    setCopyTargetId("");
    setCopyScope(selected.size > 0 ? "selected" : "all");
    setCopyOpen(true);
  };

  const runCopy = async () => {
    setCopyBusy(true);
    try {
      const result = await copyCatalogAssignments({
        sourceLocationId: filters.from,
        targetLocationId: Number(copyTargetId),
        productIds: copyScope === "selected" ? [...selected.keys()] : null,
      });
      setCopyOpen(false);
      setSelected(new Map());
      queryClient.invalidateQueries({ queryKey: ["global-products"] });
      queryClient.invalidateQueries({ queryKey: ["mrp-products"] });
      const parts = [`Copied ${result.copied} to ${locationLabel(copyTarget)}`];
      if (result.alreadyAtTarget) parts.push(`${result.alreadyAtTarget} already sold there`);
      if (result.inactive) parts.push(`${result.inactive} inactive`);
      if (result.copied === 0) toast.info(parts.join(" · "));
      else toast.success(parts.join(" · "));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to copy products");
    } finally {
      setCopyBusy(false);
    }
  };

  return (
    <main className="gp-page">
      <div className="gp-inner">
        <header className="gp-head">
          <button type="button" onClick={toggleSidebar} aria-label="Open admin navigation" className="gp-nav-btn">
            <SidebarIcon size={18} />
          </button>
          <div>
            <h1 className="gp-title">Global Product Catalogue</h1>
            <p className="gp-sub">
              Products from all locations. Images are shared; MRP, cost price and category are set separately for each location you add a product to.
            </p>
          </div>
        </header>

        <section className="gp-panel">
          <p className="gp-context">
            Showing products for <strong>{locationLabel(activeLocation) || "your current location"}</strong>. Products marked “In this location” are already sold there.
          </p>

          <label className="gp-search">
            <MagnifyingGlassIcon size={18} style={{ color: "#858079" }} />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, brand, pack or SKU"
              aria-label="Search global products"
            />
          </label>

          <div className="gp-filters">
            <FilterSelect
              label="Brand"
              active={Boolean(filters.brand)}
              value={filters.brand ?? ANY}
              onChange={(value) => updateSearch({ brand: value === ANY ? undefined : value })}
              options={[{ value: ANY, label: "All brands" }, ...brandOptions.map((brand) => ({ value: brand, label: brand }))]}
            />
            <FilterSelect
              label="Type"
              active={triFromParam(filters.veg, "veg", "nonveg") !== ANY}
              value={triFromParam(filters.veg, "veg", "nonveg")}
              onChange={(value) => updateSearch({ veg: triToParam(value, "veg", "nonveg") })}
              options={VEG_OPTIONS}
            />
            <FilterSelect
              label="Image"
              active={triFromParam(filters.hasImage, "with", "without") !== ANY}
              value={triFromParam(filters.hasImage, "with", "without")}
              onChange={(value) => updateSearch({ hasImage: triToParam(value, "with", "without") })}
              options={IMAGE_OPTIONS}
            />
            <FilterSelect
              label="Location status"
              active={triFromParam(filters.inLocation, "in", "out") !== ANY}
              value={triFromParam(filters.inLocation, "in", "out")}
              onChange={(value) => updateSearch({ inLocation: triToParam(value, "in", "out") })}
              options={LOCATION_OPTIONS}
            />
            <FilterSelect
              label="Copy from location"
              active={Boolean(filters.from)}
              value={filters.from ? String(filters.from) : ANY}
              onChange={(value) => updateSearch({ from: value === ANY ? undefined : Number(value) })}
              options={[{ value: ANY, label: "Any location" }, ...availableLocations.map((location) => ({ value: String(location.id), label: locationLabel(location) }))]}
            />
            <FilterSelect
              label="Sort by"
              value={filters.sort ?? (filters.q ? "relevance" : "name")}
              onChange={(value) => updateSearch({ sort: value })}
              options={SORT_OPTIONS.filter((option) => option.value !== "relevance" || filters.q)}
            />
          </div>

          <div className="gp-toolbar">
            <p className="gp-count" aria-live="polite">
              {data && <span className="gp-count-badge">{data.totalElements} product{data.totalElements === 1 ? "" : "s"}</span>}
              {hasActiveFilters && (
                <button type="button" className="gp-link" onClick={clearFilters}>Clear filters</button>
              )}
            </p>
            <div className="gp-toggle" role="group" aria-label="Display">
              <button type="button" aria-pressed={view === "cards"} onClick={() => updateSearch({ view: undefined }, { resetPage: false })}>Cards</button>
              <button type="button" aria-pressed={view === "table"} onClick={() => updateSearch({ view: "table" }, { resetPage: false })}>Table</button>
            </div>
          </div>
        </section>

        {!activeId && <p className="gp-empty">Select a location from the header to view the catalogue.</p>}

        {query.isError && (
          <div className="gp-empty">
            Unable to load products. <button type="button" className="underline" onClick={() => query.refetch()}>Retry</button>
          </div>
        )}

        {activeId && !query.isError && (
          <>
            {!query.isLoading && products.length === 0 && (
              <p className="gp-empty">{filters.q ? `No products match "${filters.q}".` : "No products match these filters."}</p>
            )}

            {view === "cards" && (
              <div className="gp-grid">
                {products.map((product) => {
                  const src = imageSource(product.imageUrl);
                  const variant = variantLabel(product.variantIdentity);
                  return (
                    <article key={product.productId} className="gp-card">
                      {!product.assignedToLocation && (
                        <label className="gp-card-select">
                          <input
                            type="checkbox"
                            checked={selected.has(product.productId)}
                            onChange={() => toggleSelected(product)}
                            aria-label={`Select ${product.name}`}
                          />
                        </label>
                      )}
                      <div className="gp-img">
                        {src ? <img src={src} alt={product.name} loading="lazy" /> : <span className="gp-noimg">No image</span>}
                      </div>
                      <div className="gp-body">
                        <h2 className="gp-name">{product.name}</h2>
                        <p className="gp-meta">{[product.brand, variant].filter(Boolean).join(" · ") || "No brand"}</p>
                        {product.sku && <p className="gp-meta">SKU {product.sku}</p>}
                        <div className="gp-foot">
                          {product.assignedToLocation
                            ? <span className="gp-in">In this location</span>
                            : <button type="button" className="gp-add" onClick={() => openPicker(product)}>Add to a location</button>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {view === "table" && products.length > 0 && (
              <div className="gp-table-wrap">
                <table className="gp-table">
                  <thead>
                    <tr>
                      <th className="gp-check">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          disabled={selectableOnPage.length === 0}
                          onChange={toggleAllOnPage}
                          aria-label="Select all products on this page"
                        />
                      </th>
                      <th>Image</th>
                      <th>Product</th>
                      <th className="gp-hide-sm">Brand</th>
                      <th className="gp-hide-sm">SKU</th>
                      <th>Status</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const src = imageSource(product.imageUrl);
                      const variant = variantLabel(product.variantIdentity);
                      return (
                        <tr key={product.productId}>
                          <td className="gp-check">
                            {!product.assignedToLocation && (
                              <input
                                type="checkbox"
                                checked={selected.has(product.productId)}
                                onChange={() => toggleSelected(product)}
                                aria-label={`Select ${product.name}`}
                              />
                            )}
                          </td>
                          <td>
                            {src
                              ? <img className="gp-thumb" src={src} alt="" loading="lazy" />
                              : <span className="gp-badge gp-badge-warn">No image</span>}
                          </td>
                          <td>
                            <div className="gp-table-name">{product.name}</div>
                            {variant && <div className="gp-meta">{variant}</div>}
                          </td>
                          <td className="gp-hide-sm">{product.brand || <span className="gp-badge gp-badge-muted">No brand</span>}</td>
                          <td className="gp-hide-sm">{product.sku || <span className="gp-muted">—</span>}</td>
                          <td>
                            {product.assignedToLocation
                              ? <span className="gp-badge gp-badge-ok">In this location</span>
                              : <span className="gp-badge gp-badge-muted">Not added</span>}
                          </td>
                          <td className="gp-table-action">
                            {!product.assignedToLocation && (
                              <button type="button" className="gp-add gp-row-add" onClick={() => openPicker(product)}>Add</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {data && data.totalPages > 1 && (
              <nav className="gp-pager" aria-label="Catalogue pages">
                <button type="button" disabled={data.number <= 0} onClick={() => updateSearch({ page: data.number <= 1 ? undefined : data.number }, { resetPage: false })}>Previous</button>
                <span>Page {data.number + 1} of {data.totalPages}</span>
                <button type="button" disabled={data.number + 1 >= data.totalPages} onClick={() => updateSearch({ page: data.number + 2 }, { resetPage: false })}>Next</button>
              </nav>
            )}
          </>
        )}
      </div>

      {(selected.size > 0 || filters.from) && (
        <div className="gp-bulk-bar" role="region" aria-label="Bulk actions">
          <span>{selected.size > 0 ? `${selected.size} selected` : `All products at ${locationLabel(sourceLocation)}`}</span>
          {selected.size > 0 && <button type="button" className="gp-ghost" onClick={() => setSelected(new Map())}>Clear</button>}
          {selected.size > 0 && <button type="button" className="gp-add gp-bulk-go" onClick={openBulk}>Add selected to a location</button>}
          {filters.from && <button type="button" className="gp-add gp-bulk-go" onClick={openCopy}>Copy to another location</button>}
        </div>
      )}

      <Dialog open={Boolean(picked)} onOpenChange={(open) => { if (!open) setPicked(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add “{picked?.name}” to a location</DialogTitle>
            <DialogDescription>
              Choose the location that will sell this product. The image is shared; each location keeps its own pricing.
              {picked?.referenceLocationName && (
                <> Pricing is copied from {picked.referenceLocationName}; you can change it.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <form
            className="gp-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) addToLocation.mutate(picked.productId);
            }}
          >
            <label className="gp-field">Location *
              <Select value={dialogLocationId} onValueChange={setDialogLocationId}>
                <SelectTrigger aria-label="Location to add product to" className="gp-select-full">
                  <SelectValue placeholder="Choose a location">{locationLabel(dialogLocation)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {locationLabel(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="gp-form-row">
              <label className="gp-field">MRP (₹) *
                <input type="number" min="0" step="0.01" required value={form.mrp} onChange={(event) => setForm((current) => ({ ...current, mrp: event.target.value }))} placeholder="0.00" />
              </label>
              <label className="gp-field">Cost price (₹)
                <input type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => setForm((current) => ({ ...current, costPrice: event.target.value }))} placeholder="0.00" />
              </label>
            </div>
            <label className="gp-field">Category
              <Select value={selectedCategory} onValueChange={(value) => setForm((current) => ({ ...current, categoryName: value }))}>
                <SelectTrigger aria-label="Category" className="gp-select-full" disabled={!dialogLocationId}>
                  <SelectValue placeholder={categoryNames.length ? "Choose a category (optional)" : "No categories in this location"} />
                </SelectTrigger>
                <SelectContent>
                  {categoryNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <DialogFooter>
              <button type="button" onClick={() => setPicked(null)} className="gp-ghost">Cancel</button>
              <button type="submit" disabled={!canSubmit} className="gp-add gp-submit">
                {addToLocation.isPending ? "Adding…" : `Add to ${locationLabel(dialogLocation) || "location"}`}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={(open) => { if (!bulkBusy) setBulkOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {selected.size} selected product{selected.size === 1 ? "" : "s"}</DialogTitle>
            <DialogDescription>
              Each product's MRP, cost price and category are copied from the location where it was last priced.
              The category is kept only if the chosen location has it.
            </DialogDescription>
          </DialogHeader>
          <div className="gp-form">
            <label className="gp-field">Location *
              <Select value={bulkLocationId} onValueChange={setBulkLocationId}>
                <SelectTrigger aria-label="Location to add selected products to" className="gp-select-full">
                  <SelectValue placeholder="Choose a location">{locationLabel(bulkLocation)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {locationLabel(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <p className="gp-hint">
              {bulkReady.length} will be added to {locationLabel(bulkLocation) || "the chosen location"}.
              {bulkSkipped > 0 && ` ${bulkSkipped} ${bulkSkipped === 1 ? "has" : "have"} no pricing yet and will be skipped; add ${bulkSkipped === 1 ? "it" : "them"} one at a time.`}
            </p>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setBulkOpen(false)} className="gp-ghost" disabled={bulkBusy}>Cancel</button>
            <button
              type="button"
              onClick={runBulkAdd}
              disabled={!bulkLocationId || bulkReady.length === 0 || bulkBusy || bulkCategoriesQuery.isLoading}
              className="gp-add gp-submit"
            >
              {bulkBusy ? "Adding…" : `Add ${bulkReady.length} product${bulkReady.length === 1 ? "" : "s"}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={(open) => { if (!copyBusy) setCopyOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy products from {locationLabel(sourceLocation)}</DialogTitle>
            <DialogDescription>
              MRP, cost price and category are copied as they are at {locationLabel(sourceLocation)}.
              Products already sold at the target location, and inactive products, are skipped. The result message shows how many were skipped and why.
            </DialogDescription>
          </DialogHeader>
          <div className="gp-form">
            <label className="gp-field">Copy to *
              <Select value={copyTargetId} onValueChange={setCopyTargetId}>
                <SelectTrigger aria-label="Location to copy products to" className="gp-select-full">
                  <SelectValue placeholder="Choose a location">{locationLabel(copyTarget)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {copyTargets.map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {locationLabel(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="gp-field">Which products
              <Select value={copyScope} onValueChange={setCopyScope}>
                <SelectTrigger aria-label="Which products to copy" className="gp-select-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="selected" disabled={selected.size === 0}>
                    Selected products ({selected.size})
                  </SelectItem>
                  <SelectItem value="all">Every product at {locationLabel(sourceLocation)}</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setCopyOpen(false)} className="gp-ghost" disabled={copyBusy}>Cancel</button>
            <button
              type="button"
              onClick={runCopy}
              disabled={!copyTargetId || copyBusy || (copyScope === "selected" && selected.size === 0)}
              className="gp-add gp-submit"
            >
              {copyBusy ? "Copying…" : "Copy products"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
