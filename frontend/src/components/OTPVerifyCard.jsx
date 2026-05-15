import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Field, FieldLabel } from "./ui/field";
import { Button } from "./ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

const OTP_LENGTH = 6;
const RESEND_OTP_TIMER = 35;

export default function OtpVerification({
  title,
  description,
  verificationMedium,
  onVerify,
  onResend,
}) {
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(RESEND_OTP_TIMER);

  useEffect(() => {
    let interval;
    if (resendTimer === 0) {
      clearInterval(interval);
      return;
    }

    interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  async function handleVerifyOTP() {
    await onVerify(otp);
  }

  function resendOTP() {
    setResendTimer(RESEND_OTP_TIMER);
    onResend();
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description}:{" "}
          <span className="font-medium">{verificationMedium}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel className="sr-only" htmlFor="otp-verification">
              Verification code
            </FieldLabel>
          </div>
          <InputOTP
            pattern={REGEXP_ONLY_DIGITS}
            value={otp}
            onChange={(value) => setOtp(value)}
            maxLength={OTP_LENGTH}
            id="otp-verification"
            required
          >
            <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
              {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>

          {/* <div>
            {resendTimer === 0 ? (
              <Button
                variant="link"
                size="sm"
                onClick={resendOTP}
                className="pl-0"
              >
                Resend Code
              </Button>
            ) : (
              <span className="h-8 flex items-center">
                Resend OTP in {resendTimer} seconds.
              </span>
            )}
          </div>*/}
        </Field>
      </CardContent>
      <CardFooter>
        <Field>
          <Button disabled={otp.length !== OTP_LENGTH} onClick={handleVerifyOTP} type="submit" className="w-full">
            Verify
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
}
