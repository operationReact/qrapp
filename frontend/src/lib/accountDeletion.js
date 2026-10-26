const ACCOUNT_DELETION_MESSAGES = {
  invalid_password: "The password you entered is incorrect.",
  active_orders_exist:
    "You have an order that is still in progress. Once it is completed or cancelled, you can delete your account.",
  wallet_balance_remaining:
    "Your wallet still has a balance. Use it on an order or contact support before deleting your account.",
  staff_account_requires_support:
    "Staff accounts cannot be deleted from the app. Please contact support.",
};

export const DEFAULT_ACCOUNT_DELETION_ERROR =
  "We could not delete your account right now. Please try again or contact support.";

export function getAccountDeletionErrorMessage(error) {
  const code = error?.response?.data?.error;
  return ACCOUNT_DELETION_MESSAGES[code] || DEFAULT_ACCOUNT_DELETION_ERROR;
}
