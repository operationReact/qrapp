import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/shared/Navbar";
import { updateCurrentUser } from "@/services/auth-service";
import { currentUserOptions } from "@/query/options/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { PasswordInput } from "@/components/ui/password-input";
import { ChevronRight, KeyRound, Package, PartyPopper, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

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
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (profile) {
      setForm((c) => ({ ...c, name: profile.name || "", phone: profile.phone || "" }));
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
    const payload = { name: form.name, phone: form.phone };
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

          {/* ── Quick links ── */}
          <section className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
            {quickLinks.map(({ to, label, icon: Icon, color }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <span className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", color)}>
                  <Icon size={17} />
                </span>
                <span className="flex-1 text-sm font-medium">{label}</span>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </Link>
            ))}
          </section>

        </div>
      </main>
    </div>
  );
}
