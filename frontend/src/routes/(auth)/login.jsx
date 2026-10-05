import { createFileRoute } from "@tanstack/react-router";
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
        setUserAuth(data.token);
        setUser({ ...data.user, token: data.token });
        window.location.assign("/admin");
      },
    });

    const submit = (e) => {
      e.preventDefault();
      loginMutation.mutate({ phone: identifier, password });
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
            <div className="mb-4 mt-4">
              <h1 className="text-lg font-semibold">
                Welcome back,
                <span className="text-primary"> Login Your Account</span>
              </h1>
            </div>
            {(loginMutation.isError || noToken) && (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {noToken
                  ? "No token returned from server"
                  : "Invalid phone or password"}
              </div>
            )}
            <form onSubmit={submit} className="space-y-5 font-sans">
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
              <div className="flex mt-5 flex-col gap-2 justify-center">
                <Button
                  type="submit"
                  size="lg"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>

                <FieldSeparator>OR</FieldSeparator>

                <Link
                  to="/register"
                  className={buttonVariants({ variant: "ghost", size: "lg" })}
                >
                  Create Account
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  },
});
