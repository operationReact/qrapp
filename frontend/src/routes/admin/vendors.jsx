import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MapPin, Plus, Search, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { assignableSectionLocations } from "@/lib/sectionLocation";
import { getMenu, patchMenuItemQuick } from "@/services/menu-service";
import {
  createVendor, getVendorCostHistory, getVendors, lookupVendorPhone, setVendorActive, setVendorCost, updateVendor,
} from "@/services/vendor-service";
import { vendorErrorMessage } from "@/services/vendor-bill-service";
import { ROLE } from "@/lib/roles";
import { RoleGuard } from "@/components/RoleGuard";
import { VendorBillsPanel } from "./vendor-bills";
import "../../styles/vendors-admin.css";

const TABS = [["suppliers", "Vendors"], ["menu", "Menu items"], ["bills", "Bills"], ["logins", "App logins"]];

function VendorLocationFilter() {
  const { availableLocations, activeLocation, isAllLocations, setSectionLocation, clearSectionLocation } = useActiveLocation();
  useEffect(() => () => clearSectionLocation(), [clearSectionLocation]);
  const options = assignableSectionLocations(availableLocations);
  const value = !isAllLocations && activeLocation?.id != null ? String(activeLocation.id) : "";
  const labelOf = (location) => location.name || location.title || `Location ${location.id}`;
  const selectedLabel = options.find((item) => String(item.id) === value) ? labelOf(options.find((item) => String(item.id) === value)) : undefined;
  return (
    <div className="vendor-location-filter flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cc-muted-text)]">
        <MapPin className="size-3.5 text-[var(--cc-primary)]" aria-hidden="true" />
        Location
      </span>
      <Select
        value={value}
        onValueChange={(next) => {
          const location = options.find((item) => String(item.id) === next);
          if (location) setSectionLocation(location);
        }}
      >
        <SelectTrigger aria-label="Location" className="h-11 w-full rounded-[12px] border-[var(--cc-border)] bg-white text-sm font-semibold text-[var(--cc-text)] shadow-[0_1px_2px_rgba(20,14,10,.05)] hover:border-[var(--cc-primary)]/40">
          <SelectValue placeholder="Select location">{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((location) => (
            <SelectItem key={location.id} value={String(location.id)}>{labelOf(location)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export const Route = createFileRoute("/admin/vendors")({
  validateSearch: (search) => ({ tab: TABS.some(([value]) => value === search.tab) ? search.tab : "suppliers" }),
  component: () => <RoleGuard roles={[ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER]}><VendorsPage /></RoleGuard>,
});

const emptyForm = { vendorName: "", phoneNumber: "", alternatePhoneNumber: "", address: "" };

function VendorsPage() {
  const queryClient = useQueryClient();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { activeLocation, activeLocationId, isAllLocations } = useActiveLocation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [lookup, setLookup] = useState(null);
  const lookupMutation = useMutation({
    mutationFn: () => lookupVendorPhone(activeLocationId, form.phoneNumber.trim()),
    onSuccess: (result) => setLookup(result),
    onError: () => setLookup(null),
  });
  const vendorsQuery = useQuery({
    queryKey: ["vendors", activeLocationId],
    queryFn: () => getVendors(activeLocationId),
    enabled: Boolean(activeLocationId) && !isAllLocations,
  });
  const menuQuery = useQuery({
    queryKey: ["vendor-menu", activeLocationId],
    queryFn: () => getMenu({ locationId: activeLocationId }),
    enabled: Boolean(activeLocationId),
  });
  // .filter(Boolean) guards against any null/undefined entries in the API
  // response so a bad row can never crash the render (e.g. vendor.id lookups below).
  const vendors = useMemo(() => (vendorsQuery.data || []).filter(Boolean), [vendorsQuery.data]);
  const selected = vendors.find((vendor) => vendor.id === selectedId) || vendors[0] || null;
  const filtered = useMemo(() => vendors.filter((vendor) => {
    const text = `${vendor.vendorName} ${vendor.phoneNumber} ${vendor.address || ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "ALL" || (status === "ACTIVE" ? vendor.isActive : !vendor.isActive));
  }), [vendors, query, status]);

  const saveMutation = useMutation({
    mutationFn: () => editing ? updateVendor(selected?.id, form, activeLocationId) : createVendor(form, activeLocationId),
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      if (vendor?.id != null) setSelectedId(vendor.id);
      setShowForm(false);
      toast.success(editing ? "Vendor updated" : "Vendor created");
    },
    onError: (error) => toast.error(vendorErrorMessage(error, "Unable to save vendor")),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, active }) => setVendorActive(id, active, activeLocationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendors"] }),
    onError: () => toast.error("Unable to update vendor status"),
  });

  function openCreate() {
    setEditing(false);
    setForm(emptyForm);
    setLookup(null);
    setShowForm(true);
  }
  function openEdit() {
    setEditing(true);
    setForm({
      vendorName: selected?.vendorName || "",
      phoneNumber: selected?.phoneNumber || "",
      alternatePhoneNumber: selected?.alternatePhoneNumber || "",
      address: selected?.address || "",
    });
    setShowForm(true);
  }

  return (
    <main className="admin-control-center mx-auto min-h-screen w-full max-w-[1440px] space-y-6 bg-[var(--cc-page)] p-4 pb-10 text-[var(--cc-text)] md:p-6">
      <section className="flex flex-col gap-4 rounded-[20px] border border-[var(--cc-border)] bg-white p-5 shadow-[0_1px_2px_rgba(20,14,10,.04),0_12px_32px_-18px_rgba(20,14,10,.2)] md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="grid size-12 shrink-0 place-items-center rounded-[14px] text-white shadow-[0_10px_20px_-8px_rgba(225,29,72,.6)]" style={{ background: "linear-gradient(135deg, var(--cc-primary), var(--cc-primary-dark))" }}><Store className="size-6" /></div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cc-muted-text)]">Procurement</p>
            <h1 className="text-2xl font-bold leading-8 tracking-tight">Vendor Management</h1>
            <p className="text-[13px] text-[var(--cc-secondary-text)]">Vendors, bills and app logins for <span className="font-semibold text-[var(--cc-text)]">{activeLocation?.name || "all locations"}</span></p>
          </div>
        </div>
        <VendorLocationFilter />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="vendor-tabs rounded-[14px] border border-[var(--cc-border)] bg-white p-1 shadow-[0_1px_2px_rgba(20,14,10,.04)]">
          {TABS.map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => navigate({ search: { tab: value } })}
              className={`whitespace-nowrap rounded-[10px] px-3 py-2.5 text-center text-sm font-semibold transition-all duration-200 sm:px-4 ${tab === value ? "bg-[var(--cc-primary)] text-white shadow-[0_6px_16px_-6px_var(--cc-primary)]" : "text-[var(--cc-secondary-text)] hover:bg-[var(--cc-page)] hover:text-[var(--cc-text)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "suppliers" && <Button onClick={openCreate} className="h-11 w-full rounded-[12px] bg-[var(--cc-primary)] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_-10px_var(--cc-primary)] hover:bg-[var(--cc-primary-dark)] sm:w-auto"><Plus className="size-[18px]" /> Add Vendor</Button>}
      </div>

      {tab === "bills" || tab === "logins" ? <VendorBillsPanel tab={tab} /> : !activeLocationId || isAllLocations ? (
        <Card className="grid min-h-60 place-items-center rounded-[20px] border-[var(--cc-border)] bg-white"><EmptyState text="Select a single location to manage its vendors." /></Card>
      ) : (<>
      {tab === "menu" ? <MenuAssignmentsPanel vendors={vendors} activeLocationId={activeLocationId} menuItems={menuQuery.data || []} menuLoading={menuQuery.isLoading} /> : (<div className="grid gap-4 lg:grid-cols-[minmax(17rem,.8fr)_minmax(0,1.7fr)]">
        <Card className="rounded-[16px] border-[var(--cc-border)] bg-white">
          <CardHeader className="border-b border-[var(--cc-divider)] pb-4"><CardTitle className="flex items-center gap-2 text-[15px]">Vendors <span className="rounded-full bg-[var(--cc-page)] px-2 py-0.5 text-xs font-semibold text-[var(--cc-secondary-text)]">{vendors.length}</span></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cc-muted-text)]" /><Input className="h-11 rounded-[12px] border-[var(--cc-border)] pl-9" placeholder="Search vendor name or phone" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-11 w-full rounded-[12px] border-[var(--cc-border)]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Status</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent></Select>
            {vendorsQuery.isLoading ? <Loading /> : filtered.length === 0 ? <EmptyState text="No vendors found." /> : (
              <div className="max-h-[32rem] space-y-1.5 overflow-y-auto pr-1">
                {filtered.map((vendor) => <button type="button" key={vendor.id} onClick={() => setSelectedId(vendor.id)} className={`group flex w-full items-center gap-3 rounded-[14px] border p-3 text-left transition-all duration-200 ${selected?.id === vendor.id ? "border-[var(--cc-primary)]/30 bg-[var(--cc-primary-light)] shadow-[0_8px_20px_-12px_var(--cc-primary)]" : "border-transparent hover:border-[var(--cc-border)] hover:bg-[var(--cc-page)]"}`}>
                  <VendorAvatar name={vendor.vendorName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><span className="truncate text-[14px] font-semibold">{vendor.vendorName}</span><StatusPill active={vendor.isActive} /></div>
                    <p className="mt-0.5 truncate text-xs text-[var(--cc-secondary-text)]">{vendor.phoneNumber}{vendor.address ? ` · ${vendor.address}` : ""}</p>
                  </div>
                </button>)}
              </div>
            )}
          </CardContent>
        </Card>

        {selected ? <VendorDetail key={selected.id} vendor={selected} onEdit={openEdit} onToggle={() => statusMutation.mutate({ id: selected?.id, active: !selected?.isActive })} /> : (
          <Card className="grid min-h-80 place-items-center rounded-[20px] border-[var(--cc-border)] bg-white"><EmptyState text="Select a vendor to view details." /></Card>
        )}
      </div>
      )}
      {showForm && <VendorForm form={form} setForm={setForm} editing={editing} pending={saveMutation.isPending} lookup={lookup} onPhoneChange={() => setLookup(null)} onPhoneBlur={() => { if (!editing && form.phoneNumber.trim().length >= 10) lookupMutation.mutate(); }} onClose={() => setShowForm(false)} onSubmit={() => saveMutation.mutate()} />}
      </>)}
    </main>
  );
}

function VendorDetail({ vendor, onEdit, onToggle }) {
  return <Card className="rounded-[20px] border-[var(--cc-border)] bg-white shadow-[0_1px_2px_rgba(20,14,10,.04),0_12px_32px_-18px_rgba(20,14,10,.2)]">
    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b border-[var(--cc-divider)] pb-5">
      <div className="flex items-center gap-4">
        <VendorAvatar name={vendor.vendorName} size="lg" />
        <div className="min-w-0">
          <CardTitle className="truncate text-xl">{vendor.vendorName}</CardTitle>
          <div className="mt-1"><StatusPill active={vendor.isActive} /></div>
        </div>
      </div>
      <div className="flex gap-2"><Button variant="outline" className="rounded-[10px]" onClick={onEdit}>Edit</Button><Button variant="outline" className="rounded-[10px]" onClick={onToggle}>{vendor.isActive ? "Deactivate" : "Activate"}</Button></div>
    </CardHeader>
    <CardContent>
      <div className="grid gap-3 sm:grid-cols-3"><Info label="Phone" value={vendor.phoneNumber} /><Info label="Alternate phone" value={vendor.alternatePhoneNumber || "—"} /><Info label="Address" value={vendor.address || "—"} /></div>
    </CardContent>
  </Card>;
}

function MenuAssignmentsPanel({ vendors, activeLocationId, menuItems, menuLoading }) {
  const queryClient = useQueryClient();
  const [vendorId, setVendorId] = useState("");
  const [costItemId, setCostItemId] = useState(null);
  const [cost, setCost] = useState("");
  const vendor = vendors.find((item) => String(item.id) === vendorId) || vendors[0] || null;
  const assigned = vendor ? menuItems.filter((item) => String(item.vendorId) === String(vendor.id)) : [];
  const costItem = menuItems.find((item) => item.id === costItemId) || null;
  const costQuery = useQuery({
    queryKey: ["vendor-cost-history", vendor?.id, costItem?.id, activeLocationId],
    queryFn: () => getVendorCostHistory(vendor.id, costItem.id, activeLocationId),
    enabled: Boolean(vendor && costItem && activeLocationId),
  });
  const assignMutation = useMutation({
    mutationFn: ({ itemId, nextVendorId }) => patchMenuItemQuick(itemId, { vendorId: nextVendorId, fulfillmentType: nextVendorId ? "OUTSOURCED" : "SELF_PREPARED" }, activeLocationId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendor-menu", activeLocationId] }); toast.success("Menu assignment updated"); },
    onError: () => toast.error("Unable to update menu assignment"),
  });
  const costMutation = useMutation({
    mutationFn: () => setVendorCost(vendor.id, costItem.id, Number(cost), activeLocationId),
    onSuccess: () => {
      setCost("");
      queryClient.invalidateQueries({ queryKey: ["vendor-cost-history", vendor.id, costItem.id, activeLocationId] });
      toast.success("Vendor cost saved");
    },
    onError: () => toast.error("Unable to save vendor cost"),
  });
  function changeVendor(next) {
    setVendorId(next);
    setCostItemId(null);
    setCost("");
  }

  return <Card className="rounded-[20px] border-[var(--cc-border)] bg-white shadow-[0_1px_2px_rgba(20,14,10,.04),0_12px_32px_-18px_rgba(20,14,10,.2)]">
    <CardHeader className="space-y-4 border-b border-[var(--cc-divider)] pb-5">
      <div>
        <CardTitle className="text-lg">Menu items</CardTitle>
        <p className="mt-1 text-xs text-[var(--cc-secondary-text)]">Pick a vendor, assign the items they supply, then set each item's cost.</p>
      </div>
      {vendors.length === 0 ? null : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Select value={vendor ? String(vendor.id) : ""} onValueChange={changeVendor}>
            <SelectTrigger aria-label="Vendor" className="vendor-select-trigger h-11 w-full rounded-[12px] border-[var(--cc-border)]"><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent>{vendors.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.vendorName}</SelectItem>)}</SelectContent>
          </Select>
          <Badge variant="secondary" className="self-start sm:self-auto">{assigned.length} assigned</Badge>
        </div>
      )}
    </CardHeader>
    <CardContent className="p-4">
      {vendors.length === 0 ? <EmptyState text="Add a vendor first to assign menu items." /> : menuLoading ? <Loading /> : menuItems.length === 0 ? <EmptyState text="No menu items in this location." /> : (
        <div className="grid gap-2 md:grid-cols-2">
          {menuItems.map((item) => {
            const mine = vendor && String(item.vendorId) === String(vendor.id);
            const open = mine && costItem?.id === item.id;
            return (
              <div key={item.id} className={`rounded-[14px] border p-3 ${mine ? "border-[var(--cc-primary)]/25 bg-[var(--cc-primary-light)]/40" : "border-[var(--cc-border)] bg-[#FBF9F5]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-[var(--cc-secondary-text)]">{mine ? "Supplied by this vendor" : item.vendorId ? "Assigned to another vendor" : "In-house"}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {mine && <Button size="sm" variant="ghost" className="rounded-[10px]" onClick={() => { setCostItemId(open ? null : item.id); setCost(""); }}>{open ? "Hide cost" : "Cost"}</Button>}
                    <Button size="sm" variant={mine ? "outline" : "secondary"} className="rounded-[10px]" disabled={assignMutation.isPending} onClick={() => assignMutation.mutate({ itemId: item.id, nextVendorId: mine ? null : vendor.id })}>{mine ? "Unassign" : "Assign"}</Button>
                  </div>
                </div>
                {open && (
                  <div className="mt-3 space-y-2 border-t border-[var(--cc-divider)] pt-3">
                    <div className="flex gap-2">
                      <Input className="h-10 rounded-[10px]" type="number" min="0" step="0.01" placeholder="New cost (₹)" value={cost} onChange={(event) => setCost(event.target.value)} />
                      <Button className="h-10 rounded-[10px]" disabled={!cost || costMutation.isPending} onClick={() => costMutation.mutate()}>Save</Button>
                    </div>
                    {costQuery.data?.length ? costQuery.data.map((entry) => <div key={entry.id} className="flex justify-between rounded-[10px] bg-white px-3 py-2 text-sm"><span>₹{entry.costPrice}</span><span className="text-[var(--cc-secondary-text)]">{new Date(entry.effectiveFrom).toLocaleDateString()}</span></div>) : <p className="text-sm text-[var(--cc-muted-text)]">No cost history yet.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>;
}
function VendorForm({ form, setForm, editing, pending, lookup, onPhoneChange, onPhoneBlur, onClose, onSubmit }) {
  const linkedHere = Boolean(lookup?.supplierLinkedHere);
  const assignExisting = !editing && Boolean(lookup?.supplierExists) && !linkedHere;
  const loginOnly = !editing && Boolean(lookup?.loginExists) && !lookup?.supplierExists;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"><Card className="w-full max-w-lg rounded-[20px] border-[var(--cc-border)] bg-white"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{editing ? "Edit vendor" : "Add vendor"}</CardTitle><Button size="icon" variant="ghost" onClick={onClose}><X className="size-4" /></Button></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><Field label="Vendor name" required value={form.vendorName} onChange={(value) => setForm({ ...form, vendorName: value })} /><Field label="Phone number" required value={form.phoneNumber} onChange={(value) => { setForm({ ...form, phoneNumber: value }); onPhoneChange(); }} onBlur={onPhoneBlur} />
    {linkedHere && <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">This vendor is already added to this location.</div>}
    {assignExisting && <div className="rounded-[10px] border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-800"><b>{lookup.supplierName}</b> is already on Broand Bro. Assign them to this location. Their name, phone and address stay the same.</div>}
    {loginOnly && <div className="rounded-[10px] border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-800">This number already has a Broand Bro login. Give it access to this location from the App logins tab.</div>}<Field label="Alternate phone" value={form.alternatePhoneNumber} onChange={(value) => setForm({ ...form, alternatePhoneNumber: value })} /><div className="space-y-1"><Label>Address</Label><Textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending || linkedHere || !form.vendorName.trim() || !form.phoneNumber.trim()}>{pending && <Loader2 className="mr-2 size-4 animate-spin" />}{editing ? "Save changes" : assignExisting ? "Assign to this location" : "Create vendor"}</Button></div></form></CardContent></Card></div>;
}
function Field({ label, required, value, onChange, onBlur }) { return <div className="space-y-1"><Label>{label}{required && " *"}</Label><Input required={required} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} /></div>; }
function Info({ label, value }) { return <div className="rounded-[14px] border border-[var(--cc-border)] bg-[#FBF9F5] p-3.5"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cc-muted-text)]">{label}</p><p className="mt-1.5 break-words text-sm font-medium">{value}</p></div>; }
function vendorInitials(name = "") { return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "V"; }
function VendorAvatar({ name, size = "md" }) { return <div className={`grid shrink-0 place-items-center font-bold text-white shadow-[0_6px_14px_-6px_rgba(43,33,28,.6)] ${size === "lg" ? "size-14 rounded-[16px] text-lg" : "size-10 rounded-[12px] text-sm"}`} style={{ background: "linear-gradient(135deg, #2B211C, #5a463b)" }}>{vendorInitials(name)}</div>; }
function StatusPill({ active }) { return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-[var(--cc-success-bg)] text-[var(--cc-success)]" : "bg-[#F3F1EF] text-[var(--cc-muted-text)]"}`}><span className="size-1.5 rounded-full bg-current" />{active ? "Active" : "Inactive"}</span>; }
function EmptyState({ text }) { return <div className="flex flex-col items-center gap-3 py-10 text-center"><div className="grid size-12 place-items-center rounded-full bg-[var(--cc-page)]"><Store className="size-5 text-[var(--cc-muted-text)]" /></div><p className="text-sm text-[var(--cc-muted-text)]">{text}</p></div>; }
function Loading() { return <div className="flex items-center justify-center py-8 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Loading…</div>; }
