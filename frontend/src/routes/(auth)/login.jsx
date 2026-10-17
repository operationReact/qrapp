import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { setUserAuth } from "@/services";
import { loginUser } from "@/services/auth-service";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { CaretLeftIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { PasswordInput } from "@/components/ui/password-input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { RegistrationPurposeControl } from "@/components/registration-purpose-control";
import { useAuth } from "@/context/AuthContext";
import { extractApiError } from "@/lib/apiError";
import { canAccessAdmin } from "@/lib/roles";
import { getSafeRedirect } from "@/lib/safeRedirect";

export const Route = createFileRoute("/(auth)/login")({
  component: function UserLogin() {
    const { setUser } = useAuth();
    const location = useLocation();
    const from = getSafeRedirect(location.state?.from);

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");

    const firstFormField = useRef(null);
    useEffect(() => {
      firstFormField.current?.focus();
    }, []);

    const [noToken, setNoToken] = useState(false);
    const [loginError, setLoginError] = useState(null);

    const loginMutation = useMutation({
      mutationFn: loginUser,
      onError: (error) => {
        setLoginError(extractApiError(error, "Unable to sign in. Check your details and try again."));
      },
      onSuccess: (data) => {
        if (!data.token) {
          setNoToken(true);
          setLoginError(null);
          return;
        }
        setUserAuth(data.token);
        setUser({ ...data.user, token: data.token });
        if (data.mustChangePassword || data.user?.mustChangePassword) {
          window.location.assign("/change-password");
        } else if (from) {
          window.location.assign(from);
        } else {
          const role = data.user?.role || "";
          let target = "/";
          if (role.startsWith("PARTNER_")) target = "/partner";
          else if (canAccessAdmin(data.user)) target = "/admin";
          window.location.assign(target);
        }
      },
    });

    const submit = (e) => {
      e.preventDefault();
      setNoToken(false);
      setLoginError(null);
      loginMutation.mutate({ phone: identifier, password });
    };

    return (
      <div className="auth-login-page">
        <aside className="auth-login-promo" aria-label="Bro & Bro">
          <div className="auth-login-promo-content">
            <img src="/bro-logo.png" alt="Bro & Bro" className="auth-login-logo" />
            <p className="auth-login-kicker">Workplace food, made better</p>
            <h1>Good food brings people together.</h1>
            <p className="auth-login-promo-copy">
              Order delicious meals for your workplace with the Bro & Bro experience.
            </p>
            <img
              src="/login-banner.jpg"
              alt="Delicious meals from Bro & Bro"
              className="auth-login-promo-image"
            />
          </div>
        </aside>
        <main className="auth-login-main">
          <div className="auth-login-card">
            <div className="auth-login-mobile-brand">
              <img src="/bro-logo.png" alt="Bro & Bro" className="auth-login-logo" />
              <div>
                <p className="auth-login-kicker">Welcome back</p>
                <p className="auth-login-mobile-copy">Sign in to your account</p>
              </div>
            </div>
            <div className="auth-login-back">
            <Link
              className={buttonVariants({
                size: "xs",
                variant: "ghost",
                className: "",
              })}
              to="/"
              title="Back To Menu"
            >
              <CaretLeftIcon weight="bold" />
              <span>Back To Menu</span>
            </Link>
            </div>
            <div className="auth-login-heading">
              <p className="auth-login-kicker">Secure access</p>
              <h1>Welcome back</h1>
              <p>Sign in to continue to your Bro & Bro account.</p>
            </div>
            {(loginMutation.isError || noToken) && (
              <div className="auth-login-error" role="alert" aria-live="polite">
                {noToken
                  ? "Sign in could not be completed because the server did not return a session."
                  : loginError || "Unable to sign in. Check your details and try again."}
              </div>
            )}
            <form onSubmit={submit} className="auth-login-form">
              <Field className="gap-2">
                <FieldLabel
                  htmlFor="identifier"
                  className="text-[13px] font-semibold text-[#2B2928]"
                >
                  WhatsApp Number
                </FieldLabel>
                <FieldContent>
                  <InputGroup className="h-[52px] rounded-[14px] border-[#E6E0DB] bg-[#FFFCF9] shadow-none transition-[border-color,box-shadow] focus-within:!border-[#FF2438] focus-within:!ring-2 focus-within:!ring-[#FF2438]/20">
                    <InputGroupInput
                      ref={firstFormField}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      placeholder="9123456789"
                      name="identifier"
                      id="identifier"
                      className="h-full rounded-none border-0 bg-transparent px-3.5 py-0 text-[15px] font-medium text-[#77716D] shadow-none outline-none placeholder:text-[#77716D] placeholder:font-medium focus-visible:border-0 focus-visible:ring-0"
                    />
                    <InputGroupAddon
                      align="inline-start"
                      className="pl-3.5 pr-0 text-[#6E9A85]"
                    >
                      <WhatsappLogoIcon
                        size={18}
                        weight="duotone"
                        aria-hidden
                        className="text-[#6E9A85]"
                      />
                    </InputGroupAddon>
                  </InputGroup>
                </FieldContent>
              </Field>
              <Field className="gap-2">
                <FieldLabel
                  htmlFor="password"
                  className="text-[13px] font-semibold text-[#2B2928]"
                >
                  Password
                </FieldLabel>
                <FieldContent>
                  <RegistrationPurposeControl
                    type="password"
                    label="Password"
                    className="[&>svg]:text-[#8E7670]"
                  >
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-[52px] rounded-[14px] border-[#E6E0DB] bg-[#FFFCF9] shadow-none transition-[border-color,box-shadow] focus-within:!border-[#FF2438] focus-within:!ring-2 focus-within:!ring-[#FF2438]/20 [&>input]:h-full [&>input]:rounded-none [&>input]:border-0 [&>input]:bg-transparent [&>input]:py-0 [&>input]:text-[15px] [&>input]:font-medium [&>input]:text-[#77716D] [&>input]:shadow-none [&>input]:outline-none [&>input]:placeholder:text-[#77716D] [&>input]:placeholder:font-medium [&>input]:focus-visible:border-0 [&>input]:focus-visible:ring-0 [&>button]:mr-1 [&>button]:size-9"
                      required
                      name="password"
                      id="password"
                      autoComplete="current-password"
                    />
                  </RegistrationPurposeControl>
                </FieldContent>
              </Field>
              <Link
                to="/forget-password"
                className={buttonVariants({
                  variant: "link",
                  size: "sm",
                  className:
                    "-mt-2 mr-0 ml-auto flex! w-fit justify-end text-[13px] font-medium",
                })}
              >
                Forgot Password?
              </Link>
              <div className="auth-login-actions">
                <Button
                  type="submit"
                  size="lg"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>

                <FieldSeparator className="auth-login-separator">OR</FieldSeparator>

                <Link
                  to="/register"
                  state={from ? { from } : undefined}
                  className={`${buttonVariants({ variant: "outline", size: "lg" })} auth-login-create`}
                >
                  Create Account
                </Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  },
});
