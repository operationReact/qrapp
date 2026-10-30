import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";

export default function PasswordResetForm({
  phone,
  onPhoneChange,
  onSubmit,
  isPending,
  error,
  resetting,
  newPassword,
  confirmPassword,
  onNewPasswordChange,
  onConfirmPasswordChange,
}) {
  return (
    <>
      {error && (
        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field>
          <FieldLabel>Phone Number</FieldLabel>
          <FieldContent>
            <PhoneInput
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              required
              placeholder="9999999999"
              className="h-10"
              enterKeyHint={resetting ? "next" : "go"}
            />
          </FieldContent>
        </Field>
        {resetting && (
          <>
            <Field>
              <FieldLabel>New Password</FieldLabel>
              <FieldContent>
                <input
                  className="h-10 w-full rounded-md border px-3"
                  type="password"
                  value={newPassword}
                  onChange={(e) => onNewPasswordChange(e.target.value)}
                  required
                  autoComplete="new-password"
                  enterKeyHint="next"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Confirm Password</FieldLabel>
              <FieldContent>
                <input
                  className="h-10 w-full rounded-md border px-3"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => onConfirmPasswordChange(e.target.value)}
                  required
                  autoComplete="new-password"
                  enterKeyHint="done"
                />
              </FieldContent>
            </Field>
          </>
        )}
        <div className="flex mt-5 flex-col gap-2">
          <Button
            type="submit"
            disabled={isPending}
            className="h-10 text-sm! font-medium!"
          >
            {isPending ? "Please wait..." : resetting ? "Set New Password" : "Reset Password"}
          </Button>
          <Link
            className={buttonVariants({ variant: "ghost", size: "lg" })}
            to="/login"
          >
            Back To Login
          </Link>
        </div>
      </form>
    </>
  );
}
