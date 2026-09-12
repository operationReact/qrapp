import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { generateOTP, loginUser, registerUser } from "@/services/auth-service";
import { setUserAuth } from "@/services";
import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CaretLeftIcon } from "@phosphor-icons/react";
import OTPVerifyDialog from "@/components/OTPVerifyDialog";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/(auth)/register")({
  component: function Register() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const search = useSearch({ strict: false });

    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);

    const otpMutation = useMutation({
      mutationFn: () => generateOTP({ userName: name, phone }),
      onSuccess: () => {
        navigate({ to: "/register", search: { verify: true } });
      },
      onError: (err) => {
        setError(err?.response?.data || "Failed to generate OTP");
      },
    });

    const registerMutation = useMutation({
      mutationFn: async () => {
        await registerUser({ phone, password, name });
        return loginUser({ phone, password });
      },
      onSuccess: (data) => {
        const token = data?.token;
        if (!token) {
          setError("Registration succeeded but no token returned");
          return;
        }
        setUser({ token, info: data.user || { phone, name } });
        setUserAuth(token);
        navigate({ to: "/" });
      },
      onError: (err) => {
        setError(err?.response?.data || "Unable to register");
      },
    });

    const handleGenerateOTP = (e) => {
      e.preventDefault();
      setError(null);
      otpMutation.mutate();
    };

    const handleResendOTP = () => otpMutation.mutateAsync();

    const handleOTPVerified = () => {
      setError(null);
      registerMutation.mutate();
    };

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
          onResend={handleResendOTP}
        />
      </div>
    );
  },
});
