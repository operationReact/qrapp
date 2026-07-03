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
              placeholder="1234567890"
              className="h-10"
            />
          </FieldContent>
        </Field>
        <div className="flex mt-5 flex-col gap-2">
          <Button
            type="submit"
            disabled={isPending}
            className="h-10 text-sm! font-medium!"
          >
            {isPending ? "Sending..." : "Reset Password"}
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
