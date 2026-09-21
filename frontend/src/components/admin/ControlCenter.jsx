import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, Building2, Check, KeyRound, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { ROLE } from "@/lib/roles";
import { adminLocationsOptions, adminUsersOptions, createManagementResource, grantUserLocation, revokeUserLocation, updateUserRole, userLocationsOptions } from "@/query/options/management";

const links = [
  { to: "/admin/control-center", label: "Overview", icon: ShieldCheck },
  { to: "/admin/control-center/users", label: "Users", icon: Users },
  { to: "/admin/control-center/locations", label: "Locations", icon: Building2 },
  { to: "/admin/control-center/access", label: "Access Management", icon: KeyRound },
];

function Shell({ title, description, children }) {
  const { pathname } = useLocation();
  return <main className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
    <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Super Admin Control Center</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">{title}</h1><p className="mt-1 text-sm text-zinc-500">{description}</p></div>
    <nav className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Control center">
      {links.map(({ to, label }) => <Link key={to} to={to} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${pathname === to ? "border-primary/30 bg-primary/10 text-primary" : "border-zinc-200 bg-white text-zinc-600"}`}>{label}</Link>)}
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
  return <Shell title="Overview" description="A compact view of platform access and operating locations."><div className="grid gap-4 sm:grid-cols-2"><Link to="/admin/control-center/users"><Card className="transition hover:ring-primary/40"><CardHeader><CardTitle className="flex justify-between"><Users /> Users</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{users.length}</p><p className="mt-1 text-sm text-zinc-500">Manage administrator access <ArrowRight className="inline size-4" /></p></CardContent></Card></Link><Link to="/admin/control-center/locations"><Card className="transition hover:ring-primary/40"><CardHeader><CardTitle className="flex justify-between"><Building2 /> Locations</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{locations.length}</p><p className="mt-1 text-sm text-zinc-500">Manage authorized locations <ArrowRight className="inline size-4" /></p></CardContent></Card></Link></div></Shell>;
}

export function ControlCenterUsers() {
  const { data = [], isLoading, error } = useQuery(adminUsersOptions());
  return <Shell title="Users" description="Review administrator accounts and manage access from the Access Management screen."><Card><CardHeader><CardTitle>Administrator accounts</CardTitle></CardHeader><CardContent>{isLoading ? <p className="text-sm text-zinc-500">Loading users…</p> : <Items items={data} />}{<ErrorState error={error} />}</CardContent></Card></Shell>;
}

export function ControlCenterLocations() {
  const { data = [], isLoading, error } = useQuery(adminLocationsOptions()); const { activeLocation } = useActiveLocation(); const [name, setName] = useState(""); const queryClient = useQueryClient();
  const mutation = useMutation({ mutationFn: () => createManagementResource("/api/admin/locations", { code: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, active: true }), onSuccess: () => { setName(""); queryClient.invalidateQueries({ queryKey: ["admin", "locations"] }); } });
  return <Shell title="Locations" description="Create and review the locations available to administrators."><Card><CardHeader><CardTitle>Authorized locations</CardTitle></CardHeader><CardContent className="space-y-4"><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (name.trim()) mutation.mutate(); }}><Input className="min-h-11" required placeholder="New location name" value={name} onChange={(event) => setName(event.target.value)} /><Button className="min-h-11" disabled={mutation.isPending}>Add</Button></form><div className="rounded-xl bg-primary/5 p-3 text-sm text-primary">Active: <strong>{activeLocation?.name || "Not selected"}</strong></div>{isLoading ? <p className="text-sm text-zinc-500">Loading locations…</p> : <Items items={data} empty="No locations are configured." />}<ErrorState error={error || mutation.error} /></CardContent></Card></Shell>;
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
