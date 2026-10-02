import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "@/services/auth-service";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  CaretLeftIcon,
  WhatsappLogo,
  LockIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/(auth)/login")({
  component: function UserLogin() {
    const { setUser } = useAuth();

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");

    const firstFormField = useRef(null);
    useEffect(() => {
      firstFormField.current?.focus();
    }, []);

    const [noToken, setNoToken] = useState(false);

    const loginMutation = useMutation({
      mutationFn: loginUser,
      onSuccess: (data) => {
        if (!data.token) {
          setNoToken(true);
          return;
        }
        setUser({ token: data.token, ...data.user });
      },
    });

    const submit = (e) => {
      e.preventDefault();
      loginMutation.mutate({ phone: identifier, password });
    };

    return (
      <div className="w-full min-h-screen bg-[#FFF9F3] flex flex-col overflow-x-hidden">
        {/* ═══════════════════════════════════════════════════════════
            HEADER — Compact top bar with back button and logo
            ═══════════════════════════════════════════════════════════ */}
        <header className="flex items-center h-14 px-4 bg-[#FFFDF9] border-b border-[var(--cc-border)]/30">
          <Link
            className={buttonVariants({
              size: "icon-sm",
              variant: "ghost",
              className: "text-[var(--cc-secondary-text)]",
            })}
            to="/"
            title="Back To Menu"
            aria-label="Back to menu"
          >
            <CaretLeftIcon weight="bold" size={20} />
          </Link>
          <div className="flex-1 flex justify-center pointer-events-none">
            <img
              src="/logo.svg"
              alt="Bro & Bro"
              className="h-8 object-contain"
            />
          </div>
          <div className="w-10" />
        </header>

        {/* ═══════════════════════════════════════════════════════════
            MAIN CONTENT — Scrollable page container
            ═══════════════════════════════════════════════════════════ */}
        <main className="flex-1 w-full flex flex-col px-4 pt-2">
          <div className="w-full max-w-sm mx-auto flex flex-col">
            {/* ─────────────────────────────────────────────────────
                HERO SECTION — Premium branded card
                ───────────────────────────────────────────────────── */}
            <div className="relative w-full mt-2 mb-0 rounded-2xl overflow-hidden bg-gradient-to-r from-pink-400 to-pink-300 h-48">
              {/* Hero Image Background */}
              <img
                src="/login-banner.jpg"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Overlay for better text contrast */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-transparent" />

              {/* Hero Text Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-5 text-white max-w-xs">
                <h1 className="text-xl font-bold leading-tight tracking-tight mb-2">
                  Your Easy Access to
                  <br />
                  <span className="text-white">Delicious Meals</span>
                </h1>
                <p className="text-xs font-normal opacity-95 leading-snug">
                  Fresh food. Great taste.
                </p>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────
                LOGIN CARD — Elevated white form container
                ───────────────────────────────────────────────────── */}
            <div className="relative w-full -mt-4 rounded-3xl bg-white p-6 shadow-md border border-black/4 z-10">
              {/* Card Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[var(--cc-text)] tracking-tight mb-1">
                  Welcome back
                </h2>
                <p className="text-sm text-[var(--cc-secondary-text)]">
                  Login to your account
                </p>
              </div>

              {/* Error Message */}
              {(loginMutation.isError || noToken) && (
                <div className="mb-4 rounded-lg border border-[var(--cc-error)]/20 bg-[var(--cc-error-bg)] px-3 py-2 text-xs text-[var(--cc-error)]">
                  {noToken
                    ? "No token returned from server"
                    : "Invalid WhatsApp number or password"}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={submit} className="space-y-4">
                {/* WhatsApp Number Field */}
                <div>
                  <label
                    htmlFor="identifier"
                    className="block text-xs font-semibold text-[var(--cc-text)] mb-2"
                  >
                    WhatsApp Number
                  </label>
                  <div className="relative flex items-center bg-white border border-[#E7E2DE] rounded-2xl h-13 px-3.5 focus-within:border-[var(--cc-primary)] focus-within:ring-1 focus-within:ring-[var(--cc-primary)]/30 transition-all">
                    <WhatsappLogo size={18} className="text-[var(--cc-secondary-text)] flex-shrink-0" />
                    <input
                      ref={firstFormField}
                      id="identifier"
                      type="tel"
                      inputMode="tel"
                      autocomplete="tel"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      placeholder="Enter your WhatsApp number"
                      className="flex-1 ml-2.5 bg-transparent outline-none text-sm placeholder:text-[#B5A9A1] text-[var(--cc-text)] leading-tight"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-[var(--cc-text)] mb-2"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center bg-white border border-[#E7E2DE] rounded-2xl h-13 px-3.5 focus-within:border-[var(--cc-primary)] focus-within:ring-1 focus-within:ring-[var(--cc-primary)]/30 transition-all group">
                    <LockIcon size={18} className="text-[var(--cc-secondary-text)] flex-shrink-0" />
                    <PasswordInput
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      name="password"
                      autocomplete="current-password"
                      placeholder="Enter your password"
                      className="h-13 border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 px-0 pl-2.5 text-sm placeholder:text-[#B5A9A1]"
                    />
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end pt-1">
                  <Link
                    to="/forget-password"
                    className="text-xs font-medium text-[var(--cc-primary)] hover:text-[var(--cc-primary-dark)] transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full h-13 mt-3.5 text-sm font-bold bg-[var(--cc-primary)] hover:bg-[var(--cc-primary-dark)] text-white rounded-2xl transition-colors"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>

                {/* OR Divider */}
                <div className="flex items-center gap-2.5 my-5">
                  <div className="flex-1 h-px bg-[var(--cc-border)]" />
                  <span className="text-xs font-semibold text-[var(--cc-secondary-text)]">
                    OR
                  </span>
                  <div className="flex-1 h-px bg-[var(--cc-border)]" />
                </div>

                {/* Create Account Button */}
                <Link
                  to="/register"
                  className={buttonVariants({
                    variant: "outline",
                    className:
                      "w-full h-12 text-sm font-semibold border-2 border-[var(--cc-primary)] text-[var(--cc-primary)] hover:bg-[var(--cc-primary-light)] rounded-2xl transition-colors",
                  })}
                >
                  <UserPlusIcon size={16} weight="regular" />
                  Create Account
                </Link>
              </form>
            </div>
          </div>
        </main>

        {/* ═══════════════════════════════════════════════════════════
            FOOTER — Compact secondary branding
            ═══════════════════════════════════════════════════════════ */}
        <footer className="w-full border-t border-[var(--cc-border)]/50 bg-white mt-8 px-4 py-6">
          <div className="w-full max-w-sm mx-auto">
            {/* Brand Section */}
            <div className="mb-5">
              <img
                src="/logo.svg"
                alt="Bro & Bro"
                className="h-7 mb-2 object-contain"
              />
              <p className="text-xs font-semibold text-[var(--cc-secondary-text)] mb-1">
                FOOD COURT
              </p>
              <p className="text-xs leading-relaxed text-[var(--cc-muted-text)]">
                Technology-enabled food destinations for corporate communities.
              </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-5 pb-5 border-b border-[var(--cc-border)]/50">
              <p className="text-xs text-[var(--cc-secondary-text)]">
                📍 Pragati Nagar, Hyderabad
              </p>
              <a
                href="mailto:support@broandbro.com"
                className="text-xs text-[var(--cc-primary)] hover:text-[var(--cc-primary-dark)] transition-colors block"
              >
                📧 support@broandbro.com
              </a>
              <a
                href="tel:+919876543210"
                className="text-xs text-[var(--cc-primary)] hover:text-[var(--cc-primary-dark)] transition-colors block"
              >
                📞 +91 9876 543 210
              </a>
            </div>

            {/* Value Props — Mobile Compact */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-[var(--cc-secondary-text)]">
                  ✓ Fresh Food
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[var(--cc-secondary-text)]">
                  ✓ Multiple Cuisines
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[var(--cc-secondary-text)]">
                  ✓ Great Experience
                </p>
              </div>
            </div>

            {/* Copyright */}
            <p className="text-xs text-[var(--cc-muted-text)] text-center mt-5">
              © 2024 Bro & Bro. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    );
  },
});
