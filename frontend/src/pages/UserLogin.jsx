import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import API, { loginUser } from "../services/api";
import { useUserAuth } from "../context/UserAuthContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CaretLeft, ChevronLeft } from "@boxicons/react";

export default function UserLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useUserAuth();
  const { admin, setAdmin } = useAdminAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const returnPath =
    typeof location.state?.from === "string" ? location.state.from : null;

  // Focus the first input field on mounting the component - UX CHOICE
  const firstFormField = useRef(null);
  useEffect(() => {
    firstFormField.current?.focus()
  },[])

  useEffect(() => {
    if (user && user.token) {
      navigate(
        returnPath && !returnPath.startsWith("/admin") ? returnPath : "/",
      );
    }
    if (admin && admin.username && admin.password) {
      navigate(
        returnPath && returnPath.startsWith("/admin") ? returnPath : "/admin",
      );
    }
  }, [user, admin, navigate, returnPath]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const id = (identifier || "").trim();
    const isAdminLogin = id.toLowerCase() === "admin";
    try {
      if (isAdminLogin) {
        await API.post("/admin/login", { username: id, password });
        setUser(null);
        setAdmin({ username: id, password });
        navigate(
          returnPath && returnPath.startsWith("/admin") ? returnPath : "/admin",
        );
        return;
      }

      const res = await loginUser({ phone: id, password });
      const data = res.data || {};
      const token = data.token;
      if (!token) {
        setError("No token returned from server");
        setLoading(false);
        return;
      }
      setAdmin(null);
      setUser({ token, info: data.user || { phone: id } });
      navigate(
        returnPath && !returnPath.startsWith("/admin") ? returnPath : "/",
      );
    } catch (err) {
      console.error("login failed", err);
      if (isAdminLogin) setError("Invalid admin username or password");
      else setError("Invalid phone or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex w-full min-h-screen justify-center py-6 sm:px-4">
      <div className="w-full max-w-md">
        <div className="px-4 sm:px-0">
          <Button
            title="Back To Menu"
            size="icon-lg"
            asChild
            variant="outline"
            className="font-medium! rounded-xl shadow-sm shadow-red-500/10 sm:absolute sm:left-4 flex items-center text-sm text-zinc-600 hover:text-zinc-600/90 w-fit px-1"
          >
            <Link to="/">
              <ChevronLeft className="size-7" />
              <span className="sr-only">Back To Menu</span>
            </Link>
          </Button>
        </div>
        <div className="rounded-2xl p-4 sm:p-6 sm:shadow-lg sm:shadow-red-300/10 h-fit sm:bg-white/20">
          <img
            src="/login-banner.jpg"
            alt="Your Easy Access To Delicious Meals"
            className="w-full rounded-[14px] overflow-hidden"
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
          <form onSubmit={submit}>
            <label className="block mb-2">
              <span className="text-sm font-medium text-zinc-600">
                Phone Number / Username
              </span>
              <input
                ref={firstFormField}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent focus-visible:outline-transparent"
                placeholder="e.g. 1234567890 or admin"
              />
            </label>
            <label className="block mb-6">
              <span className="text-sm font-medium text-zinc-600">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent focus-visible:outline-transparent"
              />
            </label>
            <div className="flex flex-col gap-2 justify-center">
              <Button
                type="submit"
                disabled={loading}
                className="h-12 font-medium!"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              {/* <Link to="/" className="text-sm text-gray-600">Back to menu</Link> */}
              <Link
                to="/register"
                className="text-zinc-600 font-medium hover:underline focus-visible:underline rounded-xl px-4 py-4 text-center"
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
