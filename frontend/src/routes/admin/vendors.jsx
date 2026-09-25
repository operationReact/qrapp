import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Search, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { getMenu, patchMenuItemQuick } from "@/services/menu-service";
import {
  createVendor, getVendorCostHistory, getVendors, setVendorActive, setVendorCost, updateVendor,
} from "@/services/vendor-service";
import { ROLE } from "@/lib/roles";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/admin/vendors")({
  component: () => <RoleGuard roles={[ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER]}><VendorsPage /></RoleGuard>,
});

const emptyForm = { vendorName: "", phoneNumber: "", alternatePhoneNumber: "", address: "" };

function VendorsPage() {
  const queryClient = useQueryClient();
  const { activeLocation, activeLocationId, isAllLocations } = useActiveLocation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const vendorsQuery = useQuery({ queryKey: ["vendors"], queryFn: getVendors });
  const menuQuery = useQuery({
    queryKey: ["vendor-menu", activeLocationId],
    queryFn: () => getMenu({ locationId: activeLocationId }),
    enabled: Boolean(activeLocationId),
  });
  const vendors = useMemo(() => vendorsQuery.data || [], [vendorsQuery.data]);
  const selected = vendors.find((vendor) => vendor.id === selectedId) || vendors[0] || null;
  const filtered = useMemo(() => vendors.filter((vendor) => {
    const text = `${vendor.vendorName} ${vendor.phoneNumber} ${vendor.address || ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "ALL" || (status === "ACTIVE" ? vendor.isActive : !vendor.isActive));
  }), [vendors, query, status]);

  const saveMutation = useMutation({
    mutationFn: () => editing ? updateVendor(selected.id, form) : createVendor(form),
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setSelectedId(vendor.id);
      setShowForm(false);
      toast.success(editing ? "Vendor updated" : "Vendor created");
    },
    onError: (error) => toast.error(error.response?.status === 409 ? "That phone number is already in use" : "Unable to save vendor"),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, active }) => setVendorActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendors"] }),
    onError: () => toast.error("Unable to update vendor status"),
  });

  function openCreate() {
    setEditing(false);
    setForm(emptyForm);
    setShowForm(true);
  }
  function openEdit() {
    setEditing(true);
    setForm({
      vendorName: selected.vendorName || "",
      phoneNumber: selected.phoneNumber || "",
      alternatePhoneNumber: selected.alternatePhoneNumber || "",
      address: selected.address || "",
    });
    setShowForm(true);
  }

  return (
    <main className="admin-control-center mx-auto min-h-screen w-full max-w-[1440px] space-y-6 bg-[var(--cc-page)] p-4 pb-10 text-[var(--cc-text)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-8">Vendors</h1>
          <p className="mt-1 text-[13px] text-[var(--cc-secondary-text)]">Manage suppliers, assignments and costs.</p>
        </div>
        <Button onClick={openCreate} className="h-11 rounded-[10px] bg-[var(--cc-primary)] text-sm font-semibold text-white hover:bg-[var(--cc-primary-dark)]"><Plus className="size-[18px]" /> Add Vendor</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(17rem,.8fr)_minmax(0,1.7fr)]">
        <Card className="rounded-[16px] border-[var(--cc-border)] bg-white">
          <CardHeader className="border-b border-[var(--cc-divider)] pb-4"><CardTitle className="text-[15px]">Vendors <span className="text-xs font-normal text-[var(--cc-muted-text)]">({vendors.length})</span></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cc-muted-text)]" /><Input className="h-11 rounded-[10px] border-[var(--cc-border)] pl-9" placeholder="Search vendor name or phone" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
            <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-11 rounded-[10px] border-[var(--cc-border)] w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All Status</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent></Select>
            {vendorsQuery.isLoading ? <Loading /> : filtered.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No vendors found.</p> : (
              <div className="max-h-[32rem] space-y-2 overflow-y-auto">
                {filtered.map((vendor) => <button type="button" key={vendor.id} onClick={() => setSelectedId(vendor.id)} className={`w-full rounded-[16px] border p-4 text-left transition ${selected?.id === vendor.id ? "border-[var(--cc-primary)] bg-[var(--cc-primary-light)]" : "border-[var(--cc-border)] hover:bg-[var(--cc-page)]"}`}>
                  <div className="flex items-center justify-between gap-2"><span className="truncate text-[15px] font-semibold">{vendor.vendorName}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${vendor.isActive ? "bg-[var(--cc-success-bg)] text-[var(--cc-success)]" : "bg-[#F3F1EF] text-[var(--cc-muted-text)]"}`}>{vendor.isActive ? "Active" : "Inactive"}</span></div>
                  <p className="mt-1 truncate text-xs text-[var(--cc-secondary-text)]">{vendor.phoneNumber}{vendor.address ? ` · ${vendor.address}` : ""}</p>
                </button>)}
              </div>
            )}
          </CardContent>
        </Card>

        {selected ? <VendorDetail vendor={selected} activeLocation={activeLocation} activeLocationId={activeLocationId} isAllLocations={isAllLocations} menuItems={menuQuery.data || []} menuLoading={menuQuery.isLoading} onEdit={openEdit} onToggle={() => statusMutation.mutate({ id: selected.id, active: !selected.isActive })} /> : (
          <Card className="grid min-h-80 place-items-center rounded-[16px] border-[var(--cc-border)] bg-white"><p className="text-sm text-[var(--cc-muted-text)]">Select a vendor to view details.</p></Card>
        )}
      </div>
      {showForm && <VendorForm form={form} setForm={setForm} editing={editing} pending={saveMutation.isPending} onClose={() => setShowForm(false)} onSubmit={() => saveMutation.mutate()} />}
    </main>
  );
}

function VendorDetail({ vendor, activeLocation, activeLocationId, isAllLocations, menuItems, menuLoading, onEdit, onToggle }) {
  const [selectedItemId, setSelectedItemId] = useState("");
  const assigned = menuItems.filter((item) => String(item.vendorId) === String(vendor.id));
  const selectedItem = menuItems.find((item) => String(item.id) === selectedItemId) || assigned[0];
  const costQuery = useQuery({
    queryKey: ["vendor-cost-history", vendor.id, selectedItem?.id, activeLocationId],
    queryFn: () => getVendorCostHistory(vendor.id, selectedItem.id, activeLocationId),
    enabled: Boolean(selectedItem && activeLocationId),
  });
  const queryClient = useQueryClient();
  const [cost, setCost] = useState("");
  const assignMutation = useMutation({
    mutationFn: ({ itemId, vendorId }) => patchMenuItemQuick(itemId, { vendorId, fulfillmentType: vendorId ? "OUTSOURCED" : "SELF_PREPARED" }, activeLocationId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vendor-menu", activeLocationId] }); toast.success("Menu assignment updated"); },
    onError: () => toast.error("Unable to update menu assignment"),
  });
  const costMutation = useMutation({
    mutationFn: () => setVendorCost(vendor.id, selectedItem.id, Number(cost), activeLocationId),
    onSuccess: () => { setCost(""); queryClient.invalidateQueries({ queryKey: ["vendor-cost-history", vendor.id, selectedItem.id, activeLocationId] }); toast.success("Vendor cost saved"); },
    onError: () => toast.error("Unable to save vendor cost"),
  });
  return <Card className="rounded-[16px] border-[var(--cc-border)] bg-white">
    <CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-lg"><UserRound className="size-5" />{vendor.vendorName}</CardTitle><p className="mt-1 text-sm text-muted-foreground">Global vendor · serves multiple locations</p></div><div className="flex gap-2"><Button variant="outline" onClick={onEdit}>Edit</Button><Button variant="outline" onClick={onToggle}>{vendor.isActive ? "Deactivate" : "Activate"}</Button></div></CardHeader>
    <CardContent className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3"><Info label="Phone" value={vendor.phoneNumber} /><Info label="Alternate phone" value={vendor.alternatePhoneNumber || "—"} /><Info label="Address" value={vendor.address || "—"} /></div>
      <section className="rounded-[16px] border border-[var(--cc-border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Menu assignments</h2><p className="text-xs text-[var(--cc-secondary-text)]">{activeLocation ? `Managing ${activeLocation.name}` : "Select one location to manage assignments"}</p></div><Badge variant="secondary">{assigned.length} assigned</Badge></div>
        {isAllLocations ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Choose a specific location from the admin location selector to manage menu assignments and costs.</p> : menuLoading ? <Loading /> : <div className="mt-3 space-y-2">{menuItems.length === 0 ? <p className="text-sm text-muted-foreground">No menu items in this location.</p> : menuItems.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#FBF9F5] p-2.5"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.vendorId === vendor.id ? "Assigned to this vendor" : item.vendorId ? "Assigned to another vendor" : "In-house"}</p></div><Button size="sm" variant={item.vendorId === vendor.id ? "outline" : "secondary"} disabled={assignMutation.isPending} onClick={() => assignMutation.mutate({ itemId: item.id, vendorId: item.vendorId === vendor.id ? null : vendor.id })}>{item.vendorId === vendor.id ? "Unassign" : "Assign"}</Button></div>)}</div>}
      </section>
      <section className="rounded-[16px] border border-[var(--cc-border)] p-4"><div><h2 className="font-semibold">Vendor cost management</h2><p className="text-xs text-[var(--cc-secondary-text)]">Cost history is maintained per vendor and menu item.</p></div>{isAllLocations ? <p className="mt-4 text-sm text-[var(--cc-muted-text)]">Select a location to manage costs.</p> : <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]"><Select value={selectedItemId || (selectedItem ? String(selectedItem.id) : "")} onValueChange={setSelectedItemId}><SelectTrigger className="h-11 w-full rounded-[10px]"><SelectValue placeholder="Select menu item" /></SelectTrigger><SelectContent>{menuItems.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select><div className="flex gap-2"><Input className="h-11 rounded-[10px]" type="number" min="0" step="0.01" placeholder="Cost (₹)" value={cost} onChange={(event) => setCost(event.target.value)} /><Button className="h-11 rounded-[10px]" disabled={!selectedItem || !cost || costMutation.isPending} onClick={() => costMutation.mutate()}>Save cost</Button></div></div>}{selectedItem && !isAllLocations && <div className="mt-3 space-y-1">{costQuery.data?.length ? costQuery.data.map((entry) => <div key={entry.id} className="flex justify-between rounded-[10px] bg-[var(--cc-page)] px-3 py-2 text-sm"><span>₹{entry.costPrice}</span><span className="text-[var(--cc-secondary-text)]">{new Date(entry.effectiveFrom).toLocaleDateString()}</span></div>) : <p className="mt-3 text-sm text-[var(--cc-muted-text)]">No cost history for this item.</p>}</div>}</section>
    </CardContent>
  </Card>;
}

function VendorForm({ form, setForm, editing, pending, onClose, onSubmit }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"><Card className="w-full max-w-lg rounded-[20px] border-[var(--cc-border)] bg-white"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{editing ? "Edit vendor" : "Add vendor"}</CardTitle><Button size="icon" variant="ghost" onClick={onClose}><X className="size-4" /></Button></CardHeader><CardContent><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><Field label="Vendor name" required value={form.vendorName} onChange={(value) => setForm({ ...form, vendorName: value })} /><Field label="Phone number" required value={form.phoneNumber} onChange={(value) => setForm({ ...form, phoneNumber: value })} /><Field label="Alternate phone" value={form.alternatePhoneNumber} onChange={(value) => setForm({ ...form, alternatePhoneNumber: value })} /><div className="space-y-1"><Label>Address</Label><Textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending || !form.vendorName.trim() || !form.phoneNumber.trim()}>{pending && <Loader2 className="mr-2 size-4 animate-spin" />}{editing ? "Save changes" : "Create vendor"}</Button></div></form></CardContent></Card></div>;
}
function Field({ label, required, value, onChange }) { return <div className="space-y-1"><Label>{label}{required && " *"}</Label><Input required={required} value={value} onChange={(event) => onChange(event.target.value)} /></div>; }
function Info({ label, value }) { return <div className="rounded-lg bg-[#FBF9F5] p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{value}</p></div>; }
function Loading() { return <div className="flex items-center justify-center py-8 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Loading…</div>; }
