import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { PencilSimpleLineIcon, SpinnerIcon } from "@phosphor-icons/react";
import { verifyOTP } from "@/services/auth-service";
import { extractApiError } from "@/lib/apiError";
import { REGEXP_ONLY_DIGITS } from "input-otp";

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 30;

export default function OTPVerifyDialog({
  open,
  onOpenChange,
  phone,
  onVerified,
  onResend,
}) {
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const [error, setError] = useState(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const verifyMutation = useMutation({
    mutationFn: ({ phone, otp }) => verifyOTP({ phone, otp }),
    onSuccess: () => {
      onVerified?.(otp);
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => onResend?.(),
    onSuccess: () => {
      setError(null);
      setCountdown(RESEND_COUNTDOWN);
    },
  });

  if (open !== prevOpen) {
    setPrevOpen(open);
    setOtp("");
    setCountdown(RESEND_COUNTDOWN);
    setError(null);
  }

  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [open]);

  const mutationError = verifyMutation.isError
    ? extractApiError(verifyMutation.error, "Invalid OTP")
    : resendMutation.isError
      ? extractApiError(resendMutation.error, "Failed to resend OTP")
      : null;

  const displayError = error ?? mutationError;

  function handleOtpChange(value) {
    setOtp(value);
    setError(null);
    if (verifyMutation.isError) verifyMutation.reset();
    if (resendMutation.isError) resendMutation.reset();
  }

  function handleVerify() {
    if (otp.length !== OTP_LENGTH) return;
    const fullPhone = phone?.startsWith("+91") ? phone : `+91${phone}`;
    verifyMutation.mutate({ phone: fullPhone, otp });
  }

  function handleResend() {
    resendMutation.mutate();
  }

  function handleBack() {
    onOpenChange?.(false);
  }

  const isVerifying = verifyMutation.isPending;
  const isResending = resendMutation.isPending;
  const canVerify = otp.length === OTP_LENGTH && !isVerifying;
  const showResendButton = countdown === 0 && !isResending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Verify Your Account</DialogTitle>
          <DialogDescription>
            Enter the OTP sent to your mobile number +91 {phone}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field
            data-invalid={!!displayError}
            className="items-center"
          >
            <div className="flex w-full justify-center">
              <InputOTP
                pattern={REGEXP_ONLY_DIGITS}
                value={otp}
                onChange={handleOtpChange}
                maxLength={OTP_LENGTH}
                aria-invalid={!!displayError}
              >
                <InputOTPGroup
                  className="mx-auto *:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl"
                >
                  {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {displayError && <FieldError>{displayError}</FieldError>}

            <div className="flex w-full items-center justify-center text-sm">
              {showResendButton ? (
                <Button
                  variant="link"
                  size="sm"
                  disabled={isResending}
                  onClick={handleResend}
                  className="h-8 px-0"
                >
                  Resend OTP
                </Button>
              ) : (
                <span className="text-muted-foreground">
                  Resend OTP in {countdown}s
                </span>
              )}
            </div>
          </Field>
        </FieldGroup>

        <DialogFooter className="">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={isVerifying}
            type="button"
          >
            <PencilSimpleLineIcon/> Edit Account
          </Button>
          <Button
            onClick={handleVerify}
            disabled={!canVerify}
            type="button"
          >
            {isVerifying && <SpinnerIcon data-icon="inline-start" />}
            Verify Your Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
