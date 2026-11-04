import test from "node:test";
import assert from "node:assert/strict";
import { shouldClearSessionAfterRestoreFailure } from "./sessionRestore.js";

test("invalid saved session requires fresh sign-in", () => {
  assert.equal(shouldClearSessionAfterRestoreFailure({ response: { status: 401 } }), true);
});

test("offline or timeout must not forget the remembered login", () => {
  for (const error of [
    { code: "ERR_NETWORK" },
    { code: "ECONNABORTED" },
    { response: { status: 502 } },
    { response: { status: 503 } },
    { response: { status: 500 } },
    undefined,
  ]) {
    assert.equal(shouldClearSessionAfterRestoreFailure(error), false);
  }
});
