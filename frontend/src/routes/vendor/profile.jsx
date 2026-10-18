import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, MapPin, Save, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCurrentUser, updateCurrentUser } from "@/services/auth-service";

export const Route = createFileRoute("/vendor/profile")({ component: VendorProfile });

const PROFILE_KEY = ["vendor-profile"];
const ERROR_MESSAGES = {
  invalid_current_password: "Your current password is incorrect.",
  phone_taken: "This phone number is already in use.",
  phone_required: "Enter a phone number.",
};

function errorMessage(error, fallback) {
  const data = error?.response?.data;
  const key = typeof data === "string" ? data : data?.message;
  return ERROR_MESSAGES[key] || fallback;
}

function VendorProfile() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();
  const profileQuery = useQuery({ queryKey: PROFILE_KEY, queryFn: getCurrentUser });
  const profile = profileQuery.data;

  if (profileQuery.isLoading) return <div className="vp-body"><p className="vp-empty">Loading profile…</p></div>;
  if (profileQuery.isError || !profile) {
    return <div className="vp-body"><p className="vp-empty">Your profile is temporarily unavailable.</p></div>;
  }

  const locations = profile.locationAccess || [];

  const saveDetails = (saved) => {
    setUser({ ...user, name: saved.name, phone: saved.phone });
    queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    toast.success("Profile updated");
  };

  return (
    <div className="vp-body">
      <header className="vp-header">
        <div>
          <p className="vp-eyebrow">Vendor account</p>
          <h1 className="vp-title">Your profile</h1>
          <p className="vp-subtitle">Keep your contact details up to date.</p>
        </div>
      </header>

      <div className="vp-profile-grid">
        <section className="vp-card">
          <div className="vp-card__head">
            <h2 className="vp-card__title"><UserRound size={16} /> Details</h2>
          </div>
          <div className="vp-card__body">
            <dl className="vp-facts">
              <div><dt>Name</dt><dd>{profile.name || "--"}</dd></div>
              <div><dt>Phone</dt><dd>{profile.phone || "--"}</dd></div>
              <div><dt>Role</dt><dd>Vendor</dd></div>
            </dl>
          </div>
        </section>

        <section className="vp-card">
          <div className="vp-card__head">
            <h2 className="vp-card__title"><MapPin size={16} /> Locations</h2>
          </div>
          <div className="vp-card__body">
            {locations.length === 0 && <p className="vp-empty">No locations assigned.</p>}
            <ul className="vp-location-list">
              {locations.map((access) => (
                <li key={access.location?.id}>
                  <strong>{access.location?.name}</strong>
                  {access.location?.code && <span className="vp-muted">{access.location.code}</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <DetailsForm key={`${profile.name}|${profile.phone}`} profile={profile} onSaved={saveDetails} />
        <PasswordForm />
      </div>
    </div>
  );
}

function DetailsForm({ profile, onSaved }) {
  const [name, setName] = useState(profile.name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const mutation = useMutation({
    mutationFn: () => updateCurrentUser({ name: name.trim(), phone: phone.trim() }),
    onSuccess: onSaved,
    onError: (error) => toast.error(errorMessage(error, "Unable to update your profile.")),
  });

  const submit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Enter your name.");
      return;
    }
    mutation.mutate();
  };

  return (
    <section className="vp-card">
      <div className="vp-card__head">
        <h2 className="vp-card__title">Edit details</h2>
      </div>
      <form className="vp-card__body vp-stack" onSubmit={submit}>
        <label className="vp-field">
          <span>Name</span>
          <input className="vp-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="vp-field">
          <span>Phone</span>
          <input className="vp-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <button type="submit" className="vp-btn vp-btn--primary" disabled={mutation.isPending}>
          <Save size={16} /> {mutation.isPending ? "Saving…" : "Save details"}
        </button>
      </form>
    </section>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => updateCurrentUser({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    },
    onError: (error) => toast.error(errorMessage(error, "Unable to change your password.")),
  });

  const submit = (event) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Use at least 8 characters for the new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("The new passwords do not match.");
      return;
    }
    mutation.mutate();
  };

  return (
    <section className="vp-card">
      <div className="vp-card__head">
        <h2 className="vp-card__title"><KeyRound size={16} /> Change password</h2>
      </div>
      <form className="vp-card__body vp-stack" onSubmit={submit}>
        <label className="vp-field">
          <span>Current password</span>
          <input className="vp-input" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </label>
        <label className="vp-field">
          <span>New password</span>
          <input className="vp-input" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </label>
        <label className="vp-field">
          <span>Confirm new password</span>
          <input className="vp-input" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </label>
        <button type="submit" className="vp-btn vp-btn--primary" disabled={mutation.isPending}>
          <KeyRound size={16} /> {mutation.isPending ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
