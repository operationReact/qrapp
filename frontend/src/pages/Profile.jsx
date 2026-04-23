import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getCurrentUser, updateCurrentUser } from "../services/api";
import { useUserAuth } from "../context/UserAuthContext";
import { LockKeyhole, Menu, Shield } from "@boxicons/react";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useUserAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!user?.token) {
        navigate("/login", { state: { from: "/profile" } });
        return;
      }

      try {
        const response = await getCurrentUser();
        if (!mounted) return;
        const profile = response?.data || {};
        setForm((current) => ({
          ...current,
          name: profile.name || "",
          phone: profile.phone || "",
        }));
        setUser((current) =>
          current ? { ...current, info: profile } : current,
        );
      } catch (err) {
        if (!mounted) return;
        const message =
          err?.response?.data || "Unable to load your profile right now.";
        setError(
          typeof message === "string"
            ? message
            : "Unable to load your profile right now.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [navigate, setUser, user?.token]);

  const passwordHint = useMemo(
    () =>
      form.newPassword
        ? "Changing password requires your current password."
        : "Leave password fields empty if you only want to update name or phone.",
    [form.newPassword],
  );

  const handleChange = (key) => (event) => {
    setError("");
    setSuccess("");
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
      };

      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }

      const response = await updateCurrentUser(payload);
      const profile = response?.data || {};
      setUser((current) => (current ? { ...current, info: profile } : current));
      setForm((current) => ({
        ...current,
        name: profile.name || "",
        phone: profile.phone || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setSuccess("Profile updated successfully.");
    } catch (err) {
      const message = err?.response?.data || "Failed to update profile.";
      setError(
        typeof message === "string" ? message : "Failed to update profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell bg-page">
      <Navbar />

      <main className="container-premium py-6">
        <div className="mx-auto space-y-5 sm:space-y-6">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Edit Profile</h1>
            <p className="mt-2 text-md text-muted-foreground">
              Keep your account details updated so your orders and payments stay
              smooth.
            </p>
          </div>

          <section className="rounded-2xl border bg-white shadow-sm">
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">
                Loading Profile...
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="p-4 sm:py-6 space-y-2">
                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      {success}
                    </div>
                  )}

                  <div>
                    <div className="font-medium">Personal Information</div>
                    <div className="grid mt-2 gap-0 md:gap-4 md:grid-cols-2">
                      <label className="block mb-2">
                        <span className="text-sm font-medium text-zinc-600">
                          Name
                        </span>
                        <input
                          value={form.name}
                          onChange={handleChange("name")}
                          className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent focus-visible:outline-transparent"
                          placeholder="Enter Your Name"
                        />
                      </label>

                      <label className="block mb-2">
                        <span className="text-sm font-medium text-zinc-600">
                          Phone Number
                        </span>
                        <input
                          value={form.phone}
                          onChange={handleChange("phone")}
                          className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent focus-visible:outline-transparent"
                          placeholder="e.g. 1234567890"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="font-medium">Change Password</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {passwordHint}
                    </div>

                    <div className="mt-2 grid gap-0 md:gap-4 md:grid-cols-3">
                      <label className="block mb-2">
                        <span className="text-sm font-medium text-zinc-600">
                          Current Password
                        </span>
                        <input
                          value={form.currentPassword}
                          onChange={handleChange("currentPassword")}
                          className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent focus-visible:outline-transparent"
                          placeholder="Enter Your Name"
                        />
                      </label>

                      <label className="block mb-2">
                        <span className="text-sm font-medium text-zinc-600">
                          New Password
                        </span>
                        <input
                          type="password"
                          value={form.newPassword}
                          onChange={handleChange("newPassword")}
                          className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent focus-visible:outline-transparent"
                          placeholder="Enter Your Name"
                        />
                      </label>

                      <label className="block mb-2">
                        <span className="text-sm font-medium text-zinc-600">
                          Confirm Password
                        </span>
                        <input
                          type="password"
                          value={form.confirmPassword}
                          onChange={handleChange("confirmPassword")}
                          className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent focus-visible:outline-transparent"
                          placeholder="Confirm Your Password"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-4 flex justify-end border-t">
                  <Button
                    size="lg"
                    type="submit"
                    disabled={saving}
                    className="h-12 w-full sm:max-w-[148px] font-medium!"
                  >
                    {saving ? "Saving Changes..." : "Update Profile"}
                  </Button>
                </div>
              </form>
            )}
          </section>

          <div className="grid">
            <div className="rounded-t-2xl bg-white flex gap-3 items-start sm:items-center p-4 shadow-sm border border-gray-100 border-b-none">
              <span className="size-10 grid place-items-center bg-green-500/10 p-2 rounded-md">
                <Shield pack="filled" className="fill-green-400 size-6" />
              </span>
              <div>
                <div className="font-medium">Save Your Preferences</div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  Your menu, wallet, and order history are linked to this
                  account.
                </div>
              </div>
            </div>
            <div className="bg-white flex gap-3 items-start sm:items-center p-4 shadow-sm border border-gray-100 ">
              <span className="size-10 grid place-items-center bg-red-500/10 p-2 rounded-md">
                <Menu pack="filled" className="fill-red-400 size-6" />
              </span>
              <div>
                <div className="font-medium">Quick Access To Your Account</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Use the hamburger menu any time to open your account
                  shortcuts.
                </div>
              </div>
            </div>
            <div className="rounded-b-2xl bg-white flex gap-3 items-start sm:items-center p-4 shadow-sm border border-gray-100 border-t-none">
              <span className="size-10 grid place-items-center bg-blue-500/10 p-2 rounded-md">
                <LockKeyhole pack="filled" className="fill-blue-400 size-6" />
              </span>
              <div>
                <div className="font-medium">Secure Password Protection</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  You’ll need your current password before setting a new one.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
