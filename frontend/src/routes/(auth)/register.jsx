import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { requestRegistrationOTP, verifyRegistrationOTP } from "@/services/auth-service";
import { apiClient, setUserAuth } from "@/services";
import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CaretLeftIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import OTPVerifyDialog from "@/components/OTPVerifyDialog";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { useAuth } from "@/context/AuthContext";
import { extractApiError } from "@/lib/apiError";
import { getSafeRedirect } from "@/lib/safeRedirect";
import { SPECIAL_DAY_TYPES } from "@/content/specialDayOptions";
import { RegistrationPurposeControl } from "@/components/registration-purpose-control";

export const Route = createFileRoute("/(auth)/register")({
  component: function Register() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const search = useSearch({ strict: false });
    const location = useLocation();
    const from = getSafeRedirect(location.state?.from);

    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [specialDate, setSpecialDate] = useState("");
    const [specialDayType, setSpecialDayType] = useState("");
    const [specialDayCustomLabel, setSpecialDayCustomLabel] = useState("");
    const [password, setPassword] = useState("");
    const [defaultLocationId, setDefaultLocationId] = useState("");
    const [customerCompanyId, setCustomerCompanyId] = useState("");
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [customerCompanySearch, setCustomerCompanySearch] = useState("");
    const companyComboboxAnchor = useComboboxAnchor();
    const locationComboboxAnchor = useComboboxAnchor();
    const occasionComboboxAnchor = useComboboxAnchor();
    const [error, setError] = useState(null);
    const locationsQuery = useQuery({
      queryKey: ["locations", "registration-selectable"],
      queryFn: async () => {
        const response = await apiClient.get("/api/locations/public");
        const body = response.data;
        const locations = Array.isArray(body)
          ? body
          : (body?.content || body?.data || body?.locations || []);
        return locations.filter((location) => location.active !== false && location.isActive !== false);
      },
      retry: 1,
    });
    const companiesQuery = useQuery({
      queryKey: ["customer-companies", "registration", defaultLocationId],
      enabled: Boolean(defaultLocationId),
      queryFn: async () => (await apiClient.get(`/api/locations/${defaultLocationId}/customer-companies`)).data,
      retry: 1,
    });

    const otpMutation = useMutation({
      mutationFn: () => requestRegistrationOTP({
        name,
        dateOfBirth,
        specialDate,
        specialDayType,
        specialDayCustomLabel,
        phone,
        password,
        ...(defaultLocationId ? { defaultLocationId } : {}),
        customerCompanyId: Number(customerCompanyId),
        termsAccepted,
      }),
      onSuccess: () => {
        navigate({ to: "/register", search: { verify: true }, state: from ? { from } : undefined });
      },
      onError: (err) => {
        const code = err?.response?.data;
        const message = code === "invalid_phone_number"
          ? "Enter a valid WhatsApp Number."
          : code === "phone_taken"
            ? "This WhatsApp Number is already registered."
            : extractApiError(err, "Failed to send WhatsApp OTP");
        setError(message);
      },
    });

    const handleOTPVerified = (data) => {
      const token = data?.token;
      if (!token) {
        setError("Registration succeeded but no token returned");
        return;
      }
      setUser({ token, info: data.user || { phone, name } });
      setUserAuth(token);
      if (from) window.location.assign(from);
      else navigate({ to: "/" });
    };

    const handleGenerateOTP = (e) => {
      e.preventDefault();
      setError(null);
      if (!termsAccepted) {
        setError("Please accept the Terms & Conditions and Privacy Policy to create your account.");
        return;
      }
      if (!defaultLocationId) {
        setError("Please select a Location.");
        return;
      }
      if (!customerCompanyId) {
        setError("Please select a Customer Company.");
        return;
      }
      otpMutation.mutate();
    };

    const handleResendOTP = () => otpMutation.mutateAsync();
    const selectedLocation = locationsQuery.data?.find(
      (location) => String(location.id) === String(defaultLocationId),
    );
    const selectedLocationName = selectedLocation
      ? selectedLocation.name || selectedLocation.title || `Location ${selectedLocation.id}`
      : "";

    return (
      <div className="auth-register-page flex w-full min-w-0 flex-1 items-center justify-center overflow-x-hidden py-6 sm:px-4">
        <div className="w-full min-w-0 max-w-md">
          <div className="px-4">
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
          <div className="h-fit min-w-0 rounded-xl p-4 pt-2">
            <img
              src="/login-banner.jpg"
              alt="Your Easy Access To Delicious Meals"
              className="w-full border border-muted login-banner rounded-[14px] overflow-hidden"
            />
            <h1 className="my-4 text-lg font-semibold">Create Account</h1>
            {error && (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <Field>
              <FieldLabel>Location <span className="text-red-600">*</span></FieldLabel>
              <FieldContent>
                {locationsQuery.isLoading && (
                  <div className="min-h-12 animate-pulse rounded-xl border bg-muted" aria-label="Loading locations" />
                )}
                {locationsQuery.isError && (
                  <p className="auth-form-error" role="alert" aria-live="polite">
                    {extractApiError(locationsQuery.error, "Locations are temporarily unavailable. Please try again before continuing.")}
                  </p>
                )}
                {locationsQuery.isSuccess && !locationsQuery.data.length && (
                  <p className="rounded-xl border border-muted px-3 py-3 text-sm text-muted-foreground">
                    No locations are currently available.
                  </p>
                )}
                {locationsQuery.isSuccess && locationsQuery.data.length > 0 && (
                  <Combobox
                    items={locationsQuery.data.map((location) => location.name || location.title || `Location ${location.id}`)}
                    value={selectedLocationName}
                    onValueChange={(value) => {
                      const selectedLocation = locationsQuery.data.find(
                        (location) => (location.name || location.title || `Location ${location.id}`) === value,
                      );
                      setDefaultLocationId(selectedLocation ? String(selectedLocation.id) : "");
                      setCustomerCompanyId("");
                      setCustomerCompanySearch("");
                    }}
                  >
                    <div ref={locationComboboxAnchor}>
                      <RegistrationPurposeControl type="location" label="Preferred Location">
                        <ComboboxInput
                          required
                          placeholder="Choose a location"
                          aria-label="Preferred Location"
                          className="min-h-12 w-full rounded-xl text-base"
                        />
                      </RegistrationPurposeControl>
                    </div>
                    <ComboboxContent anchor={locationComboboxAnchor}>
                      <ComboboxEmpty>No matching locations.</ComboboxEmpty>
                      <ComboboxList>
                        {locationsQuery.data.map((location) => {
                          const label = location.name || location.title || `Location ${location.id}`;
                          return <ComboboxItem key={location.id} value={label}>{label}</ComboboxItem>;
                        })}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )}
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>  Company <span className="text-red-600">*</span></FieldLabel>
              <FieldContent>
                {!defaultLocationId && <p className="rounded-xl border border-muted px-3 py-3 text-sm text-muted-foreground">Select a Location first.</p>}
                {defaultLocationId && companiesQuery.isLoading && <div className="min-h-12 animate-pulse rounded-xl border bg-muted" aria-label="Loading customer companies" />}
                {defaultLocationId && companiesQuery.isError && (
                  <p className="auth-form-error" role="alert" aria-live="polite">
                    {extractApiError(companiesQuery.error, "Customer Companies are temporarily unavailable. Please try again.")}
                  </p>
                )}
                {defaultLocationId && companiesQuery.isSuccess && !companiesQuery.data.length && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">No active Customer Companies are available at this Location.</p>}
                {defaultLocationId && companiesQuery.isSuccess && companiesQuery.data.length > 0 && (
                  <Combobox
                    items={companiesQuery.data.map((company) => company.name)}
                    value={customerCompanySearch}
                    onValueChange={(value) => {
                      const selectedCompany = companiesQuery.data.find((company) => company.name === value);
                      setCustomerCompanySearch(value);
                      setCustomerCompanyId(selectedCompany ? String(selectedCompany.id) : "");
                    }}
                  >
                    <div ref={companyComboboxAnchor}>
                      <RegistrationPurposeControl type="company" placeholder="Search Customer Company">
                        <ComboboxInput
                          required
                          placeholder="Search Customer Company"
                          className="h-10"
                        />
                      </RegistrationPurposeControl>
                    </div>
                    <ComboboxContent anchor={companyComboboxAnchor}>
                      <ComboboxEmpty>No matching Customer Companies.</ComboboxEmpty>
                      <ComboboxList>
                        {companiesQuery.data.map((company) => (
                          <ComboboxItem key={company.id} value={company.name}>
                            {company.name}
                          </ComboboxItem>
                        ))}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                )}
              </FieldContent>
            </Field>
            <form onSubmit={handleGenerateOTP} className="space-y-4">
              <Field>
                <FieldLabel>Name</FieldLabel>
                <FieldContent>
                  <RegistrationPurposeControl type="text" label="Name" placeholder="Your Name">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                      className="h-10"
                    />
                  </RegistrationPurposeControl>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Birth Date</FieldLabel>
                <FieldContent>
                  <RegistrationPurposeControl type="date" label="Birth Date">
                    <Input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      className="h-10"
                    />
                  </RegistrationPurposeControl>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>❤️ Special Day <span className="text-muted-foreground">(optional)</span></FieldLabel>
                <FieldContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <RegistrationPurposeControl type="date" label="Special Day">
                      <Input
                        type="date"
                        value={specialDate}
                        onChange={(e) => setSpecialDate(e.target.value)}
                        aria-label="❤️ Special Day"
                        className="h-10"
                      />
                    </RegistrationPurposeControl>
                    <Combobox
                      items={SPECIAL_DAY_TYPES}
                      value={specialDayType}
                      onValueChange={(value) => {
                        setSpecialDayType(value);
                        if (value !== "Other") setSpecialDayCustomLabel("");
                      }}
                    >
                      <div ref={occasionComboboxAnchor}>
                        <RegistrationPurposeControl type="select" label="Special Day occasion">
                          <ComboboxInput
                            placeholder="Choose an occasion"
                            aria-label="Special Day occasion"
                            className="h-10"
                          />
                        </RegistrationPurposeControl>
                      </div>
                      <ComboboxContent anchor={occasionComboboxAnchor}>
                        <ComboboxEmpty>No matching occasions.</ComboboxEmpty>
                        <ComboboxList>
                          {SPECIAL_DAY_TYPES.map((type) => (
                            <ComboboxItem key={type} value={type}>{type}</ComboboxItem>
                          ))}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>
                  {specialDayType === "Other" && (
                    <RegistrationPurposeControl type="text" label="Custom special day occasion">
                      <Input
                        value={specialDayCustomLabel}
                        onChange={(e) => setSpecialDayCustomLabel(e.target.value)}
                        placeholder="Enter your occasion"
                        maxLength={120}
                        aria-label="Custom special day occasion"
                        className="h-10"
                      />
                    </RegistrationPurposeControl>
                  )}
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>WhatsApp Number</FieldLabel>
                <FieldContent>
                  <PhoneInput
                    icon={WhatsappLogoIcon}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="Enter your WhatsApp number"
                    aria-label="WhatsApp Number"
                    className="h-10"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Password</FieldLabel>
                <FieldContent>
                  <RegistrationPurposeControl type="password" label="Password">
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 [&>input]:!pl-10"
                      required
                    />
                  </RegistrationPurposeControl>
                </FieldContent>
              </Field>
              <div className="flex mt-5 flex-col gap-2">
                <div className="flex items-start gap-3 rounded-xl border border-muted bg-muted/20 p-3 text-sm">
                  <Checkbox
                    id="terms-accepted"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => {
                      setTermsAccepted(checked === true);
                      if (checked === true && error === "Please accept the Terms & Conditions and Privacy Policy to create your account.") {
                        setError(null);
                      }
                    }}
                    aria-describedby="terms-accepted-description"
                  />
                  <label id="terms-accepted-description" htmlFor="terms-accepted" className="leading-5">
                    I agree to the{" "}
                    <a href="/terms-and-conditions" target="_blank" rel="noreferrer" className="font-medium text-primary underline">
                      Terms &amp; Conditions
                    </a>{" "}
                    and{" "}
                    <a href="/privacy-policy" target="_blank" rel="noreferrer" className="font-medium text-primary underline">
                      Privacy Policy
                    </a>.
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={otpMutation.isPending || !termsAccepted}
                  className="h-10 text-sm! font-medium!"
                >
                  {otpMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
                <Link
                  className={buttonVariants({ variant: "ghost", size: "lg" })}
                  to="/login"
                  state={from ? { from } : undefined}
                >
                  Already Have An Account?
                </Link>
              </div>
            </form>
          </div>
        </div>
        <OTPVerifyDialog
          open={"verify" in search && !!phone}
          onOpenChange={(next) => {
            if (!next) navigate({ to: "/register", search: {} });
          }}
          phone={phone}
          contactLabel="WhatsApp Number"
          onVerified={handleOTPVerified}
          verifyOtp={verifyRegistrationOTP}
          onResend={handleResendOTP}
        />
      </div>
    );
  },
});
