import test from "node:test";
import assert from "node:assert/strict";
import {
  CHECKOUT_ERRORS,
  getCheckoutApiError,
  getPreOrderOnlyError,
} from "./checkoutErrors.js";

const apiError = (status, data) => ({ response: { status, data } });

test("network failure without a response maps to connection error", () => {
  assert.equal(getCheckoutApiError(new Error("Network Error")), CHECKOUT_ERRORS.NETWORK);
});

test("401 maps to session expired", () => {
  assert.equal(getCheckoutApiError(apiError(401, "Unauthorized")), CHECKOUT_ERRORS.SESSION_EXPIRED);
});

test("insufficient wallet balance maps to wallet error", () => {
  assert.equal(
    getCheckoutApiError(apiError(400, "Insufficient balance")),
    CHECKOUT_ERRORS.WALLET_INSUFFICIENT,
  );
});

test("order validation codes map to customer-friendly errors", () => {
  assert.equal(
    getCheckoutApiError(apiError(409, { code: "LOCATION_REQUIRED", message: "raw" })),
    CHECKOUT_ERRORS.LOCATION_INVALID,
  );
  assert.equal(
    getCheckoutApiError(apiError(409, { code: "LOCATION_CODE_MISSING", message: "raw" })),
    CHECKOUT_ERRORS.LOCATION_INVALID,
  );
  assert.equal(
    getCheckoutApiError(apiError(409, { code: "PAYMENT_NOT_CONFIRMED", message: "raw" })),
    CHECKOUT_ERRORS.PAYMENT_NOT_CONFIRMED,
  );
});

test("insufficient stock maps without exposing product ids", () => {
  const error = getCheckoutApiError(
    apiError(409, "Insufficient stock for product 42: requested=3, available=1"),
  );
  assert.equal(error, CHECKOUT_ERRORS.STOCK_CHANGED);
  assert.ok(!error.message.includes("42"));
});

test("404 maps to unavailable item and 503 maps to busy", () => {
  assert.equal(getCheckoutApiError(apiError(404, "Menu item 7 not found")), CHECKOUT_ERRORS.ITEM_NOT_FOUND);
  assert.equal(getCheckoutApiError(apiError(503, "Service unavailable")), CHECKOUT_ERRORS.SERVICE_BUSY);
});

test("unknown server errors never expose raw backend text", () => {
  const error = getCheckoutApiError(
    apiError(500, "java.lang.NullPointerException at OrderService.java:123"),
  );
  assert.equal(error, CHECKOUT_ERRORS.GENERIC);
  assert.ok(!JSON.stringify(error).includes("NullPointer"));
});

test("pre-order only error lists the item names", () => {
  const error = getPreOrderOnlyError(["Paneer Roll", "Cake"]);
  assert.match(error.message, /Paneer Roll, Cake can only be ordered as a pre-order/);
});
