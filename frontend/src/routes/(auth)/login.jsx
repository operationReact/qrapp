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
  PhoneIcon,
  LockIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
import { PasswordInput } from "@/components/ui/password-input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useAuth } from "@/context/AuthContext";
import { Separator } from "@/components/ui/separator";

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
      <div className="min-h-screen bg-[var(--cc-page)] flex flex-col">
        {/* NAVIGATION */}
        <nav className="px-4 py-3 sm:px-6 sm:py-4">
          <Link
            className={buttonVariants({
              size: "sm",
              variant: "ghost",
              className: "text-[var(--cc-secondary-text)]",
            })}
            to="/"
            title="Back To Menu"
          >
            <CaretLeftIcon weight="bold" size={18} />
            <span>Back to Menu</span>
          </Link>
        </nav>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-8 sm:pb-12">
          <div className="w-full max-w-md">
            {/* BRANDING */}
            <div className="mb-6 sm:mb-8 text-center">
              <img
                src="/logo.svg"
                alt="Bro & Bro"
                className="h-10 sm:h-12 mx-auto mb-4"
              />
            </div>

            {/* HERO HEADLINE */}
            <div className="mb-8 sm:mb-10 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-[var(--cc-text)] mb-2">
                Your Easy Access
              </h1>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-[var(--cc-primary)] mb-4">
                To Delicious Meals
              </h1>
              <p className="text-sm sm:text-base text-[var(--cc-secondary-text)] leading-relaxed">
                Fresh food. Great taste.
                <br />
                Happier moments.
              </p>
            </div>

            {/* HERO IMAGE */}
            <div className="mb-8 sm:mb-10 -mx-4 sm:mx-0">
              <img
                src="/login-banner.jpg"
                alt="Your Easy Access To Delicious Meals"
                className="w-screen sm:w-full sm:rounded-3xl overflow-hidden aspect-video object-cover"
              />
            </div>

            {/* LOGIN CARD */}
            <div className="bg-[var(--cc-card)] rounded-3xl p-6 sm:p-8 shadow-sm">
              {/* Card Header */}
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--cc-text)]">
                  Welcome back
                </h2>
                <p className="text-sm sm:text-base text-[var(--cc-secondary-text)] mt-1">
                  Login to your account
                </p>
              </div>

              {/* Error Message */}
              {(loginMutation.isError || noToken) && (
                <div className="mb-4 rounded-xl border border-[var(--cc-error)]/20 bg-[var(--cc-error-bg)] px-4 py-3 text-sm text-[var(--cc-error)]">
                  {noToken
                    ? "No token returned from server"
                    : "Invalid phone or password"}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={submit} className="space-y-5">
                {/* Phone/Username Field */}
                <Field>
                  <FieldLabel htmlFor="identifier" className="text-sm font-medium text-[var(--cc-text)]">
                    Phone Number / Username
                  </FieldLabel>
                  <FieldContent>
                    <InputGroup className="h-11 sm:h-12">
                      <div className="flex items-center justify-center pl-3 text-[var(--cc-secondary-text)]">
                        <PhoneIcon size={20} weight="regular" />
                      </div>
                      <InputGroupInput
                        ref={firstFormField}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        placeholder="e.g. 1234567890 or admin"
                        name="identifier"
                        id="identifier"
                        className="text-base sm:text-base"
                      />
                    </InputGroup>
                  </FieldContent>
                </Field>

                {/* Password Field */}
                <Field>
                  <FieldLabel htmlFor="password" className="text-sm font-medium text-[var(--cc-text)]">
                    Password
                  </FieldLabel>
                  <FieldContent>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-[var(--cc-secondary-text)] pointer-events-none z-10">
                        <LockIcon size={20} weight="regular" />
                      </div>
                      <PasswordInput
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 sm:h-12 pl-10"
                        required
                        name="password"
                        id="password"
                        placeholder="Enter your password"
                      />
                    </div>
                  </FieldContent>
                </Field>

                {/* Forgot Password Link */}
                <div className="flex justify-end pt-1">
                  <Link
                    to="/forget-password"
                    className="text-sm font-medium text-[var(--cc-primary)] hover:text-[var(--cc-primary-dark)] transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  size="lg"
                  disabled={loginMutation.isPending}
                  className="w-full h-12 sm:h-13 text-base font-semibold bg-[var(--cc-primary)] hover:bg-[var(--cc-primary-dark)] text-white rounded-xl transition-all"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                  <Separator className="flex-1 bg-[var(--cc-border)]" />
                  <span className="text-xs sm:text-sm text-[var(--cc-secondary-text)] font-medium">
                    OR
                  </span>
                  <Separator className="flex-1 bg-[var(--cc-border)]" />
                </div>

                {/* Create Account Button */}
                <Link
                  to="/register"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className:
                      "w-full h-12 sm:h-13 text-base font-semibold border-2 border-[var(--cc-primary)] text-[var(--cc-primary)] hover:bg-[var(--cc-primary-light)] rounded-xl transition-all",
                  })}
                >
                  <UserPlusIcon size={20} weight="regular" />
                  Create Account
                </Link>
              </form>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t border-[var(--cc-border)] bg-white px-4 sm:px-6 py-8 sm:py-10 mt-auto">
          <div className="max-w-4xl mx-auto">
            {/* Footer Content */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {/* Brand Info */}
              <div className="sm:col-span-2 lg:col-span-1">
                <img
                  src="/logo.svg"
                  alt="Bro & Bro"
                  className="h-8 mb-3"
                />
                <p className="text-xs sm:text-sm text-[var(--cc-secondary-text)]">
                  FOOD COURT
                </p>
                <p className="text-xs sm:text-sm text-[var(--cc-muted-text)] mt-2 leading-relaxed">
                  Fresh, quality food delivered to your door
                </p>
              </div>

              {/* Contact Info */}
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[var(--cc-text)] mb-3">
                  Contact
                </p>
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-[var(--cc-secondary-text)]">
                    Pragati Nagar, Hyderabad
                  </p>
                  <a
                    href="mailto:support@broandbro.com"
                    className="text-xs sm:text-sm text-[var(--cc-primary)] hover:text-[var(--cc-primary-dark)] transition-colors block"
                  >
                    support@broandbro.com
                  </a>
                  <a
                    href="tel:+919876543210"
                    className="text-xs sm:text-sm text-[var(--cc-primary)] hover:text-[var(--cc-primary-dark)] transition-colors block"
                  >
                    +91 9876 543 210
                  </a>
                </div>
              </div>

              {/* Value Indicators */}
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[var(--cc-text)] mb-3">
                  Why Us
                </p>
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-[var(--cc-secondary-text)]">
                    ✓ Fresh Food
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--cc-secondary-text)]">
                    ✓ Multiple Cuisines
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--cc-secondary-text)]">
                    ✓ Great Experience
                  </p>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-[var(--cc-border)] mt-6 sm:mt-8 pt-6 sm:pt-8">
              <p className="text-xs sm:text-sm text-[var(--cc-muted-text)] text-center">
                © 2024 Bro & Bro. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  },
});
