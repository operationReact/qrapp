import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "@/services/auth-service";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/(auth)/login")({
  component: function UserLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, setUser, isAdmin, isSuperUser } = useAuth();

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");

    const returnPath =
      typeof location.state?.from === "string" ? location.state.from : null;

    const firstFormField = useRef(null);
    useEffect(() => {
      firstFormField.current?.focus();
    }, []);

    useEffect(() => {
      if (!user) return;

      if (isAdmin || isSuperUser) {
        navigate({
          to:
            returnPath && returnPath.startsWith("/admin")
              ? returnPath
              : "/admin",
        });
        return;
      }

      navigate({
        to: returnPath && !returnPath.startsWith("/admin") ? returnPath : "/",
      });
    }, [user, isAdmin, isSuperUser, navigate, returnPath]);

    const [noToken, setNoToken] = useState(false);

    const loginMutation = useMutation({
      mutationFn: loginUser,
      onSuccess: (data) => {
        if (!data.token) {
          setNoToken(true);
          return;
        }
        setUser({ token: data.token, ...data.user });
        navigate({ to: returnPath ? returnPath : "/" });
      },
    });

    const submit = (e) => {
      e.preventDefault();
      loginMutation.mutate({ phone: identifier, password });
    };

    return (
      <div className="page-shell flex min-h-screen items-center justify-center py-6 sm:px-4">
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
              <h1 className="text-lg font-medium">
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
            <form onSubmit={submit} className="space-y-4">
              <Field>
                <FieldLabel htmlFor="identifier">Phone Number / Username</FieldLabel>
                <FieldContent>
                  <Input
                    ref={firstFormField}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder="e.g. 1234567890 or admin"
                    className="h-10"
                    name="identifier"
                    id="identifier"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <FieldContent>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10"
                    required
                    name="password"
                    id="password"
                  />
                </FieldContent>
              </Field>
              <Link
                to="/forget-password"
                className={buttonVariants({
                  variant: "link",
                  size: "sm",
                  className: "mt-0 mr-0 ml-auto flex! w-fit justify-end",
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

                <Link
                  to="/register"
                  className={buttonVariants({ variant: "ghost", size: "lg" })}
                >
                  Create An Account
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  },
});
