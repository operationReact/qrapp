import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { setUserAuth } from "@/services";
import { loginUser, updateCurrentUser } from "@/services/auth-service";
import { getPartnerDisplayName, getPartnerLogoUrl } from "@/lib/partnerBranding";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/change-password")({ component: ChangePassword });

function ChangePassword() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();
  const isPartner = storedUser?.role?.startsWith("PARTNER_");
  const partner = isPartner ? (storedUser.partner || { partnerCode: "URBANWRK", displayName: "UrbanWrk" }) : null;
  const partnerDisplayName = getPartnerDisplayName(partner);
  const partnerLogo = getPartnerLogoUrl(partner);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      setError("Use at least 8 characters and make both passwords match.");
      return;
    }
    setSaving(true);
    try {
      await updateCurrentUser({ currentPassword, newPassword });
      const refreshedSession = await loginUser({ phone: storedUser?.phone, password: newPassword });
      if (!refreshedSession?.token) throw new Error("Unable to create a new session.");
      setUserAuth(refreshedSession.token);
      setUser({ ...refreshedSession.user, token: refreshedSession.token });
      navigate({ to: "/partner" });
    } catch (requestError) {
      const responseData = requestError?.response?.data;
      setError(typeof responseData === "string" ? responseData : responseData?.message || "Unable to change password.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f7f3ef] p-5 sm:p-8"><div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,36,56,.10),transparent_30%),radial-gradient(circle_at_90%_90%,rgba(54,35,60,.10),transparent_35%)]" /><form onSubmit={submit} className="relative w-full max-w-[440px] overflow-hidden rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(47,32,55,.14)] backdrop-blur sm:p-8">{partner && <div className="mb-8 flex items-center gap-3 border-b border-[#eee7e1] pb-6"><div className="grid h-12 w-32 place-items-center rounded-2xl bg-white p-2 shadow-[0_8px_22px_rgba(47,32,55,.10)]"><img src={partnerLogo} alt={`${partnerDisplayName} logo`} className="max-h-full max-w-full object-contain" /></div><div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#9a8e89]">Partner workspace</p><p className="mt-1 text-lg font-bold text-[#2b2430]">{partnerDisplayName}</p><p className="text-xs text-[#8b807b]">{partner.partnerCode}</p></div></div>}<div className="mb-7"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--cc-primary)]">Account security</p><h1 className="mt-2 text-2xl font-bold tracking-[-.03em] text-[#211a25]">Create your new password</h1><p className="mt-2 text-sm leading-6 text-[#766c68]">Your temporary password is only for first access. Set a private password before entering the Partner Portal.</p></div><div className="space-y-4"><input autoComplete="current-password" className="h-12 w-full rounded-2xl border border-[#e6ded8] bg-[#fffdfa] px-4 text-sm outline-none transition focus:border-[var(--cc-primary)] focus:ring-4 focus:ring-[var(--cc-primary)]/10" type="password" placeholder="Temporary password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /><input autoComplete="new-password" className="h-12 w-full rounded-2xl border border-[#e6ded8] bg-[#fffdfa] px-4 text-sm outline-none transition focus:border-[var(--cc-primary)] focus:ring-4 focus:ring-[var(--cc-primary)]/10" type="password" placeholder="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><input autoComplete="new-password" className="h-12 w-full rounded-2xl border border-[#e6ded8] bg-[#fffdfa] px-4 text-sm outline-none transition focus:border-[var(--cc-primary)] focus:ring-4 focus:ring-[var(--cc-primary)]/10" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />{error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--cc-error)]">{error}</p>}<button className="h-12 w-full rounded-2xl bg-[#2b2430] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(43,36,48,.18)] transition hover:bg-[#44364d] disabled:cursor-not-allowed disabled:opacity-60" disabled={saving}>{saving ? "Saving..." : "Continue to Partner Portal"}</button></div><p className="mt-6 text-center text-xs text-[#9a8e89]">Keep your password private. You will use it for future sign-ins.</p></form></div>;
}
