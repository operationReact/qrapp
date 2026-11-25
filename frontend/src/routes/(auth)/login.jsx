import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { setUserAuth } from "@/services";
import { loginUser, requestLoginOTP, verifyLoginOTP } from "@/services/auth-service";
import OTPVerifyDialog from "@/components/OTPVerifyDialog";
import GoogleCustomerSignIn from "@/components/GoogleCustomerSignIn";
import { normalizeIndianMobileInput } from "@/lib/authRegistrationFlow";
import { getPendingGoogleLink, rememberGoogleLink, clearPendingGoogleLink } from "@/lib/pendingGoogleLink";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldLabel,
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
    const [method, setMethod] = useState("otp");
    const [otpOpen, setOtpOpen] = useState(false);
    const [googleLink, setGoogleLink] = useState(() => getPendingGoogleLink());
    const [linkWarning, setLinkWarning] = useState(null);

    const firstFormField = useRef(null);
    useEffect(() => {
      firstFormField.current?.focus();
    }, []);

    const [noToken, setNoToken] = useState(false);
    const [loginError, setLoginError] = useState(null);

    const completeLogin = (data) => {
        if (data.googleLinkFailed) {
          clearPendingGoogleLink();
          setGoogleLink(null);
          setOtpOpen(false);
          setLinkWarning({ ...data, googleLinkFailed: false });
          return;
        }
        clearPendingGoogleLink();
        if (!data.token) {
          setNoToken(true);
          setLoginError(null);
          return;
        }
        setUserAuth(data.token);
        setUser({ ...data.user, token: data.token });
        if (!canAccessAdmin(data.user)) {
          const defaultLocation = data.user?.defaultLocation;
          const stored = (() => { try { return JSON.parse(localStorage.getItem("active-location") || "null"); } catch { return null; } })();
          if (defaultLocation?.id && !stored?.selectedByUser) {
            localStorage.setItem("active-location", JSON.stringify({ ...defaultLocation, selectedByUser: true }));
          }
        }
        if (data.mustChangePassword || data.user?.mustChangePassword) {
          window.location.assign("/change-password");
        } else if (from) {
          window.location.assign(from);
        } else {
          const role = data.user?.role || "";
          let target = "/";
          if (role.startsWith("PARTNER_")) target = "/partner";
          else if (role === "VENDOR") target = "/vendor";
          else if (canAccessAdmin(data.user)) target = "/admin";
          window.location.assign(target);
        }
    };
    const loginMutation = useMutation({
      mutationFn: loginUser,
      onError: (error) => setLoginError(extractApiError(error, "Unable to sign in. Check your details and try again.")),
      onSuccess: completeLogin,
    });
    const otpMutation = useMutation({
      mutationFn: () => requestLoginOTP(identifier),
      onSuccess: () => setOtpOpen(true),
      onError: () => setLoginError("Unable to send a verification code. Check your number or try again in a minute."),
    });
    const selectMethod = (next) => {
      setMethod(next); setLoginError(null); setNoToken(false);
      if (next === "password") { clearPendingGoogleLink(); setGoogleLink(null); }
    };
    const handleGoogleResult = (result) => {
      if (result.status === "signed_in") completeLogin(result.session);
      else if (result.status === "mobile_verification_required") {
        const pending = { ticket: result.ticket, name: result.name };
        rememberGoogleLink(pending);
        setGoogleLink(pending);
        setMethod("otp");
        setLoginError(null);
        requestAnimationFrame(() => firstFormField.current?.focus());
      }
    };

    const submit = (e) => {
      e.preventDefault();
      setNoToken(false);
      setLoginError(null);
      if (method === "otp") {
        if (!/^[6-9]\d{9}$/.test(identifier)) { setLoginError("Enter a valid 10-digit Indian mobile number."); return; }
        otpMutation.mutate();
      } else loginMutation.mutate({ phone: identifier, password });
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
              <p className="auth-login-mobile-copy">FOOD COURT EXPERIENCE</p>
            </div>
            <div className="auth-login-back">
            <Link
              className={buttonVariants({
                size: "xs",
                variant: "ghost",
                className: "",
              })}
              to="/"
              title="Back To Locations"
            >
              <CaretLeftIcon weight="bold" />
              <span>Back To Locations</span>
            </Link>
            </div>
            <div className="auth-login-heading">
              <h1>Welcome back</h1>
              <p>Your favourites are one sign-in away.</p>
            </div>
            {(loginError || noToken) && (
              <div className="auth-login-error" role="alert" aria-live="polite">
                {noToken
                  ? "Sign in could not be completed because the server did not return a session."
                  : loginError || "Unable to sign in. Check your details and try again."}
              </div>
            )}
            {linkWarning && <div role="alert" className="auth-login-error">Google could not be linked. Your mobile is verified. <button type="button" onClick={() => completeLogin(linkWarning)} className="auth-inline-retry">Continue with mobile</button></div>}
            {googleLink && <div className="auth-google-link-notice" role="status">Verify your WhatsApp number to connect your Google account. New customer? Create an account below.</div>}
            {!googleLink && <GoogleCustomerSignIn onResult={handleGoogleResult} onError={setLoginError} />}
            <div className="auth-method-switch" aria-label="Sign-in method">
              <button type="button" aria-pressed={method === "otp"} onClick={() => selectMethod("otp")}>WhatsApp code</button>
              <button type="button" aria-pressed={method === "password"} onClick={() => selectMethod("password")}>Password</button>
            </div>
            <form onSubmit={submit} className="auth-login-form">
              <Field className="gap-2">
                <FieldLabel htmlFor="identifier">Mobile / WhatsApp number</FieldLabel>
                <FieldContent>
                  <InputGroup className="h-[52px] rounded-[14px] border-[#E6E0DB] bg-[#FFFCF9] shadow-none transition-[border-color,box-shadow] focus-within:!border-[#FF2438] focus-within:!ring-2 focus-within:!ring-[#FF2438]/20">
                    <InputGroupInput
                      ref={firstFormField}
                      value={identifier}
                      onChange={(e) => setIdentifier(normalizeIndianMobileInput(e.target.value))}
                      required
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      type="tel"
                      name="identifier"
                      id="identifier"
                      className="h-full rounded-none border-0 bg-transparent px-3.5 py-0 text-[15px] font-medium text-[#77716D] shadow-none outline-none placeholder:text-[#77716D] placeholder:font-medium focus-visible:border-0 focus-visible:ring-0"
                    />
                    <InputGroupAddon align="inline-start" className="pl-3.5 pr-0 text-[#6E9A85]">
                      <WhatsappLogoIcon size={18} weight="duotone" aria-hidden />
                      <span className="auth-phone-prefix">+91</span>
                    </InputGroupAddon>
                  </InputGroup>
                </FieldContent>
              </Field>
              {method === "password" && <>
              <Field className="gap-2">
                <FieldLabel htmlFor="password">Password</FieldLabel>
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
              </>}
              {method === "otp" && <p className="auth-field-hint">We’ll send a 6-digit WhatsApp code to your registered number. No password needed.</p>}
              <div className="auth-login-actions">
                <Button
                  type="submit"
                  size="lg"
                  className="auth-primary-action"
                  disabled={loginMutation.isPending || otpMutation.isPending || !!linkWarning}
                >
                  {method === "otp" ? (otpMutation.isPending ? "Sending code..." : "Continue with WhatsApp") : (loginMutation.isPending ? "Signing in..." : "Sign In")}
                </Button>

                <p className="auth-login-join">
                  New to Bro & Bro?{" "}
                  <Link to="/register" state={from ? { from } : undefined} className="auth-login-join-link">
                    Create an account
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </main>
        <OTPVerifyDialog open={otpOpen} onOpenChange={setOtpOpen} phone={identifier} contactLabel="WhatsApp number" onVerified={completeLogin} verifyOtp={(args) => verifyLoginOTP({ ...args, googleLinkTicket: googleLink?.ticket })} onResend={() => requestLoginOTP(identifier)} />
      </div>
    );
  },
});
