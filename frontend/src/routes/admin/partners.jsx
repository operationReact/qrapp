import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, CreditCard, Loader2, MapPin, Plus, Search, ShieldCheck, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleGuard } from "@/components/RoleGuard";
import { ROLE } from "@/lib/roles";
import { adminLocationsOptions, adminUsersOptions } from "@/query/options/management";
import {
  assignPartnerLocation, createPartner, getPartner, getPartnerLocations, getPartnerUsers,
  getPartners, addPartnerUser, createPartnerUser, invitePartnerUser, removePartnerLocation, setPartnerStatus,
  updatePartner, updatePartnerUser,
} from "@/services/partner-service";

export const Route = createFileRoute("/admin/partners")({
  component: () => <RoleGuard roles={[ROLE.SUPER_ADMIN]}><PartnersPage /></RoleGuard>,
});

const emptyForm = {
  partnerCode: "", legalName: "", displayName: "", primaryContactName: "",
  primaryContactEmail: "", primaryContactPhone: "", alternateContactPhone: "",
  businessType: "", registeredAddress: "", city: "", state: "", pincode: "",
  gstRegistered: false, gstin: "", pan: "", tan: "", fssai: "",
  accountHolderName: "", bankName: "", accountNumber: "", ifsc: "", upiId: "", logoUrl: "",
};

function apiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  return error?.message || fallback;
}

function PartnersPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const partnersQuery = useQuery({ queryKey: ["partners"], queryFn: getPartners });
  const selected = useQuery({ queryKey: ["partner", selectedId], queryFn: () => getPartner(selectedId), enabled: Boolean(selectedId) });
  const locations = useQuery({ queryKey: ["partner", selectedId, "locations"], queryFn: () => getPartnerLocations(selectedId), enabled: Boolean(selectedId) });
  const users = useQuery({ queryKey: ["partner", selectedId, "users"], queryFn: () => getPartnerUsers(selectedId), enabled: Boolean(selectedId) });
  const filtered = (partnersQuery.data || []).filter((partner) =>
    (!statusFilter || partner.status === statusFilter)
    && `${partner.displayName} ${partner.partnerCode} ${partner.primaryContactName}`.toLowerCase().includes(query.toLowerCase()));
  const save = useMutation({
    mutationFn: ({ id, payload }) => id ? updatePartner(id, payload) : createPartner(payload),
    onSuccess: (partner) => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      setSelectedId(partner.id); setFormOpen(false); setEditing(null);
      toast.success(editing ? "Partner updated." : "Partner created.");
    },
    onError: (error) => toast.error(error?.response?.status === 409 ? "Partner code is already in use." : apiErrorMessage(error, "Unable to save partner.")),
  });
  const status = useMutation({
    mutationFn: ({ id, value }) => setPartnerStatus(id, value),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["partners"] }); queryClient.invalidateQueries({ queryKey: ["partner", selectedId] }); toast.success("Partner status updated."); },
    onError: () => toast.error("Unable to update partner status."),
  });
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = () => { setEditing(selected.data); setFormOpen(true); };
  return <main className={`partner-admin-page admin-control-center mx-auto min-h-screen w-full max-w-[1440px] space-y-5 bg-[var(--cc-page)] p-4 pb-10 text-[var(--cc-text)] md:p-6 ${selectedId ? "partner-selected" : ""}`}>
    <div className="partner-page-header flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--cc-primary)]">Partner network</p><h1 className="mt-1 text-2xl font-bold tracking-[-0.03em]">Partners</h1><p className="mt-1 text-[13px] text-[var(--cc-secondary-text)]">Manage business partners, compliance and location relationships.</p></div>    <Button onClick={openCreate} className="partner-add-button h-11 rounded-[10px] bg-[var(--cc-primary)] text-white hover:bg-[var(--cc-primary-dark)]"><Plus className="size-4" /> Add Partner</Button></div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(17rem,.8fr)_minmax(0,1.7fr)]">
      <Card className={`rounded-[16px] border-[var(--cc-border)] bg-white ${selectedId ? "hidden lg:block" : ""}`}><CardHeader><CardTitle className="text-[15px]">Partner directory <span className="text-xs font-normal text-[var(--cc-muted-text)]">({filtered.length})</span></CardTitle></CardHeader><CardContent className="space-y-3"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cc-muted-text)]" /><Input className="h-11 pl-9" placeholder="Search partner or code" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select className="h-10 w-full rounded-lg border px-2 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>{partnersQuery.isLoading ? <Loading /> : filtered.length ? <div className="space-y-2">{filtered.map((partner) => <button type="button" key={partner.id} onClick={() => setSelectedId(partner.id)} className={`w-full rounded-[14px] border p-3 text-left ${selectedId === partner.id ? "border-[var(--cc-primary)] bg-[var(--cc-primary-light)]" : "border-[var(--cc-border)] hover:bg-[var(--cc-page)]"}`}><div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{partner.displayName}</span><Badge variant={partner.status === "ACTIVE" ? "default" : "secondary"}>{partner.status}</Badge></div><p className="mt-1 text-xs text-[var(--cc-secondary-text)]">{partner.partnerCode} · {partner.locationCount} locations</p></button>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">No partners found.</p>}</CardContent></Card>
      {selected.data ? <PremiumPartnerDetail partner={selected.data} locations={locations.data || []} users={users.data || []} locationsLoading={locations.isLoading} onBack={() => setSelectedId(null)} onEdit={openEdit} onToggle={() => status.mutate({ id: selected.data.id, value: selected.data.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })} /> : <Card className="hidden min-h-80 place-items-center rounded-[16px] border-[var(--cc-border)] bg-white lg:grid"><p className="text-sm text-[var(--cc-muted-text)]">Select a partner to view details.</p></Card>}
    </div>
    {formOpen && <PartnerForm initial={editing} pending={save.isPending} onClose={() => setFormOpen(false)} onSubmit={(payload) => save.mutate({ id: editing?.id, payload })} />}
  </main>;
}

function PremiumPartnerDetail({ partner, locations, users, locationsLoading, onBack, onEdit, onToggle }) {
  const queryClient = useQueryClient();
  const available = useQuery({ ...adminLocationsOptions({ status: "ACTIVE" }), enabled: Boolean(partner.id) });
  const [tab, setTab] = useState("overview");
  const [locationId, setLocationId] = useState("");
  const [relationshipType, setRelationshipType] = useState("PRIMARY");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userStatus, setUserStatus] = useState("");
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [credentialResult, setCredentialResult] = useState(null);
  const [newUser, setNewUser] = useState({ name: "", phone: "", role: "PARTNER_USER" });
  const assign = useMutation({ mutationFn: () => assignPartnerLocation(partner.id, { locationId: Number(locationId), relationshipType, effectiveFrom: effectiveFrom || null, effectiveTo: effectiveTo || null }), onSuccess: () => { setLocationId(""); setEffectiveFrom(""); setEffectiveTo(""); queryClient.invalidateQueries({ queryKey: ["partner", partner.id, "locations"] }); queryClient.invalidateQueries({ queryKey: ["partners"] }); toast.success("Location assigned."); }, onError: (error) => toast.error(apiErrorMessage(error, "Unable to assign location.")) });
  const remove = useMutation({ mutationFn: (id) => removePartnerLocation(partner.id, id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["partner", partner.id, "locations"] }); queryClient.invalidateQueries({ queryKey: ["partners"] }); toast.success("Location assignment deactivated."); }, onError: () => toast.error("Unable to remove assignment.") });
  const toggleUser = useMutation({ mutationFn: ({ id, active }) => updatePartnerUser(partner.id, id, { active }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner", partner.id, "users"] }), onError: () => toast.error("Unable to update user association.") });
  const inviteUser = useMutation({ mutationFn: (id) => invitePartnerUser(partner.id, id), onSuccess: (data) => setCredentialResult({ ...data, issuedAt: new Date(), reset: true }), onError: (error) => toast.error(apiErrorMessage(error, "Unable to reset credentials.")) });
  const createUser = useMutation({ mutationFn: () => createPartnerUser(partner.id, newUser), onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ["partner", partner.id, "users"] }); setCreateUserOpen(false); setNewUser({ name: "", phone: "", role: "PARTNER_USER" }); setCredentialResult({ ...data, issuedAt: new Date() }); }, onError: (error) => toast.error(apiErrorMessage(error, "Unable to create user.")) });
  const filteredUsers = users.filter((user) => `${user.name || ""} ${user.phone || ""}`.toLowerCase().includes(userSearch.toLowerCase()) && (!userStatus || (userStatus === "ACTIVE" ? user.active : !user.active)));
  const activeLocations = locations.filter((location) => location.status === "ACTIVE");
  const activeUsers = users.filter((user) => user.active);
  const details = [
    ["Contact", partner.primaryContactName],
    ["Email", partner.primaryContactEmail],
    ["Phone", partner.primaryContactPhone],
    ["Business", partner.businessType || "Not specified"],
    ["Address", [partner.registeredAddress, partner.city, partner.state, partner.pincode].filter(Boolean).join(", ") || "Not specified"],
    ["GST / PAN", `${partner.gstin || "GST not provided"} · ${partner.pan || "PAN not provided"}`],
  ];
  return <Card className="partner-detail-card overflow-hidden rounded-[24px] border-0 bg-white shadow-[0_18px_60px_rgba(51,38,65,.10)]"><div className="partner-detail-hero relative overflow-hidden px-5 py-6 text-white md:px-7"><Button className="relative z-10 mb-5 px-0 text-white/70 hover:bg-transparent hover:text-white lg:hidden" variant="ghost" onClick={onBack}>← All partners</Button><div className="relative z-10 flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className="partner-brand-lockup grid size-14 shrink-0 place-items-center rounded-2xl bg-white p-1 shadow-[0_10px_24px_rgba(0,0,0,.18)]">{partner.logoUrl ? <img src={partner.logoUrl} alt="" className="size-full rounded-xl object-contain" /> : <Building2 className="size-7 text-[#302238]" />}</div><div className="min-w-0"><p className="truncate text-xl font-bold">{partner.displayName}</p><p className="truncate text-sm text-white/70">{partner.legalName} · {partner.partnerCode}</p></div></div><div className="partner-action-row flex gap-2"><Button variant="secondary" className="rounded-xl bg-white/15 text-white hover:bg-white/25" onClick={onEdit}>Edit</Button><Button variant="secondary" className="rounded-xl bg-white text-[#302238] hover:bg-white/90" onClick={onToggle}>{partner.status === "ACTIVE" ? "Deactivate" : "Activate"}</Button></div></div><div className="mt-6 flex items-center gap-2 text-sm text-white/80"><ShieldCheck className="size-4" /> Partner account <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs font-semibold text-emerald-100">{partner.status}</span></div>  </div><div className="partner-kpi-strip grid grid-cols-3 gap-px border-b bg-[var(--cc-border)]"><Metric icon={MapPin} label="Locations" value={activeLocations.length} /><Metric icon={Users} label="Active users" value={activeUsers.length} /><Metric icon={CreditCard} label="Compliance" value={partner.gstin ? "GSTIN" : "Pending"} /></div><div className="partner-detail-tabs flex gap-1 overflow-x-auto border-b bg-white px-4 py-3 md:px-7"><Tab active={tab === "overview"} onClick={() => setTab("overview")}>Overview</Tab><Tab active={tab === "locations"} onClick={() => setTab("locations")}>Locations <span>{activeLocations.length}</span></Tab><Tab active={tab === "users"} onClick={() => setTab("users")}>Users <span>{users.length}</span></Tab></div>      <CardContent className="partner-detail-content p-4 md:p-7">{tab === "overview" && <div className="partner-overview-grid grid gap-3 md:grid-cols-2">{details.map(([label, value]) => <Info key={label} label={label} value={value} />)}</div>  }{tab === "locations" && <section className="partner-location-section space-y-4"><div><h2 className="font-semibold">Location assignments</h2><p className="text-sm text-muted-foreground">Manage active and historical partner relationships.</p></div><div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]"><select className="h-11 min-w-0 rounded-xl border px-3 text-sm" value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Assign active location</option>{(available.data || []).filter((item) => !locations.some((link) => link.locationId === item.id && link.status === "ACTIVE")).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="h-11 rounded-xl border px-3 text-sm" value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)}><option value="PRIMARY">Primary</option><option value="SECONDARY">Secondary</option></select><Input type="date" aria-label="Effective from" className="h-11 rounded-xl" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /><Button className="h-11 rounded-xl" disabled={!locationId || assign.isPending} onClick={() => assign.mutate()}>Assign</Button></div>{effectiveFrom && <Input type="date" aria-label="Effective to" className="h-11 rounded-xl" value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} />}{locationsLoading ? <Loading /> : activeLocations.length ? <div className="grid gap-3 sm:grid-cols-2">{activeLocations.map((link) => <div key={link.id} className="rounded-2xl border bg-[var(--cc-page)] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{link.locationName}</p><p className="mt-1 text-xs text-muted-foreground">{link.relationshipType} · Active</p></div><MapPin className="size-4 text-[var(--cc-primary)]" /></div><Button variant="outline" size="sm" className="mt-4 rounded-lg" onClick={() => remove.mutate(link.id)}>Deactivate</Button></div>)}</div> : <Empty text="No locations assigned." />}</section>}{tab === "users" && <section className="space-y-4">  <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Partner users</h2><p className="text-sm text-muted-foreground">Create access with temporary credentials.</p></div><Button className="shrink-0 rounded-xl" onClick={() => setCreateUserOpen(true)}>New user</Button></div>{credentialResult && <CredentialPanel data={credentialResult} onDismiss={() => setCredentialResult(null)} />}{createUserOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1e1725]/55 p-3 sm:items-center sm:p-6"><div className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-2xl"><div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold">Create Partner user</h3><p className="mt-1 text-sm text-muted-foreground">A temporary password will be generated.</p></div><Button type="button" size="icon" variant="ghost" className="shrink-0 rounded-xl" onClick={() => setCreateUserOpen(false)}><X className="size-4" /></Button></div><div className="space-y-3"><Field label="Full name" required value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} /><Field label="Phone number" required value={newUser.phone} onChange={(event) => setNewUser({ ...newUser, phone: event.target.value })} />  <div className="space-y-2"><span className="text-xs font-semibold">Partner role</span><div className="grid grid-cols-2 gap-2"><button type="button" className={`rounded-xl border px-3 py-3 text-left text-sm ${newUser.role === "PARTNER_USER" ? "border-[var(--cc-primary)] bg-[var(--cc-primary-light)] text-[var(--cc-primary)]" : "bg-white"}`} onClick={() => setNewUser({ ...newUser, role: "PARTNER_USER" })}><span className="block font-semibold">Partner user</span><span className="mt-1 block text-xs text-muted-foreground">View access</span></button><button type="button" className={`rounded-xl border px-3 py-3 text-left text-sm ${newUser.role === "PARTNER_ADMIN" ? "border-[var(--cc-primary)] bg-[var(--cc-primary-light)] text-[var(--cc-primary)]" : "bg-white"}`} onClick={() => setNewUser({ ...newUser, role: "PARTNER_ADMIN" })}><span className="block font-semibold">Partner admin</span><span className="mt-1 block text-xs text-muted-foreground">Manage access</span></button></div></div></div><div className="mt-6 grid grid-cols-2 gap-2"><Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setCreateUserOpen(false)}>Cancel</Button><Button className="h-11 rounded-xl" disabled={!newUser.name || !newUser.phone || createUser.isPending} onClick={() => createUser.mutate()}>{createUser.isPending ? "Creating..." : "Create user"}</Button></div></div></div>}<div className="grid gap-2 md:grid-cols-[1fr_auto]"><Input className="h-11 rounded-xl" placeholder="Search name or phone" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />  <UserStatusFilter value={userStatus} onChange={setUserStatus} /></div>{filteredUsers.length ? <div className="grid gap-3">{filteredUsers.map((user) =>   <div key={user.id} className="partner-user-card flex flex-wrap items-center gap-3 rounded-2xl border bg-[var(--cc-page)] p-4"><div className="grid size-10 place-items-center rounded-xl bg-white text-[var(--cc-primary)]"><Users className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{user.name || "Unnamed user"}</p><p className="text-xs text-muted-foreground">{user.phone} · {user.active ? "Active" : "Inactive"}</p></div><Button variant="outline" size="sm" className="rounded-lg" onClick={() => toggleUser.mutate({ id: user.userId, active: !user.active })}>{user.active ? "Deactivate" : "Activate"}</Button>{user.active && <Button size="sm" className="rounded-lg" onClick={() => inviteUser.mutate(user.userId)} disabled={inviteUser.isPending}>Reset credentials</Button>}</div>)}</div> : <Empty text="No associated users." />}</section>}</CardContent></Card>;
}

function Metric({ icon, label, value }) {
  const Icon = icon;
  return <div className="partner-metric flex items-center gap-2 bg-white px-3 py-4 md:px-5"><Icon className="size-4 text-[var(--cc-primary)]" /><div><p className="text-lg font-bold">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div></div>;
}

function Tab({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`partner-tab whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold ${active ? "bg-[var(--cc-primary-light)] text-[var(--cc-primary)]" : "text-muted-foreground hover:bg-[var(--cc-page)]"}`}>{children}</button>;
}

function Empty({ text }) {
  return <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function UserStatusFilter({ value, onChange }) {
  return <Select value={value || "ALL"} onValueChange={(next) => onChange(next === "ALL" ? "" : next)}>
    <SelectTrigger className="h-11 w-full rounded-xl border-[#eadfd8] bg-white px-3 text-sm md:w-auto"><SelectValue placeholder="All users" /></SelectTrigger>
    <SelectContent><SelectItem value="ALL">All users</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent>
  </Select>;
}

function CredentialPanel({ data, onDismiss }) {
  const copy = async (value, label) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied.`);
  };
  return <div className="partner-credential-panel rounded-2xl border p-4">
    <div className="flex items-start justify-between gap-3">
      <div><p className="font-semibold">{data.reset ? "Credentials reset" : "Temporary credentials ready"}</p><p className="mt-1 text-xs text-muted-foreground">These stay valid until the user changes the password or credentials are reset again.</p></div>
      <button type="button" className="text-xs font-semibold text-muted-foreground hover:text-[var(--cc-primary)]" onClick={onDismiss}>Dismiss</button>
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <button type="button" className="rounded-xl border bg-white p-3 text-left" onClick={() => copy(data.phone, "Phone")}><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone</span><code className="mt-1 block text-sm font-semibold">{data.phone}</code></button>
      <button type="button" className="rounded-xl border bg-white p-3 text-left" onClick={() => copy(data.temporaryPassword, "Temporary password")}><span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Temporary password</span><code className="mt-1 block text-sm font-semibold">{data.temporaryPassword}</code></button>
    </div>
  </div>;
}

function PartnerDetail({ partner, locations, users, locationsLoading, onBack, onEdit, onToggle }) {
  const queryClient = useQueryClient();
  const available = useQuery({ ...adminLocationsOptions({ status: "ACTIVE" }), enabled: Boolean(partner.id) });
  const allUsers = useQuery(adminUsersOptions());
  const [locationId, setLocationId] = useState("");
  const [relationshipType, setRelationshipType] = useState("PRIMARY");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [userId, setUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userStatus, setUserStatus] = useState("");
  const assign = useMutation({ mutationFn: () => assignPartnerLocation(partner.id, { locationId: Number(locationId), relationshipType, effectiveFrom: effectiveFrom || null, effectiveTo: effectiveTo || null }), onSuccess: () => { setLocationId(""); setEffectiveFrom(""); setEffectiveTo(""); queryClient.invalidateQueries({ queryKey: ["partner", partner.id, "locations"] }); queryClient.invalidateQueries({ queryKey: ["partners"] }); toast.success("Location assigned."); }, onError: (error) => toast.error(error?.response?.data || "Unable to assign location.") });
  const remove = useMutation({ mutationFn: (id) => removePartnerLocation(partner.id, id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["partner", partner.id, "locations"] }); queryClient.invalidateQueries({ queryKey: ["partners"] }); toast.success("Location assignment deactivated."); }, onError: () => toast.error("Unable to remove assignment.") });
  const addUser = useMutation({ mutationFn: () => addPartnerUser(partner.id, Number(userId)), onSuccess: () => { setUserId(""); queryClient.invalidateQueries({ queryKey: ["partner", partner.id, "users"] }); toast.success("User associated."); }, onError: () => toast.error("Unable to associate user.") });
  const toggleUser = useMutation({ mutationFn: ({ id, active }) => updatePartnerUser(partner.id, id, { active }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner", partner.id, "users"] }), onError: () => toast.error("Unable to update user association.") });
  const inviteUser = useMutation({ mutationFn: (id) => invitePartnerUser(partner.id, id), onSuccess: (data) => toast.success(`Temporary credentials: ${data.phone} / ${data.temporaryPassword}`), onError: (error) => toast.error(error?.response?.data || "Unable to generate invitation.") });
  const filteredUsers = users.filter((user) => {
    const text = `${user.name || ""} ${user.phone || ""}`.toLowerCase();
    return text.includes(userSearch.toLowerCase()) && (!userStatus || (userStatus === "ACTIVE" ? user.active : !user.active));
  });
  return <Card className="min-w-0 rounded-[16px] border-[var(--cc-border)] bg-white"><CardHeader className="flex flex-wrap flex-row items-start justify-between gap-3"><Button className="w-full justify-start lg:hidden" variant="ghost" onClick={onBack}>← Back to partners</Button><div className="flex min-w-0 items-center gap-3"><div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--cc-primary-light)] text-[var(--cc-primary)]">{partner.logoUrl ? <img src={partner.logoUrl} alt="" className="size-full object-cover" /> : <Building2 className="size-6" />}</div><div className="min-w-0"><CardTitle className="truncate text-lg">{partner.displayName}</CardTitle><p className="text-xs text-muted-foreground">{partner.legalName} · {partner.partnerCode}</p></div></div><div className="flex shrink-0 gap-2"><Button variant="outline" onClick={onEdit}>Edit</Button><Button variant="outline" onClick={onToggle}>{partner.status === "ACTIVE" ? "Deactivate" : "Activate"}</Button></div></CardHeader><CardContent className="space-y-4"><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Info label="Contact" value={partner.primaryContactName} /><Info label="Email" value={partner.primaryContactEmail} /><Info label="Phone" value={partner.primaryContactPhone} /><Info label="Business" value={partner.businessType || "—"} /><Info label="Address" value={[partner.registeredAddress, partner.city, partner.state, partner.pincode].filter(Boolean).join(", ") || "—"} /><Info label="GST / PAN" value={`${partner.gstin || "GST not provided"} · ${partner.pan || "PAN not provided"}`} /></section>  <section className="hidden rounded-[14px] border border-[var(--cc-border)] p-4 lg:block"><h2 className="font-semibold">Banking</h2><div className="mt-3 grid gap-3 sm:grid-cols-3"><Info label="Account holder" value={partner.accountHolderName || "—"} /><Info label="Bank" value={partner.bankName || "—"} /><Info label="Account" value={partner.maskedAccountNumber || "—"} /><Info label="IFSC" value={partner.ifsc || "—"} /><Info label="UPI" value={partner.upiId || "—"} /></div></section><section className="rounded-[14px] border border-[var(--cc-border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Locations</h2><p className="text-xs text-muted-foreground">Historical assignments remain available.</p></div><div className="flex w-full gap-2 sm:w-auto">  <select className="h-10 min-w-0 flex-1 rounded-lg border px-2 text-sm sm:w-56" value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Assign active location</option>{(available.data || []).filter((item) => !locations.some((link) => link.locationId === item.id && link.status === "ACTIVE")).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="h-10 rounded-lg border px-2 text-sm" value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)}><option value="PRIMARY">Primary</option><option value="SECONDARY">Secondary</option></select><Button className="h-10" disabled={!locationId || assign.isPending} onClick={() => assign.mutate()}>Assign</Button>  </div></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><Input type="date" aria-label="Effective from" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /><Input type="date" aria-label="Effective to" value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} /></div>{locationsLoading ? <Loading /> : locations.length ? <div className="mt-3 space-y-2">{locations.map((link) => <div key={link.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--cc-page)] p-3"><div><p className="font-medium">{link.locationName}</p><p className="text-xs text-muted-foreground">{link.relationshipType} · {link.status} · from {link.effectiveFrom || "—"}</p></div>{link.status === "ACTIVE" &&   <Button variant="outline" size="sm" onClick={() => remove.mutate(link.id)}>Deactivate</Button>}</div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No locations assigned.</p>}</section>  <section className="rounded-[14px] border border-[var(--cc-border)] p-4"><div className="flex flex-wrap items-center justify-between gap-2">  <h2 className="font-semibold">Users</h2><div className="mt-2 flex flex-wrap gap-2"><Input className="h-10 min-w-0 flex-1" placeholder="Search name or phone" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} /><select className="h-10 rounded-lg border px-2 text-sm" value={userStatus} onChange={(event) => setUserStatus(event.target.value)}><option value="">All</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div><div className="flex w-full gap-2 sm:w-auto"><select className="h-10 min-w-0 flex-1 rounded-lg border px-2 text-sm sm:w-56" value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Associate existing user</option>{(allUsers.data || []).filter((item) => !users.some((user) => user.userId === item.id)).map((item) => <option key={item.id} value={item.id}>{item.name || item.phone}</option>)}</select><Button className="h-10" disabled={!userId || addUser.isPending} onClick={() => addUser.mutate()}>Add</Button></div>  </div>{filteredUsers.length ? <div className="mt-3 space-y-2">{filteredUsers.map((user) => <div key={user.id} className="flex items-center gap-2 rounded-lg bg-[var(--cc-page)] p-3"><Users className="size-4" /><span className="min-w-0 flex-1 truncate font-medium">{user.name || "Unnamed user"}</span><span className="text-xs text-muted-foreground">{user.phone} · {user.active ? "Active" : "Inactive"}</span>  <Button variant="ghost" size="sm" onClick={() => toggleUser.mutate({ id: user.userId, active: !user.active })}>{user.active ? "Deactivate" : "Activate"}</Button>{user.active && <Button variant="ghost" size="sm" onClick={() => inviteUser.mutate(user.userId)} disabled={inviteUser.isPending}>Invite</Button>}</div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No associated users.</p>}</section></CardContent></Card>;
}

function PartnerForm({ initial, pending, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({ ...emptyForm, ...(initial || {}), gstRegistered: Boolean(initial?.gstRegistered) }));
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"><Card className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[20px] bg-white"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>{initial ? "Edit partner" : "Add partner"}</CardTitle><p className="mt-1 text-xs text-muted-foreground">Sensitive banking values are never returned in full.</p></div><Button size="icon" variant="ghost" onClick={onClose}><X className="size-4" /></Button></CardHeader><CardContent><form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, gstRegistered: Boolean(form.gstRegistered) }); }}><Field label="Partner code" required value={form.partnerCode} onChange={set("partnerCode")} /><Field label="Display name" required value={form.displayName} onChange={set("displayName")} /><Field label="Legal name" required value={form.legalName} onChange={set("legalName")} /><Field label="Business type" value={form.businessType} onChange={set("businessType")} /><Field label="Contact name" required value={form.primaryContactName} onChange={set("primaryContactName")} /><Field label="Contact email" required type="email" value={form.primaryContactEmail} onChange={set("primaryContactEmail")} /><Field label="Contact phone" required value={form.primaryContactPhone} onChange={set("primaryContactPhone")} /><Field label="Alternate phone" value={form.alternateContactPhone} onChange={set("alternateContactPhone")} /><Field label="Registered address" value={form.registeredAddress} onChange={set("registeredAddress")} /><Field label="City" value={form.city} onChange={set("city")} /><Field label="State" value={form.state} onChange={set("state")} /><Field label="Pincode" value={form.pincode} onChange={set("pincode")} /><Field label="GSTIN" value={form.gstin} onChange={set("gstin")} /><Field label="PAN" value={form.pan} onChange={set("pan")} /><Field label="TAN" value={form.tan} onChange={set("tan")} /><Field label="FSSAI" value={form.fssai} onChange={set("fssai")} /><Field label="Account holder" value={form.accountHolderName} onChange={set("accountHolderName")} /><Field label="Bank" value={form.bankName} onChange={set("bankName")} /><Field label="Account number" type="password" value={form.accountNumber} onChange={set("accountNumber")} /><Field label="IFSC" value={form.ifsc} onChange={set("ifsc")} /><Field label="UPI ID" value={form.upiId} onChange={set("upiId")} /><Field label="Logo URL" value={form.logoUrl} onChange={set("logoUrl")} /><label className="flex h-11 items-center gap-2 text-sm"><input type="checkbox" checked={form.gstRegistered} onChange={(event) => setForm((current) => ({ ...current, gstRegistered: event.target.checked }))} /> GST registered</label><div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 size-4 animate-spin" />}{initial ? "Save changes" : "Create partner"}</Button></div></form></CardContent></Card></div>;
}

function Field({ label, required, type = "text", value, onChange }) { return <label className="space-y-1 text-xs font-semibold"><span>{label}{required ? " *" : ""}</span><Input required={required} type={type} value={value || ""} onChange={onChange} className="h-11 rounded-[10px] font-normal" /></label>; }
function Info({ label, value }) { return <div className="partner-info-card min-w-0 rounded-lg bg-[var(--cc-page)] p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{value}</p></div>; }
function Loading() { return <div className="flex justify-center py-8 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Loading…</div>; }
