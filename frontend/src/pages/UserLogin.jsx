import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import API, { loginUser } from "../services/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuth } from "@/context/AuthContext";

export default function UserLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, isAdmin, isSuperUser } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const returnPath =
    typeof location.state?.from === "string" ? location.state.from : null;

  // Focus the first input field on mounting the component - UX CHOICE
  const firstFormField = useRef(null);
  useEffect(() => {
    firstFormField.current?.focus();
  }, []);

  useEffect(() => {
    if (!user) return;

    if (isAdmin || isSuperUser) {
      navigate(
        returnPath && returnPath.startsWith("/admin") ? returnPath : "/admin",
      );
      return;
    }

    navigate(returnPath && !returnPath.startsWith("/admin") ? returnPath : "/");
  }, [user, isAdmin, isSuperUser, navigate, returnPath]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginUser({ phone: identifier, password });
      const data = res.data || {};
      const token = data.token;

      if (!token) {
        setError("No token returned from server");
        setLoading(false);
        return;
      }

      setUser({ token: data.token, ...data.user });
      navigate(
        returnPath && !returnPath.startsWith("/admin") ? returnPath : "/",
      );
    } catch (err) {
      console.error("login failed", err);
      setError("Invalid phone or password");
    } finally {
      setLoading(false);
    }
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
          <div className="mb-2 mt-4">
            <h1 className="text-2xl font-semibold">Login Your Account</h1>
            {/* <p className="text-sm text-gray-500">Enter your phone number to sign in. If the username is <span className="font-semibold text-gray-700">admin</span>, you will be taken to the admin dashboard after successful login.</p> */}
          </div>
          {error && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <Field>
              <FieldLabel>Phone Number / Username</FieldLabel>
              <FieldContent>
                <Input
                  ref={firstFormField}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="e.g. 1234567890 or admin"
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
            <div className="flex mt-5 flex-col gap-2 justify-center">
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
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
}
