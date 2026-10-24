export const CHECKOUT_ERRORS = {
  CART_EMPTY: {
    title: "Your cart is empty",
    message: "Add items to your cart before placing an order.",
  },
  LOCATION_NOT_SELECTED: {
    title: "Choose a location",
    message: "Select a location before checkout.",
  },
  LOCATION_MISMATCH: {
    title: "Cart belongs to another location",
    message: "Please switch to the correct location to place this order.",
  },
  PHONE_REQUIRED: {
    title: "Phone number needed",
    message: "Enter your phone number to place the order.",
  },
  PAYMENT_START_FAILED: {
    title: "Couldn't start payment",
    message: "We couldn't start your payment. Please try again.",
  },
  PAYMENT_UNAVAILABLE: {
    title: "Online payment unavailable",
    message: "Online payment isn't available right now. Choose another payment method.",
  },
  PAYMENT_FAILED: {
    title: "Payment didn't go through",
    message: "Your payment wasn't completed. You can try again with the same or another payment method.",
  },
  WALLET_INSUFFICIENT: {
    title: "Not enough in Bro Wallet",
    message: "Your wallet balance doesn't cover this order. Top up or choose another payment method.",
  },
  PAYMENT_NOT_CONFIRMED: {
    title: "Payment not confirmed",
    message: "We couldn't confirm your payment, so this order wasn't placed. Check your orders before trying again so you aren't charged twice.",
  },
  DUPLICATE_PAYMENT: {
    title: "Payment already received",
    message: "This payment was already processed. Check your orders before trying again so you aren't charged twice.",
  },
  STOCK_CHANGED: {
    title: "Some items are unavailable",
    message: "Stock changed for an item in your cart. Review the quantities and try again.",
  },
  ITEM_NOT_FOUND: {
    title: "An item is no longer available",
    message: "Remove unavailable items from your cart and try again.",
  },
  LOCATION_INVALID: {
    title: "Can't order from this food court",
    message: "This location isn't set up for ordering right now. Switch location and try again.",
  },
  SESSION_EXPIRED: {
    title: "Please log in again",
    message: "Your session has ended. Log in again to place your order.",
  },
  NETWORK: {
    title: "Connection problem",
    message: "We couldn't reach BroBro. Check your connection and try again.",
  },
  SERVICE_BUSY: {
    title: "Ordering is busy",
    message: "Ordering is temporarily unavailable. Please try again in a moment.",
  },
  GENERIC: {
    title: "We couldn't place your order",
    message: "Something went wrong on our side. Please try again.",
  },
};

const ORDER_VALIDATION_CODES = {
  LOCATION_REQUIRED: "LOCATION_INVALID",
  LOCATION_CODE_MISSING: "LOCATION_INVALID",
  PAYMENT_NOT_CONFIRMED: "PAYMENT_NOT_CONFIRMED",
};

export function getPreOrderOnlyError(itemNames) {
  return {
    title: "Pre-order only item in cart",
    message: `${itemNames.join(", ")} can only be ordered as a pre-order. Remove it from your cart and use Pre-Order on the item card.`,
  };
}

export function getCheckoutApiError(err) {
  if (!err?.response) {
    return CHECKOUT_ERRORS.NETWORK;
  }

  const { status, data } = err.response;
  const text = typeof data === "string" ? data : "";
  const code = data && typeof data === "object" ? data.code : undefined;

  if (status === 401) return CHECKOUT_ERRORS.SESSION_EXPIRED;
  if (code && ORDER_VALIDATION_CODES[code]) {
    return CHECKOUT_ERRORS[ORDER_VALIDATION_CODES[code]];
  }
  if (/insufficient balance/i.test(text)) return CHECKOUT_ERRORS.WALLET_INSUFFICIENT;
  if (/insufficient stock/i.test(text)) return CHECKOUT_ERRORS.STOCK_CHANGED;
  if (/already processed/i.test(text)) return CHECKOUT_ERRORS.DUPLICATE_PAYMENT;
  if (status === 404) return CHECKOUT_ERRORS.ITEM_NOT_FOUND;
  if (status === 503) return CHECKOUT_ERRORS.SERVICE_BUSY;
  return CHECKOUT_ERRORS.GENERIC;
}
