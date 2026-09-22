import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, Building2, Check, KeyRound, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { ROLE } from "@/lib/roles";
import { adminCustomerCompaniesOptions, adminLocationsOptions, adminUsersOptions, assignCustomerCompany, createManagementResource, grantUserLocation, locationCustomerCompaniesOptions, removeCustomerCompany, revokeUserLocation, updateCustomerCompany, updateUserRole, userLocationsOptions } from "@/query/options/management";

const links = [
  { to: "/admin/control-center", label: "Overview", icon: ShieldCheck },
  { to: "/admin/control-center/users", label: "Users", icon: Users },
  { to: "/admin/control-center/locations", label: "Locations", icon: Building2 },
  { to: "/admin/control-center/customer-companies", label: "Customer Companies", icon: Building2 },
  { to: "/admin/control-center/access", label: "Access Management", icon: KeyRound },
];

function Shell({ title, description, children }) {
  const { pathname } = useLocation();
  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="rounded-3xl bg-zinc-950 px-5 py-6 text-white shadow-xl sm:px-8">
      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">Super Admin Workspace</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">{description}</p>
    </div>
    <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm sm:grid-cols-5" aria-label="Super Admin control center">
      {links.map(({ to, label }) => <Link key={to} to={to} className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-center text-sm font-semibold transition ${pathname === to ? "bg-zinc-950 text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"}`}>{label}</Link>)}
    </nav>
    {children}
  </main>;
}

function ErrorState({ error }) { return error ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load this data. {error.message}</p> : null; }
function Items({ items, empty = "No records found." }) {
  if (!items?.length) return <p className="py-8 text-center text-sm text-zinc-500">{empty}</p>;
  return <div className="grid gap-3 sm:grid-cols-2">{items.map((item, index) => <Card key={item.id ?? index} size="sm"><CardContent className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate font-semibold text-zinc-900">{item.name || item.email || item.username || item.title || `Record ${index + 1}`}</p><p className="truncate text-xs text-zinc-500">{item.email || item.code || item.description || item.status || "Active"}</p></div><span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase text-zinc-500">{item.role || item.type || "Active"}</span></CardContent></Card>)}</div>;
}

export function ControlCenterOverview() {
  const { data: users = [] } = useQuery(adminUsersOptions());
  const { data: locations = [] } = useQuery(adminLocationsOptions());
  const cards = [
    { to: "/admin/control-center/users", title: "Users", count: users.length, icon: Users, text: "Manage administrator access" },
    { to: "/admin/control-center/locations", title: "Locations", count: locations.length, icon: Building2, text: "Create and manage operating locations" },
    { to: "/admin/control-center/customer-companies", title: "Customer Companies", count: "—", icon: Building2, text: "Manage companies and assignments" },
    { to: "/admin/control-center/access", title: "Access Management", count: "—", icon: KeyRound, text: "Manage roles and location access" },
  ];
  return <Shell title="Control Center" description="One workspace for platform access, locations, and Customer Company operations.">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => {
      const CardIcon = card.icon;
      return <Link key={card.to} to={card.to}><Card className="h-full border-zinc-200 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"><CardHeader><CardTitle className="flex items-center justify-between text-base"><span>{card.title}</span><CardIcon className="size-5 text-primary" /></CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-zinc-950">{card.count}</p><p className="mt-2 text-sm text-zinc-500">{card.text} <ArrowRight className="inline size-4" /></p></CardContent></Card></Link>;
    })}</div>
  </Shell>;
}

export function ControlCenterUsers() {
  const { data = [], isLoading, error } = useQuery(adminUsersOptions());
  return <Shell title="Users" description="Review administrator accounts and manage access from the Access Management screen."><Card><CardHeader><CardTitle>Administrator accounts</CardTitle></CardHeader><CardContent>{isLoading ? <p className="text-sm text-zinc-500">Loading users…</p> : <Items items={data} />}{<ErrorState error={error} />}</CardContent></Card></Shell>;
}

export function ControlCenterLocations() {
  const { data = [], isLoading, error } = useQuery(adminLocationsOptions());
  const { activeLocation } = useActiveLocation();
  const [form, setForm] = useState({ name: "", code: "", address: "" });
  const queryClient = useQueryClient();
  const generatedCode = `LOC-${form.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")}-001`;
  const mutation = useMutation({
    mutationFn: () => createManagementResource("/api/admin/locations", { ...form, name: form.name.trim(), code: (form.code.trim() || generatedCode), address: form.address.trim(), active: true }),
    onSuccess: () => { setForm({ name: "", code: "", address: "" }); queryClient.invalidateQueries({ queryKey: ["admin", "locations"] }); },
  });
  const apiError = mutation.error?.response?.status === 409
    ? "A location with this code already exists."
    : mutation.error?.response?.status === 403
      ? "Only a Super Admin can add locations."
      : mutation.error?.response?.data?.message || mutation.error?.response?.data || mutation.error?.message;
  return <Shell title="Locations" description="Create operating locations and make them available to registration, access management, and company assignments.">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,.9fr)]">
      <Card className="border-zinc-200 shadow-sm"><CardHeader><CardTitle>Add a location</CardTitle><p className="text-sm text-zinc-500">Use a unique code that remains stable for integrations.</p></CardHeader><CardContent>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (form.name.trim() && (form.code.trim() || generatedCode)) mutation.mutate(); }}>
          <Input className="min-h-11" required placeholder="Location name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, code: current.code || `LOC-${event.target.value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")}-001` }))} />
          <Input className="min-h-11" required placeholder="Location code" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
          <Input className="min-h-11 sm:col-span-2" placeholder="Address (optional)" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          <Button type="submit" className="min-h-11 sm:col-span-2" disabled={mutation.isPending}>{mutation.isPending ? "Adding location…" : "Add location"}</Button>
        </form>
        {apiError && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{apiError}</p>}
      </CardContent></Card>
      <Card className="border-zinc-200 bg-primary/5 shadow-sm"><CardHeader><CardTitle>Current location</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-zinc-950">{activeLocation?.name || "Not selected"}</p><p className="mt-2 text-sm text-zinc-600">Use the location selector to change the active operating context.</p></CardContent></Card>
    </div>
    <Card className="border-zinc-200 shadow-sm"><CardHeader><CardTitle>Configured locations</CardTitle></CardHeader><CardContent>{isLoading ? <p className="text-sm text-zinc-500">Loading locations…</p> : <Items items={data} empty="No locations are configured." />}<ErrorState error={error} /></CardContent></Card>
  </Shell>;
}

export function CustomerCompanies() {
  const { data: companies = [], isLoading: companiesLoading, error: companiesError } = useQuery(adminCustomerCompaniesOptions());
  const { data: locations = [], isLoading: locationsLoading, error: locationsError } = useQuery(adminLocationsOptions());
  const [name, setName] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [feedback, setFeedback] = useState(null);
  const queryClient = useQueryClient();
  const assignedQuery = useQuery(locationCustomerCompaniesOptions(selectedLocationId));
  const assignedIds = new Set((assignedQuery.data || []).map((company) => String(company.id)));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "customer-companies"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "locations", selectedLocationId, "customer-companies"] });
  };
  const createMutation = useMutation({
    mutationFn: () => createManagementResource("/api/admin/customer-companies", { name: name.trim(), active: true }),
    onSuccess: () => { setName(""); setFeedback({ type: "success", text: "Customer Company added." }); refresh(); },
    onError: (error) => setFeedback({ type: "error", text: error.message || "Unable to add Customer Company." }),
  });
  const companyMutation = useMutation({
    mutationFn: ({ company, name, active }) => updateCustomerCompany(company.id, { name, active }),
    onSuccess: refresh,
    onError: (error) => setFeedback({ type: "error", text: error.message || "Unable to update Customer Company." }),
  });
  const mappingMutation = useMutation({
    mutationFn: ({ companyId, assigned }) => assigned
      ? removeCustomerCompany(selectedLocationId, companyId)
      : assignCustomerCompany(selectedLocationId, companyId),
    onSuccess: refresh,
    onError: (error) => setFeedback({ type: "error", text: error.message || "Unable to update the location assignment." }),
  });

  return <Shell title="Customer Companies" description="Manage active companies and assign them to existing operating locations.">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
      <Card><CardHeader><CardTitle>Add Customer Company</CardTitle></CardHeader><CardContent>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (name.trim()) createMutation.mutate(); }}>
          <Input className="min-h-11" required placeholder="Customer Company name" value={name} onChange={(event) => setName(event.target.value)} />
          <Button className="min-h-11" disabled={createMutation.isPending}>Add</Button>
        </form>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Location</CardTitle></CardHeader><CardContent>
        <select className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm" value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)}>
          <option value="">Select a location</option>
          {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
        {selectedLocationId && <p className="mt-2 text-xs text-zinc-500">{assignedQuery.isLoading ? "Loading assignments…" : `${assignedIds.size} assigned`}</p>}
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Customer Companies</CardTitle></CardHeader><CardContent className="space-y-2">
      {(companiesLoading || locationsLoading) && <p className="text-sm text-zinc-500">Loading…</p>}
      {companies.map((company) => <div key={company.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3">
        <div><p className="font-semibold">{company.name}</p><p className="text-xs text-zinc-500">{company.active ? "Active" : "Inactive"}</p></div>
        <div className="flex items-center gap-2">
          {selectedLocationId && <Button variant="outline" size="sm" disabled={!company.active || mappingMutation.isPending} onClick={() => mappingMutation.mutate({ companyId: company.id, assigned: assignedIds.has(String(company.id)) })}>{assignedIds.has(String(company.id)) ? "Remove from Location" : "Assign to Location"}</Button>}
          {editingId === company.id ? <Button size="sm" disabled={companyMutation.isPending} onClick={() => { if (editingName.trim()) companyMutation.mutate({ company, name: editingName.trim(), active: company.active }); setEditingId(null); }}>Save</Button> : <Button variant="outline" size="sm" onClick={() => { setEditingId(company.id); setEditingName(company.name); }}>Edit</Button>}
          <Button variant="outline" size="sm" disabled={companyMutation.isPending} onClick={() => companyMutation.mutate({ company, name: company.name, active: !company.active })}>{company.active ? "Deactivate" : "Activate"}</Button>
        </div>
        {editingId === company.id && <Input className="min-h-9 w-full" value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-label={`Edit ${company.name}`} />}
      </div>)}
      {!companies.length && !companiesLoading && <p className="py-6 text-sm text-zinc-500">No Customer Companies found.</p>}
      <ErrorState error={companiesError || locationsError || assignedQuery.error || createMutation.error || companyMutation.error || mappingMutation.error} />
      {feedback && <p role="status" className={feedback.type === "error" ? "text-sm text-red-700" : "text-sm text-emerald-700"}>{feedback.text}</p>}
    </CardContent></Card>
  </Shell>;
}

export function ControlCenterAccess() {
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery(adminUsersOptions());
  const { data: locations = [], isLoading: locationsLoading, error: locationsError } = useQuery(adminLocationsOptions());
  const [selectedId, setSelectedId] = useState(null);
  const selectedUser = users.find((item) => String(item.id) === String(selectedId)) || users[0];
  const assignedQuery = useQuery(userLocationsOptions(selectedUser?.id));
  const [role, setRole] = useState(ROLE.CUSTOMER);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!selectedUser) return;
    const timer = window.setTimeout(() => {
      setSelectedId(selectedUser.id);
      setRole(selectedUser.role || ROLE.CUSTOMER);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedUser]);
  useEffect(() => {
    const timer = window.setTimeout(() => setSelectedLocations((assignedQuery.data || []).map((item) => String(item.id))), 0);
    return () => window.clearTimeout(timer);
  }, [assignedQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const before = new Set((assignedQuery.data || []).map((item) => String(item.id)));
      const after = new Set(selectedLocations);
      await updateUserRole(selectedUser.id, { role });
      await Promise.all([
        [...after].filter((id) => !before.has(id)).map((id) => grantUserLocation(selectedUser.id, id)),
        [...before].filter((id) => !after.has(id)).map((id) => revokeUserLocation(selectedUser.id, id)),
      ].flat());
    },
    onSuccess: async () => {
      setFeedback({ type: "success", text: "Access saved." });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users", selectedUser.id, "locations"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => setFeedback({ type: "error", text: error.message || "Unable to save access." }),
  });
  const loading = usersLoading || locationsLoading;
  const canSave = Boolean(selectedUser) && !saveMutation.isPending && !assignedQuery.isLoading;
  const toggleLocation = (id) => setSelectedLocations((current) => current.includes(String(id)) ? current.filter((value) => value !== String(id)) : [...current, String(id)]);

  return <Shell title="Access Management" description="Manage each user's role and authorized operating locations.">
    <div className="grid gap-4 lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.3fr)]">
      <Card><CardHeader><CardTitle>Users</CardTitle></CardHeader><CardContent className="space-y-2">
        {users.map((item) => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-3 text-left ${String(item.id) === String(selectedUser?.id) ? "border-primary bg-primary/5" : "border-zinc-200"}`}><span className="min-w-0 truncate text-sm font-semibold">{item.email || item.name || item.username}</span><span className="ml-2 text-[10px] font-bold uppercase text-zinc-500">{item.role || ROLE.CUSTOMER}</span></button>)}
        {!users.length && !usersLoading && <p className="py-6 text-sm text-zinc-500">No users found.</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{selectedUser ? "User access" : "Select a user"}</CardTitle></CardHeader><CardContent className="space-y-5">
        {loading && <p className="text-sm text-zinc-500">Loading access…</p>}
        {selectedUser && !loading && <><div><p className="text-sm font-semibold">{selectedUser.email || selectedUser.name || selectedUser.username}</p><label className="mt-3 block text-xs font-bold uppercase tracking-wide text-zinc-500" htmlFor="user-role">Role</label><select id="user-role" className="mt-1 min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm" value={role} onChange={(event) => setRole(event.target.value)}>{Object.values(ROLE).map((value) => <option key={value}>{value}</option>)}</select></div>
          <fieldset><legend className="text-xs font-bold uppercase tracking-wide text-zinc-500">Locations</legend><div className="mt-2 space-y-2">{locations.map((location) => <label key={location.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-zinc-200 px-3"><input type="checkbox" className="size-4" checked={selectedLocations.includes(String(location.id))} onChange={() => toggleLocation(location.id)} /><span className="text-sm">{location.name || location.title || `Location ${location.id}`}</span></label>)}</div></fieldset>
          <Button className="min-h-11 w-full" disabled={!canSave} onClick={() => { setFeedback(null); saveMutation.mutate(); }}>{saveMutation.isPending ? "Saving…" : <><Check className="size-4" /> Save Access</>}</Button>
          {feedback && <p role="status" className={feedback.type === "error" ? "text-sm text-red-700" : "text-sm text-emerald-700"}>{feedback.text}</p>}
        </>}
        <ErrorState error={usersError || locationsError || assignedQuery.error} />
      </CardContent></Card>
    </div>
  </Shell>;
}
