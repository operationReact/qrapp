import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocation } from "@/context/LocationContext";
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
} from "@/services/product-catalog-service";

export const Route = createFileRoute("/admin/(menu)/product-catalog")({
  component: ProductCatalogPage,
});
const EMPTY = {
  variantIdentity: "", name: "", brand: "", categoryName: "", description: "",
  mrp: "", costPrice: "", locationId: "", initialStock: "0", lowStockThreshold: "5",
};

const CATEGORY_OPTIONS = [
  ["Biscuits", "biscuits"], ["Chips", "chips"], ["Chocolates", "chocolates"],
  ["Drinks", "drinks"], ["Snacks", "snacks"], ["Confectionery", "confectionery"],
  ["Personal Care", "personal care"], ["Others", "other"],
].map(([name, id]) => ({ id, name }));

function productImageSource(product) {
  if (!product?.imageUrl) return null;
  return product.imageUrl.startsWith("http") ? product.imageUrl : `${baseURL}${product.imageUrl}`;
}

function ProductCatalogPage() {
  const { availableLocations = [], activeLocationId } = useLocation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [stock, setStock] = useState({});
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [file, setFile] = useState({});
  const [aiStudio, setAiStudio] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [catalogLocationId, setCatalogLocationId] = useState("");
  const selectedLocation = availableLocations.find((location) => String(location.id) === String(catalogLocationId));
  const effectiveLocationId = selectedLocation ? String(selectedLocation.id)
    : activeLocationId ? String(activeLocationId) : String(availableLocations[0]?.id || "");
  const query = useQuery({
    queryKey: ["catalog-products", effectiveLocationId, search, page],
    queryFn: () => getCatalogProducts(effectiveLocationId, true, { search: search || undefined, page, size: 20 }),
    enabled: Boolean(effectiveLocationId),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["catalog-products"] });
  const create = useMutation({
    mutationFn: createCatalogProduct,
    onSuccess: () => { setForm(EMPTY); setFormOpen(false); invalidate(); toast.success("Product created for this location"); },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to create product"),
  });
  const edit = useMutation({
    mutationFn: ({ id, payload }) => updateCatalogProduct(id, payload),
    onSuccess: () => { setForm(EMPTY); setFormOpen(false); setEditingId(null); invalidate(); toast.success("Product updated"); },
    onError: (error) => toast.error(error?.response?.data?.message || "Unable to update product"),
  });
  const update = useMutation({
    mutationFn: ({ id, locationId, payload }) => updateCatalogAssignment(id, locationId, payload),
    onSuccess: invalidate,
    onError: () => toast.error("Unable to update location settings"),
  });
  const movement = useMutation({
    mutationFn: ({ id, payload }) => recordCatalogMovement(id, payload),
    onSuccess: () => { invalidate(); toast.success("Stock updated"); },
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
  const products = query.data?.content || [];

  return (
    <main className="min-h-screen min-w-0 overflow-x-hidden bg-background p-4 md:p-8">
      <div className="mx-auto min-w-0 max-w-7xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Essentials</p>
          <h1 className="text-2xl font-bold">Essentials Catalog</h1>
          <p className="text-sm text-muted-foreground">Manage products, availability, and stock for one location at a time.</p>
          <div className="mt-3 max-w-sm space-y-1 text-sm font-medium">
            <span>Managing location</span>
            <LocationCombobox value={catalogLocationId} options={availableLocations} placeholder="Choose a location"
              onChange={(locationId) => { setCatalogLocationId(locationId); setPage(0); setForm((current) => ({ ...current, locationId })); }} />
          </div>
        </header>
        <button type="button" onClick={() => setFormOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-2xl border bg-card px-4 py-3 text-left font-semibold md:hidden"
          aria-expanded={formOpen}>
          <span>{editingId ? "Edit product" : "Add product"}</span>
          <span className="text-xl leading-none">{formOpen ? "−" : "+"}</span>
        </button>
        <form className={`${formOpen ? "grid" : "hidden md:grid"} min-w-0 gap-3 rounded-2xl border bg-card p-4`}
          onSubmit={(event) => {
            event.preventDefault();
            const payload = {
              ...form,
              locationId: effectiveLocationId ? Number(effectiveLocationId) : null,
              mrp: Number(form.mrp),
              costPrice: Number(form.costPrice),
              initialStock: Number(form.initialStock || 0),
              lowStockThreshold: Number(form.lowStockThreshold || 0),
            };
            if (editingId) {
              const { initialStock: _initialStock, ...updatePayload } = payload;
              edit.mutate({ id: editingId, payload: updatePayload });
            }
            else create.mutate(payload);
          }}>
          <h2 className="text-lg font-semibold sm:col-span-2 lg:col-span-4">{editingId ? "Edit product" : "Add product"}</h2>
          {[["variantIdentity", "Pack size (optional)"], ["name", "Product name"], ["brand", "Brand"], ["mrp", "MRP"], ["costPrice", "Cost price"]].map(([name, label]) => (
            <label key={name} className="min-w-0 space-y-1 text-sm font-medium">{label}
              <input name={name} value={form[name]} placeholder={name === "variantIdentity" ? "e.g. 250 g, 1 L, pack of 6" : undefined} onChange={setField} required={["name", "mrp", "costPrice"].includes(name)}
                type={["mrp", "costPrice"].includes(name) ? "number" : "text"} min={["mrp", "costPrice"].includes(name) ? "0" : undefined} step={["mrp", "costPrice"].includes(name) ? "0.01" : undefined} className="h-10 w-full rounded-lg border bg-background px-3" />
            </label>
          ))}
          <label className="min-w-0 space-y-1 text-sm font-medium">Category
            <LocationCombobox
              value={form.categoryName}
              options={CATEGORY_OPTIONS}
              placeholder="Choose category"
              onChange={(categoryName) => setForm((current) => ({ ...current, categoryName }))}
            />
          </label>
          <label className="min-w-0 space-y-1 text-sm font-medium">Opening stock
            <input name="initialStock" value={form.initialStock} onChange={setField} type="number" min="0" step="1" disabled={!catalogLocationId} className="h-10 w-full rounded-lg border bg-background px-3 disabled:opacity-50" />
          </label>
          <label className="min-w-0 space-y-1 text-sm font-medium">Low stock alert
            <input name="lowStockThreshold" value={form.lowStockThreshold} onChange={setField} type="number" min="0" step="1" className="h-10 w-full rounded-lg border bg-background px-3" />
          </label>
          <label className="space-y-1 text-sm font-medium sm:col-span-2 lg:col-span-3">Description
            <textarea name="description" value={form.description} onChange={setField} className="min-h-10 w-full rounded-lg border bg-background px-3 py-2" />
          </label>
          <button disabled={create.isPending || edit.isPending} className="h-10 self-end rounded-lg bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">
            {create.isPending || edit.isPending ? "Saving…" : editingId ? "Save changes" : "Add product"}
          </button>
          {editingId && <button type="button" onClick={() => { setForm(EMPTY); setFormOpen(false); setEditingId(null); }} className="h-10 self-end rounded-lg border px-4">Cancel</button>}
        </form>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            placeholder="Search name, variant or brand" className="h-10 min-w-0 flex-1 rounded-lg border bg-card px-3" />
          <span className="text-sm text-muted-foreground">{query.data?.totalElements || 0} products</span>
        </div>
        <section className="rounded-2xl border bg-card">
          <div className="divide-y md:hidden">
            {products.map((product) => {
              const imageSource = productImageSource(product);
              return <article key={product.id} className="min-w-0 space-y-3 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {imageSource ? <img src={imageSource} alt="" className="h-14 w-14 shrink-0 rounded-lg border object-contain bg-muted" /> :
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted text-center text-[10px] text-muted-foreground">No image</div>}
                    <div className="min-w-0">
                      <h2 className="break-words font-semibold">{product.name}</h2>
                      <p className="break-words text-xs text-muted-foreground">{product.brand || "No brand"} · {product.categoryName || "Uncategorized"} · {product.variantIdentity}</p>
                      <p className="mt-1 text-sm">MRP <strong>₹{product.mrp}</strong> <span className="ml-3 text-muted-foreground">Cost ₹{product.costPrice}</span></p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <button type="button" onClick={() => status.mutate({ id: product.id, active: !product.active })} className="text-xs text-primary">{product.active ? "Enabled" : "Disabled"}</button>
                    <button type="button" onClick={() => setExpandedProductId((id) => id === product.id ? null : product.id)} className="rounded border px-2 py-1 text-xs">
                      {expandedProductId === product.id ? "Close" : "Manage"}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Selected location inventory</p>
                {expandedProductId === product.id && <div className="space-y-3">
                  {(product.assignments || []).filter((item) => String(item.locationId) === String(effectiveLocationId)).map((item) => <div key={item.locationProductId} className="min-w-0 rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 break-words font-medium">{item.locationName}</span>
                      <button type="button" className="shrink-0 text-xs text-primary" onClick={() => update.mutate({ id: product.id, locationId: item.locationId, payload: { locationId: item.locationId, visible: !item.visible, available: item.available, lowStockThreshold: item.lowStockThreshold } })}>{item.visible ? "Hide" : "Show"}</button>
                    </div>
                    <p className="text-xs text-muted-foreground">₹{product.mrp} · {item.availableQuantity ?? 0} in stock</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input type="number" min="1" placeholder="Qty" value={stock[item.locationProductId]?.quantity || ""} onChange={(event) => setStock((all) => ({ ...all, [item.locationProductId]: { ...all[item.locationProductId], quantity: event.target.value } }))} className="h-9 min-w-0 rounded border bg-background px-2 text-xs" />
                      <input placeholder="Reason" value={stock[item.locationProductId]?.reason || ""} onChange={(event) => setStock((all) => ({ ...all, [item.locationProductId]: { ...all[item.locationProductId], reason: event.target.value } }))} className="h-9 min-w-0 rounded border bg-background px-2 text-xs" />
                      <button type="button" className="rounded bg-primary px-2 py-2 text-xs text-primary-foreground" onClick={() => movement.mutate({ id: product.id, payload: { locationId: item.locationId, movementType: "ADD_STOCK", quantity: Number(stock[item.locationProductId]?.quantity), reason: stock[item.locationProductId]?.reason } })}>Add stock</button>
                      <button type="button" className="rounded border px-2 py-2 text-xs" onClick={() => movement.mutate({ id: product.id, payload: { locationId: item.locationId, movementType: "REDUCE_STOCK", quantity: Number(stock[item.locationProductId]?.quantity), reason: stock[item.locationProductId]?.reason } })}>Reduce</button>
                    </div>
                  </div>)}
                  <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded border px-3 py-2 text-xs" onClick={() => { setEditingId(product.id); setFormOpen(true); setForm({ variantIdentity: product.variantIdentity === "DEFAULT" ? "" : (product.variantIdentity || ""), name: product.name || "", brand: product.brand || "", categoryName: product.categoryName || "", description: product.description || "", mrp: product.mrp || "", costPrice: product.costPrice || "", locationId: effectiveLocationId, initialStock: "0", lowStockThreshold: "5" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                  <label className="cursor-pointer rounded bg-muted px-3 py-2 text-xs">Replace
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) { setFile((all) => ({ ...all, [product.id]: selected.name })); image.mutate({ id: product.id, selected }); } }} />
                  </label>
                  <button type="button" className="rounded bg-primary px-3 py-2 text-xs text-primary-foreground" onClick={() => setAiStudio({ product, source: null, preview: null, session: null })}>AI image</button>
                  </div>
                </div>}
              </article>;
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="border-b bg-muted/40"><tr>
              <th className="p-3">Product / brand</th><th className="p-3">MRP / cost</th><th className="p-3">Status</th>
              <th className="p-3">Location / stock</th><th className="p-3">Actions</th>
            </tr></thead>
            <tbody>{products.map((product) => {
              return <tr key={product.id} className="border-b last:border-0 align-top">
                <td className="p-3 font-semibold"><div className="flex items-center gap-2">
                  {productImageSource(product) ? <img src={productImageSource(product)} alt="" className="h-10 w-10 rounded border object-contain bg-muted" /> :
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-dashed bg-muted text-[9px] font-normal text-muted-foreground">No image</div>}
                  <span>{product.name}<span className="block text-xs font-normal text-muted-foreground">{product.brand || "No brand"} · {product.categoryName || "Uncategorized"} · {product.variantIdentity}</span></span>
                </div></td>
                <td className="p-3">₹{product.mrp}<div className="text-xs text-muted-foreground">Cost ₹{product.costPrice}</div></td>
                <td className="p-3"><button type="button" onClick={() => status.mutate({ id: product.id, active: !product.active })} className="text-primary">{product.active ? "Enabled" : "Disabled"}</button></td>
                <td className="p-3">{(product.assignments || []).filter((item) => String(item.locationId) === String(effectiveLocationId)).map((item) => <div key={item.locationProductId} className="mb-2">
                  <strong>{item.locationName}</strong> · ₹{product.mrp} · {item.availableQuantity ?? 0} in stock
                  <button type="button" className="ml-2 text-xs text-primary" onClick={() => update.mutate({ id: product.id, locationId: item.locationId, payload: { locationId: item.locationId, visible: !item.visible, available: item.available, lowStockThreshold: item.lowStockThreshold } })}>{item.visible ? "Hide" : "Show"}</button>
                  <div className="mt-1 flex flex-wrap gap-1"><input type="number" min="1" placeholder="Qty" value={stock[item.locationProductId]?.quantity || ""} onChange={(event) => setStock((all) => ({ ...all, [item.locationProductId]: { ...all[item.locationProductId], quantity: event.target.value } }))} className="h-8 w-16 rounded border px-1 text-xs" /><input placeholder="Reason" value={stock[item.locationProductId]?.reason || ""} onChange={(event) => setStock((all) => ({ ...all, [item.locationProductId]: { ...all[item.locationProductId], reason: event.target.value } }))} className="h-8 w-24 rounded border px-1 text-xs" /><button type="button" className="rounded bg-primary px-2 text-xs text-primary-foreground" onClick={() => movement.mutate({ id: product.id, payload: { locationId: item.locationId, movementType: "ADD_STOCK", quantity: Number(stock[item.locationProductId]?.quantity), reason: stock[item.locationProductId]?.reason } })}>Add stock</button><button type="button" className="rounded border px-2 text-xs" onClick={() => movement.mutate({ id: product.id, payload: { locationId: item.locationId, movementType: "REDUCE_STOCK", quantity: Number(stock[item.locationProductId]?.quantity), reason: stock[item.locationProductId]?.reason } })}>Reduce</button></div>
                </div>)}</td>
                <td className="p-3"><div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => { setEditingId(product.id); setFormOpen(true); setForm({ variantIdentity: product.variantIdentity === "DEFAULT" ? "" : (product.variantIdentity || ""), name: product.name || "", brand: product.brand || "", categoryName: product.categoryName || "", description: product.description || "", mrp: product.mrp || "", costPrice: product.costPrice || "", locationId: effectiveLocationId, initialStock: "0", lowStockThreshold: "5" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                  <label className="cursor-pointer rounded bg-muted px-2 py-1 text-xs">Replace
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) { setFile((all) => ({ ...all, [product.id]: selected.name })); image.mutate({ id: product.id, selected }); } }} />
                  </label>
                  <button type="button" className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                    onClick={() => setAiStudio({ product, source: null, preview: null, session: null })}>
                    AI image
                  </button>
                </div>{file[product.id] && <span className="ml-2 text-xs text-muted-foreground">{file[product.id]}</span>}</td>
              </tr>;
            })}</tbody>
          </table>
          </div>
          {!query.isLoading && products.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No products found.</p>}
        </section>
        <div className="flex justify-end gap-2">
          <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button>
          <button type="button" disabled={!query.data || query.data.last} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
      {aiStudio && <ProductAiStudio
        studio={aiStudio}
        setStudio={setAiStudio}
        generating={aiGenerate.isPending}
        approving={aiApprove.isPending}
        regenerating={aiRegenerate.isPending}
        discarding={aiDiscard.isPending}
        onGenerate={() => aiGenerate.mutate({ id: aiStudio.product.id, source: aiStudio.source })}
        onApprove={() => aiApprove.mutate({ id: aiStudio.product.id, sessionId: aiStudio.session.sessionId })}
        onRegenerate={() => aiRegenerate.mutate({ id: aiStudio.product.id, sessionId: aiStudio.session.sessionId })}
        onDiscard={() => aiDiscard.mutate({ id: aiStudio.product.id, sessionId: aiStudio.session.sessionId })}
      />}
    </main>
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
