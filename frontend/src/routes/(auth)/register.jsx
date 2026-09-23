import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { requestRegistrationOTP, verifyRegistrationOTP } from "@/services/auth-service";
import { apiClient, setUserAuth } from "@/services";
import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CaretLeftIcon } from "@phosphor-icons/react";
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

export const Route = createFileRoute("/(auth)/register")({
  component: function Register() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const search = useSearch({ strict: false });

    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [defaultLocationId, setDefaultLocationId] = useState("");
    const [customerCompanyId, setCustomerCompanyId] = useState("");
    const [customerCompanySearch, setCustomerCompanySearch] = useState("");
    const companyComboboxAnchor = useComboboxAnchor();
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
        phone,
        password,
        ...(defaultLocationId ? { defaultLocationId } : {}),
        customerCompanyId: Number(customerCompanyId),
      }),
      onSuccess: () => {
        navigate({ to: "/register", search: { verify: true } });
      },
      onError: (err) => {
        setError(extractApiError(err, "Failed to generate OTP"));
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
      navigate({ to: "/" });
    };

    const handleGenerateOTP = (e) => {
      e.preventDefault();
      setError(null);
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

    return (
      <div className="flex w-full flex-1 items-center justify-center py-6 sm:px-4">
        <div className="w-full max-w-md">
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
          <div className="rounded-xl p-4 pt-2 h-fit">
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
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                    Locations are temporarily unavailable.                     Please try again before continuing.
                  </p>
                )}
                {locationsQuery.isSuccess && !locationsQuery.data.length && (
                  <p className="rounded-xl border border-muted px-3 py-3 text-sm text-muted-foreground">
                    No locations are currently available.
                  </p>
                )}
                {locationsQuery.isSuccess && locationsQuery.data.length > 0 && (
                  <select
                    value={defaultLocationId}
                    onChange={(event) => {
                      setDefaultLocationId(event.target.value);
                      setCustomerCompanyId("");
                      setCustomerCompanySearch("");
                    }}
                    className="min-h-12 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Preferred Location"
                  >
                    <option value="">Choose a location</option>
                    {locationsQuery.data.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name || location.title || `Location ${location.id}`}
                      </option>
                    ))}
                  </select>
                )}
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>  Company <span className="text-red-600">*</span></FieldLabel>
              <FieldContent>
                {!defaultLocationId && <p className="rounded-xl border border-muted px-3 py-3 text-sm text-muted-foreground">Select a Location first.</p>}
                {defaultLocationId && companiesQuery.isLoading && <div className="min-h-12 animate-pulse rounded-xl border bg-muted" aria-label="Loading customer companies" />}
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
                      <ComboboxInput
                        required
                        placeholder="Search Customer Company"
                        className="h-10"
                      />
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
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="h-10"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Phone Number</FieldLabel>
                <FieldContent>
                  <PhoneInput
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="1234567890"
                    className="h-10"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Password</FieldLabel>
                <FieldContent>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10"
                    required
                  />
                </FieldContent>
              </Field>
              <div className="flex mt-5 flex-col gap-2">
                <Button
                  type="submit"
                  disabled={otpMutation.isPending}
                  className="h-10 text-sm! font-medium!"
                >
                  {otpMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
                <Link
                  className={buttonVariants({ variant: "ghost", size: "lg" })}
                  to="/login"
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
          onVerified={handleOTPVerified}
          verifyOtp={verifyRegistrationOTP}
          onResend={handleResendOTP}
        />
      </div>
    );
  },
});
