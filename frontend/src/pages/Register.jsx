import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API, { generateOTP, loginUser, verifyOTP } from "../services/api";
import { setUserAuth } from "../services/api";
import { useUserAuth } from "../context/UserAuthContext";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CaretLeftIcon } from "@phosphor-icons/react";
import OTPVerifyCard from "@/components/OTPVerifyCard";

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useUserAuth();
  const [params, setSearchParams] = useSearchParams();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [otp, setOTP] = useState("");

  const handleGenerateOTP = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await generateOTP({ userName: name, phone });
      setSearchParams("verify");
    } catch (err) {
      console.error("generateOTP failed", err);
      setError(err?.response?.data || "Unable to generate OTP");
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const otpVerified = await verifyOTP({ phone, otp: params.get("otp") });

      if (otpVerified.data?.sucesss !== true) {
        setError("OTP verification failed");
        setLoading(false);
        return;
      }

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
          {params.has("verify") ? (
            <OTPVerifyCard
              title="Verify Your Number"
              description="Enter the OTP sent to your phone"
              verificationMedium={`+91-${phone}`}
              onVerify={createAccount}
            />
          ) : (
            <>
              <img
                src="/login-banner.jpg"
                alt="Your Easy Access To Delicious Meals"
                className="w-full border border-muted login-banner rounded-[14px] overflow-hidden"
              />
              <h1 className="mb-2 mt-4 text-2xl font-semibold">
                Create Account
              </h1>
              {/* <p className="mb-4 text-sm text-gray-500">Register to track orders and use wallet checkout faster.</p> */}
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
                    <Input
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
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10"
                    />
                  </FieldContent>
                </Field>
                <div className="flex mt-5 flex-col gap-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-10 text-sm! font-medium!"
                  >
                    {loading ? "Creating..." : "Create Account"}
                  </Button>
                  <Link
                    className={buttonVariants({ variant: "ghost", size: "lg" })}
                    to="/login"
                  >
                    Already Have An Account?
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
        {/* <OTPVerifyCard
          title="Verify Your Number"
          description="Enter the OTP sent to your phone"
          verificationMedium="+91-600025634"
          onVerify={() => {}}
        />*/}
      </div>
    </div>
  );
}
