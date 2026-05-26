import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/shared/Navbar";
import { updateCurrentUser } from "@/services/auth-service";
import { currentUserOptions } from "@/query/options/auth";
import { LockKeyhole, Menu, Shield } from "@boxicons/react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { PasswordInput } from "@/components/ui/password-input";

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

  const {
    data: profile,
    isLoading,
    error: loadError,
  } = useQuery({
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

  useEffect(() => {
    if (profile) {
      setForm((current) => ({
        ...current,
        name: profile.name || "",
        phone: profile.phone || "",
      }));
      setUser((current) => (current ? { ...current, info: profile } : current));
    }
  }, [profile, setUser]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (data) => {
      setUser((current) => (current ? { ...current, info: data } : current));
      setForm((current) => ({
        ...current,
        name: data.name || "",
        phone: data.phone || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setSuccess("Profile updated successfully.");
      queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey });
    },
    onError: (err) => {
      const message = err?.response?.data || "Failed to update profile.";
      setError(
        typeof message === "string" ? message : "Failed to update profile.",
      );
    },
  });

  const saving = updateMutation.isPending;

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

  const handleSubmit = (event) => {
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

    const payload = {
      name: form.name,
      phone: form.phone,
    };

    if (form.newPassword) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
    }

    updateMutation.mutate(payload);
  };

  return (
    <div className="page-shell bg-page">
      <Navbar />

      <main className="container-premium py-6">
        <div className="mx-auto space-y-5 sm:space-y-6">
          <div>
            <h1 className="text-lg font-semibold sm:text-2xl">Profile</h1>
            <p className="text-sm text-muted-foreground">
              Keep your account details updated so your orders and payments stay
              smooth.
            </p>
          </div>

          <section className="rounded-xl border bg-white shadow-sm">
            {isLoading ? (
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

                  <FieldSet>
                    <FieldLegend>Personal Information</FieldLegend>
                    <FieldGroup className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="name">Name</FieldLabel>
                        <FieldContent>
                          <Input
                            value={form.name}
                            onChange={handleChange("name")}
                            placeholder="Enter Your Name"
                            name="name"
                            id="name"
                          />
                        </FieldContent>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                        <FieldContent>
                          <Input
                            value={form.phone}
                            onChange={handleChange("phone")}
                            placeholder="e.g. 1234567890"
                            name="phone"
                            id="phone"
                          />
                        </FieldContent>
                      </Field>
                    </FieldGroup>
                  </FieldSet>

                  <FieldSet className="mt-4">
                    <FieldLegend>Change Password</FieldLegend>
                    <FieldDescription className="text-sm text-muted-foreground">
                      {passwordHint}
                    </FieldDescription>

                    <FieldGroup className="grid gap-4 md:grid-cols-3">
                      <Field>
                        <FieldLabel htmlFor="current-password">
                          Current Password
                        </FieldLabel>
                        <FieldContent>
                          <PasswordInput
                            type="password"
                            value={form.currentPassword}
                            onChange={handleChange("currentPassword")}
                            placeholder="Current Password"
                            name="current-password"
                            id="current-password"
                          />
                        </FieldContent>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                        <FieldContent>
                          <PasswordInput
                            type="password"
                            value={form.newPassword}
                            onChange={handleChange("newPassword")}
                            placeholder="Set New Password"
                            name="new-password"
                            id="new-password"
                          />
                        </FieldContent>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="confirm-password">
                          Confirm Password
                        </FieldLabel>
                        <FieldContent>
                          <PasswordInput
                            type="password"
                            value={form.confirmPassword}
                            onChange={handleChange("confirmPassword")}
                            placeholder="Confirm Password"
                            name="confirm-password"
                            id="confirm-password"
                          />
                        </FieldContent>
                      </Field>
                    </FieldGroup>
                  </FieldSet>
                </div>

                <div className="p-4 flex justify-end border-t">
                  <Button
                    size="lg"
                    type="submit"
                    disabled={saving}
                    className="w-full sm:max-w-37"
                  >
                    {saving ? "Saving Changes..." : "Update Profile"}
                  </Button>
                </div>
              </form>
            )}
          </section>

          <div className="grid">
            <div className="rounded-t-xl bg-white flex gap-3 items-start sm:items-center p-4 shadow-sm border border-gray-100 border-b-none">
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
            <div className="rounded-b-xl bg-white flex gap-3 items-start sm:items-center p-4 shadow-sm border border-gray-100 border-t-none">
              <span className="size-10 grid place-items-center bg-blue-500/10 p-2 rounded-md">
                <LockKeyhole pack="filled" className="fill-blue-400 size-6" />
              </span>
              <div>
                <div className="font-medium">Secure Password Protection</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  You'll need your current password before setting a new one.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
