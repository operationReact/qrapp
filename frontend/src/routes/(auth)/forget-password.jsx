import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
} from "@/services/auth-service";
import { extractApiError } from "@/lib/apiError";
import { buttonVariants } from "@/components/ui/button";
import { CaretLeftIcon } from "@phosphor-icons/react";
import PasswordResetForm from "@/components/PasswordResetForm";
import OTPVerifyDialog from "@/components/OTPVerifyDialog";

export const Route = createFileRoute("/(auth)/forget-password")({
  component: function ForgetPassword() {
    const navigate = useNavigate();

    const [phone, setPhone] = useState("");
    const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);
    const [error, setError] = useState(null);
    const [resetAuthorization, setResetAuthorization] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const redirectTimerRef = useRef(null);

    const sendOtpMutation = useMutation({
      mutationFn: () => requestPasswordResetOTP(phone.startsWith("+91") ? phone : `+91${phone}`),
      onSuccess: () => {
        setError(null);
        setIsOtpDialogOpen(true);
      },
      onError: (err) => {
        setError(extractApiError(err, "Failed to send OTP"));
      },
    });

    const forgotPasswordMutation = useMutation({
      mutationFn: () => resetPassword({
        phone: phone.startsWith("+91") ? phone : `+91${phone}`,
        resetAuthorization,
        newPassword,
      }),
      onSuccess: () => {
        toast.success("Password reset successfully");
        setIsOtpDialogOpen(false);
        setPhone("");
        setError(null);
        redirectTimerRef.current = setTimeout(() => {
          navigate({ to: "/login" });
        }, 1500);
      },
      onError: (err) => {
        setError(extractApiError(err, "Failed to reset password"));
        setIsOtpDialogOpen(false);
      },
    });

    function handleResetSubmit(e) {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
        setError("New password and confirm password do not match.");
        return;
      }
      setError(null);
      forgotPasswordMutation.mutate();
    }

    useEffect(() => {
      return () => {
        if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      };
    }, []);

    function handleSendOTP(e) {
      e.preventDefault();
      setError(null);
      sendOtpMutation.mutate();
    }

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
              to="/login"
              title="Back To Login"
            >
              <CaretLeftIcon weight="bold" />
              <span>Back To Login</span>
            </Link>
          </div>
          <div className="rounded-xl p-4 pt-2 h-fit">
            <img
              src="/login-banner.jpg"
              alt="Your Easy Access To Delicious Meals"
              className="w-full border border-muted login-banner rounded-[14px] overflow-hidden"
            />
            <h1 className="my-4 text-lg font-medium">Reset Your Password</h1>
            <PasswordResetForm
              phone={phone}
              onPhoneChange={setPhone}
               onSubmit={resetAuthorization ? handleResetSubmit : handleSendOTP}
               isPending={resetAuthorization ? forgotPasswordMutation.isPending : sendOtpMutation.isPending}
              error={error}
               resetting={!!resetAuthorization}
               newPassword={newPassword}
               confirmPassword={confirmPassword}
               onNewPasswordChange={setNewPassword}
               onConfirmPasswordChange={setConfirmPassword}
            />
          </div>
        </div>
        <OTPVerifyDialog
          open={isOtpDialogOpen}
          onOpenChange={(next) => {
            if (!next) setIsOtpDialogOpen(false);
          }}
          phone={phone}
          verifyOtp={verifyPasswordResetOTP}
          onVerified={(data) => {
            setResetAuthorization(data.resetAuthorization);
            setIsOtpDialogOpen(false);
            setError(null);
          }}
          onResend={() => sendOtpMutation.mutateAsync()}
        />
      </div>
    );
  },
});
