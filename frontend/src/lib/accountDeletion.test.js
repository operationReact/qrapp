import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ACCOUNT_DELETION_ERROR,
  getAccountDeletionErrorMessage,
} from "./accountDeletion.js";

test("maps known deletion blockers to user-facing messages", () => {
  const error = { response: { status: 409, data: { error: "active_orders_exist" } } };
  assert.match(getAccountDeletionErrorMessage(error), /still in progress/);
});

test("maps wrong password to a clear message", () => {
  const error = { response: { status: 403, data: { error: "invalid_password" } } };
  assert.equal(getAccountDeletionErrorMessage(error), "The password you entered is incorrect.");
});

test("falls back to the generic message for unknown or network errors", () => {
  assert.equal(getAccountDeletionErrorMessage(new Error("Network Error")), DEFAULT_ACCOUNT_DELETION_ERROR);
  assert.equal(
    getAccountDeletionErrorMessage({ response: { data: { error: "something_new" } } }),
    DEFAULT_ACCOUNT_DELETION_ERROR,
  );
});
