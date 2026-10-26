import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/shared/Navbar";
import { updateCurrentUser, deleteCurrentUser } from "@/services/auth-service";
import { getAccountDeletionErrorMessage } from "@/lib/accountDeletion";
import { currentUserOptions } from "@/query/options/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { PasswordInput } from "@/components/ui/password-input";
import { ChevronRight, KeyRound, Package, PartyPopper, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { SPECIAL_DAY_TYPES } from "@/content/specialDayOptions";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  useEffect(() => {
    if (!user?.token) {
      navigate({ to: "/login", state: { from: "/profile" } });
    }
  }, [user?.token, navigate]);

  const { data: profile, isLoading } = useQuery({
    ...currentUserOptions,
    enabled: !!user?.token,
  });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    dateOfBirth: "",
    specialDate: "",
    specialDayType: "",
    specialDayCustomLabel: "",
    defaultLocationId: "",
    customerCompanyId: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const deleteAccountMutation = useMutation({
    mutationFn: () => deleteCurrentUser(deletePassword),
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      navigate({ to: "/" });
    },
    onError: (err) => setDeleteError(getAccountDeletionErrorMessage(err)),
  });

  const handleDeleteAccount = (event) => {
    event.preventDefault();
    setDeleteError("");
    deleteAccountMutation.mutate();
  };
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const locationComboboxAnchor = useComboboxAnchor();
  const companyComboboxAnchor = useComboboxAnchor();

  const locationsQuery = useQuery({
    queryKey: ["locations", "profile-edit"],
    enabled: !!user?.token,
    queryFn: async () => (await apiClient.get("/api/locations/public")).data || [],
  });
  const companiesQuery = useQuery({
    queryKey: ["customer-companies", "profile-edit", form.defaultLocationId],
    enabled: Boolean(form.defaultLocationId),
    queryFn: async () => (
      await apiClient.get(`/api/locations/${form.defaultLocationId}/customer-companies`)
    ).data || [],
  });

  useEffect(() => {
    if (profile) {
      // Profile data is the server-backed source for the editable form.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((c) => ({
        ...c,
        name: profile.name || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth || "",
        specialDate: profile.specialDate || "",
        specialDayType: profile.specialDayType || "",
        specialDayCustomLabel: profile.specialDayCustomLabel || "",
        defaultLocationId: profile.defaultLocation?.id ? String(profile.defaultLocation.id) : "",
        customerCompanyId: profile.customerCompany?.id ? String(profile.customerCompany.id) : "",
      }));
      setUser((c) => (c ? { ...c, info: profile } : c));
    }
  }, [profile, setUser]);

  const updateMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (data) => {
      setUser((c) => (c ? { ...c, info: data } : c));
      setForm((c) => ({
        ...c,
        name: data.name || "",
        phone: data.phone || "",
        dateOfBirth: data.dateOfBirth || "",
        specialDate: data.specialDate || "",
        specialDayType: data.specialDayType || "",
        specialDayCustomLabel: data.specialDayCustomLabel || "",
        defaultLocationId: data.defaultLocation?.id ? String(data.defaultLocation.id) : "",
        customerCompanyId: data.customerCompany?.id ? String(data.customerCompany.id) : "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setShowPassword(false);
      setSuccess("Profile updated successfully.");
      queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey });
    },
    onError: (err) => {
      const msg = err?.response?.data || "Failed to update profile.";
      setError(typeof msg === "string" ? msg : "Failed to update profile.");
    },
  });

  const saving = updateMutation.isPending;

  const handleChange = (key) => (e) => {
    setError(""); setSuccess("");
    setForm((c) => ({ ...c, [key]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.phone.trim()) { setError("Phone number is required."); return; }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password do not match."); return;
    }
    const payload = {
      name: form.name,
      phone: form.phone,
      dateOfBirth: form.dateOfBirth || undefined,
      specialDate: form.specialDate || null,
      specialDayType: form.specialDayType || null,
      ...(form.specialDayType === "Other"
        ? { specialDayCustomLabel: form.specialDayCustomLabel.trim() || null }
        : { specialDayCustomLabel: null }),
      defaultLocationId: form.defaultLocationId ? Number(form.defaultLocationId) : undefined,
      customerCompanyId: form.customerCompanyId ? Number(form.customerCompanyId) : undefined,
    };
    if (form.newPassword) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword     = form.newPassword;
    }
    updateMutation.mutate(payload);
  };

  const initials = useMemo(() => {
    const src = (profile?.name || user?.info?.name || user?.info?.phone || "U").trim();
    return src.slice(0, 1).toUpperCase();
  }, [profile, user]);

  const quickLinks = [
    { to: "/orders",       label: "My Orders",            icon: Package,      color: "bg-blue-50 text-blue-600" },
    { to: "/party-orders", label: "Party Orders",          icon: PartyPopper,  color: "bg-purple-50 text-purple-600" },
    { to: "/milestones",   label: "Milestones & Rewards",  icon: Trophy,       color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="page-shell bg-page">
      <Navbar />

      <main className="pb-10">
        {/* ── Avatar hero ── */}
        <div className="bg-white border-b">
          <div className="container-premium py-6 flex items-center gap-4">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-primary">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base truncate">
                {profile?.name || user?.info?.name || "—"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {profile?.phone || user?.info?.phone || ""}
              </p>
            </div>
          </div>
        </div>

        <div className="container-premium py-5 space-y-4">

          {/* ── Feedback banners ── */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* ── Profile form ── */}
          <section className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Personal Information
              </p>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Name + Phone — stacked on mobile, 2-col on md */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-sm font-medium">Name</label>
                    <Input
                      id="name" name="name"
                      value={form.name}
                      onChange={handleChange("name")}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-sm font-medium">Phone</label>
                    <Input
                      id="phone" name="phone"
                      value={form.phone}
                      onChange={handleChange("phone")}
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="date-of-birth" className="text-sm font-medium">Date of Birth</label>
                    <Input
                      id="date-of-birth"
                      name="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={handleChange("dateOfBirth")}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium">
                      ❤️ Special Day <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        type="date"
                        value={form.specialDate}
                        onChange={handleChange("specialDate")}
                        aria-label="❤️ Special Day"
                      />
                      <select
                        value={form.specialDayType}
                        onChange={(event) => {
                          const specialDayType = event.target.value;
                          setError(""); setSuccess("");
                          setForm((current) => ({
                            ...current,
                            specialDayType,
                            specialDayCustomLabel: specialDayType === "Other"
                              ? current.specialDayCustomLabel
                              : "",
                          }));
                        }}
                        aria-label="Special Day occasion"
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Choose an occasion</option>
                        {SPECIAL_DAY_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    {form.specialDayType === "Other" && (
                      <Input
                        value={form.specialDayCustomLabel}
                        onChange={handleChange("specialDayCustomLabel")}
                        placeholder="Enter your occasion"
                        maxLength={120}
                        aria-label="Custom special day occasion"
                      />
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Location</label>
                    <Combobox
                      items={(locationsQuery.data || []).map((location) => location.name)}
                      value={(locationsQuery.data || []).find((location) => String(location.id) === form.defaultLocationId)?.name || ""}
                      onValueChange={(value) => {
                        const location = (locationsQuery.data || []).find((item) => item.name === value);
                        setError(""); setSuccess("");
                        setForm((c) => ({
                          ...c,
                          defaultLocationId: location ? String(location.id) : "",
                          customerCompanyId: "",
                        }));
                      }}
                    >
                      <div ref={locationComboboxAnchor}>
                        <ComboboxInput placeholder="Search location" className="h-10" />
                      </div>
                      <ComboboxContent anchor={locationComboboxAnchor}>
                        <ComboboxEmpty>No matching locations.</ComboboxEmpty>
                        <ComboboxList>
                          {(locationsQuery.data || []).map((location) => (
                            <ComboboxItem key={location.id} value={location.name}>{location.name}</ComboboxItem>
                          ))}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    {!form.defaultLocationId && (
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60">
                        {locationsQuery.isLoading && (
                          <p className="px-3 py-2 text-xs text-muted-foreground">Loading locations...</p>
                        )}
                        {!locationsQuery.isLoading && !locationsQuery.data?.length && (
                          <p className="px-3 py-2 text-xs text-muted-foreground">No locations available.</p>
                        )}
                        {(locationsQuery.data || []).map((location) => (
                          <button
                            key={location.id}
                            type="button"
                            onClick={() => {
                              setError(""); setSuccess("");
                              setForm((c) => ({
                                ...c,
                                defaultLocationId: String(location.id),
                                customerCompanyId: "",
                              }));
                            }}
                            className="flex min-h-10 w-full items-center px-3 text-left text-sm text-foreground transition-colors hover:bg-white"
                          >
                            {location.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Customer Company</label>
                    <Combobox
                      items={(companiesQuery.data || []).map((company) => company.name)}
                      value={(companiesQuery.data || []).find((company) => String(company.id) === form.customerCompanyId)?.name || ""}
                      onValueChange={(value) => {
                        const company = (companiesQuery.data || []).find((item) => item.name === value);
                        setError(""); setSuccess("");
                        setForm((c) => ({ ...c, customerCompanyId: company ? String(company.id) : "" }));
                      }}
                    >
                      <div ref={companyComboboxAnchor}>
                        <ComboboxInput
                          placeholder={form.defaultLocationId ? "Search company" : "Select location first"}
                          className="h-10"
                          disabled={!form.defaultLocationId || companiesQuery.isLoading}
                        />
                      </div>
                      <ComboboxContent anchor={companyComboboxAnchor}>
                        <ComboboxEmpty>No matching companies.</ComboboxEmpty>
                        <ComboboxList>
                          {(companiesQuery.data || []).map((company) => (
                            <ComboboxItem key={company.id} value={company.name}>{company.name}</ComboboxItem>
                          ))}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    {!form.customerCompanyId && (
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60">
                      {!form.defaultLocationId && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Select a location first.</p>
                      )}
                      {form.defaultLocationId && companiesQuery.isLoading && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Loading companies...</p>
                      )}
                      {form.defaultLocationId && !companiesQuery.isLoading && !companiesQuery.data?.length && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No companies available.</p>
                      )}
                      {(companiesQuery.data || []).map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => {
                            setError(""); setSuccess("");
                            setForm((c) => ({ ...c, customerCompanyId: String(company.id) }));
                          }}
                          className={cn(
                            "flex min-h-10 w-full items-center px-3 text-left text-sm transition-colors hover:bg-white",
                            String(company.id) === form.customerCompanyId
                              ? "bg-white font-medium text-primary"
                              : "text-foreground",
                          )}
                        >
                          {company.name}
                        </button>
                      ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Change Password toggle */}
                <div className="border-t pt-3">
                  <button
                    type="button"
                    onClick={() => { setShowPassword((v) => !v); setError(""); setSuccess(""); }}
                    className="flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    <KeyRound size={15} />
                    {showPassword ? "Cancel password change" : "Change password"}
                  </button>

                  {showPassword && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <label htmlFor="current-password" className="text-sm font-medium">Current Password</label>
                        <PasswordInput
                          id="current-password"
                          value={form.currentPassword}
                          onChange={handleChange("currentPassword")}
                          placeholder="Current password"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="new-password" className="text-sm font-medium">New Password</label>
                        <PasswordInput
                          id="new-password"
                          value={form.newPassword}
                          onChange={handleChange("newPassword")}
                          placeholder="New password"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</label>
                        <PasswordInput
                          id="confirm-password"
                          value={form.confirmPassword}
                          onChange={handleChange("confirmPassword")}
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto sm:min-w-36"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </form>
            )}
          </section>

          <section className="rounded-xl bg-white border border-gray-100 p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Legal documents</h2>
            <p className="mt-1 text-xs text-muted-foreground">Review the current documents that apply to your account.</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <a href="/terms-and-conditions" target="_blank" rel="noreferrer" className="text-primary underline">
                Terms &amp; Conditions
              </a>
              <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-primary underline">
                Privacy Policy
              </a>
            </div>
          </section>

          {/* ── Quick links ── */}
          <section className="rounded-xl bg-white border border-red-100 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-red-700">Delete account</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Permanently delete your account and personal details. Order, payment and tax records are kept as required by law.
            </p>
            {!showDeleteAccount ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3 border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => setShowDeleteAccount(true)}
              >
                Delete my account
              </Button>
            ) : (
              <form onSubmit={handleDeleteAccount} className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="delete-account-password" className="text-sm font-medium">Confirm your password</label>
                  <PasswordInput
                    id="delete-account-password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                  />
                </div>
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={deleteConfirmed}
                    onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  />
                  I understand this cannot be undone and I will be signed out.
                </label>
                {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={!deleteConfirmed || !deletePassword || deleteAccountMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleteAccountMutation.isPending ? "Deleting…" : "Permanently delete account"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowDeleteAccount(false);
                      setDeletePassword("");
                      setDeleteConfirmed(false);
                      setDeleteError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </section>

          <section className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
            {quickLinks.map((quickLink) => {
              const QuickIcon = quickLink.icon;
              return (
              <Link
                key={quickLink.to}
                to={quickLink.to}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <span className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", quickLink.color)}>
                  <QuickIcon size={17} />
                </span>
                <span className="flex-1 text-sm font-medium">{quickLink.label}</span>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </Link>
              );
            })}
          </section>

        </div>
      </main>
    </div>
  );
}
