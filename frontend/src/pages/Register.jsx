import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { loginUser } from "../services/api";
import { setUserAuth } from "../services/api";
import { useUserAuth } from "../context/UserAuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "@boxicons/react";

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useUserAuth();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Focus the first input field on mounting the component - UX CHOICE
  const firstFormField = useRef(null);

  useEffect(() => {
    firstFormField.current?.focus();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await API.post("/auth/register", { phone, password, name });
      // auto-login after register
      const res = await loginUser({ phone, password });
      const data = res.data || {};
      const token = data.token;
      if (!token) {
        setError("Registration succeeded but no token returned");
        setLoading(false);
        return;
      }
      // persist user in context
      setUser({ token, info: data.user || { phone, name } });
      // set axios header
      setUserAuth(token);
      navigate("/");
    } catch (err) {
      console.error("register failed", err);
      setError(err?.response?.data || "Unable to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex min-h-screen justify-center py-6 sm:px-4">
      <div className="w-full max-w-md ">
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
            src="/login-banner-2.jpg"
            alt="Your Easy Access To Delicious Meals"
            className="w-full border border-muted rounded-[14px] overflow-hidden"
          />
          <h1 className="mb-2 mt-4 text-2xl font-semibold">Create Account</h1>
          {/* <p className="mb-4 text-sm text-gray-500">Register to track orders and use wallet checkout faster.</p> */}
          {error && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            <label className="block mb-2">
              <span className="text-sm font-medium text-zinc-600">
                Phone Number
              </span>
              <input
                ref={firstFormField}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent focus-visible:outline-transparent"
              />
            </label>
            <label className="block mb-2">
              <span className="text-sm font-medium text-zinc-600">
                Name (optional)
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent focus-visible:outline-transparent"
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
                className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent focus-visible:outline-transparent"
              />
            </label>
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-12 font-medium!"
              >
                {loading ? "Creating..." : "Create Account"}
              </Button>
              <Link
                to="/login"
                className="text-zinc-600 font-medium hover:underline focus-visible:underline rounded-xl px-4 py-4 text-center"
              >
                Already Have An Account?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
