import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, SidebarIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocation } from "@/context/LocationContext";
import { useSidebar } from "@/components/ui/sidebar";
import { baseURL } from "@/services";
import { assignCatalogProduct, getGlobalCatalogProducts } from "@/services/mrp-product-service";
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

export const Route = createFileRoute("/admin/(menu)/global-products")({
  component: GlobalProductsPage,
});

const EMPTY_FORM = { mrp: "", costPrice: "", categoryName: "" };

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

function GlobalProductsPage() {
  const { availableLocations = [], activeLocationId } = useLocation();
  const { toggleSidebar } = useSidebar();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState(null);
  const [dialogLocationId, setDialogLocationId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  // The active location decides which products show as "already in this location".
  const activeId = activeLocationId ? String(activeLocationId) : "";
  const activeLocation = availableLocations.find((location) => String(location.id) === activeId);
  const dialogLocation = availableLocations.find((location) => String(location.id) === dialogLocationId);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: ["global-products", activeId, debouncedSearch, page],
    queryFn: () => getGlobalCatalogProducts(activeId, { search: debouncedSearch, page }),
    enabled: Boolean(activeId),
  });

  const categoriesQuery = useQuery({
    queryKey: ["mrp-categories", dialogLocationId],
    queryFn: () => getMrpProductCategories(dialogLocationId),
    enabled: Boolean(picked && dialogLocationId),
  });
  const categoryNames = (Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [])
    .map((category) => category.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const addToLocation = useMutation({
    mutationFn: (productId) => assignCatalogProduct(productId, {
      locationId: Number(dialogLocationId),
      mrp: Number(form.mrp),
      costPrice: Number(form.costPrice || 0),
      categoryName: form.categoryName.trim() || null,
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
    setForm(EMPTY_FORM);
    setDialogLocationId(activeId);
    setPicked(product);
  };

  const mrpValid = form.mrp !== "" && Number(form.mrp) >= 0;
  const costValid = form.costPrice === "" || Number(form.costPrice) >= 0;
  const canSubmit = Boolean(dialogLocationId) && mrpValid && costValid && !addToLocation.isPending;
  const data = query.data;
  const products = data?.content || [];

  return (
    <main className="gp-page">
      <div className="gp-inner">
        <header className="gp-head">
          <div>
            <h1 className="gp-title">Global Product Catalogue</h1>
            <p className="gp-sub">
              Products from all locations. Images are shared; MRP, cost price and category are set separately for each location you add a product to.
            </p>
          </div>
          <button type="button" onClick={toggleSidebar} aria-label="Toggle sidebar" className="gp-icon-btn">
            <SidebarIcon size={18} />
          </button>
        </header>

        <p className="gp-context">
          Showing status for <strong>{locationLabel(activeLocation) || "your current location"}</strong>. Products marked “In this location” are already sold there.
        </p>

        <div className="gp-controls">
          <label className="gp-search">
            <MagnifyingGlassIcon size={16} style={{ color: "#858079" }} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, brand, pack or SKU"
              aria-label="Search global products"
            />
          </label>
        </div>

        {!activeId && <p className="gp-empty">Select a location from the header to view the catalogue.</p>}

        {query.isError && (
          <div className="gp-empty">
            Unable to load products. <button type="button" className="underline" onClick={() => query.refetch()}>Retry</button>
          </div>
        )}

        {activeId && !query.isError && (
          <>
            {!query.isLoading && products.length === 0 && (
              <p className="gp-empty">{debouncedSearch ? `No products match "${debouncedSearch}".` : "No products in the catalogue yet."}</p>
            )}
            <div className="gp-grid">
              {products.map((product) => {
                const src = imageSource(product.imageUrl);
                const variant = variantLabel(product.variantIdentity);
                return (
                  <article key={product.productId} className="gp-card">
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

            {data && data.totalPages > 1 && (
              <nav className="gp-pager" aria-label="Catalogue pages">
                <button type="button" disabled={data.number <= 0} onClick={() => setPage((current) => current - 1)}>Previous</button>
                <span>Page {data.number + 1} of {data.totalPages}</span>
                <button type="button" disabled={data.number + 1 >= data.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
              </nav>
            )}
          </>
        )}
      </div>

      <Dialog open={Boolean(picked)} onOpenChange={(open) => { if (!open) setPicked(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add “{picked?.name}” to a location</DialogTitle>
            <DialogDescription>
              Choose the location that will sell this product. The image is shared; enter that location's own pricing.
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
              <input
                list="gp-category-options"
                value={form.categoryName}
                onChange={(event) => setForm((current) => ({ ...current, categoryName: event.target.value }))}
                placeholder="e.g. Beverages"
                maxLength={80}
              />
              <datalist id="gp-category-options">
                {categoryNames.map((name) => <option key={name} value={name} />)}
              </datalist>
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
    </main>
  );
}
