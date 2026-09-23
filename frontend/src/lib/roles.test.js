import test from "node:test";
import assert from "node:assert/strict";
import { ROLE, canAccessAdmin, canSelectAllLocations, isKitchenStaffOnly, hasRole, userRoles } from "./roles.js";

const asUser = (roles, flags = {}) => ({ info: { roles }, ...flags });

test("userRoles normalizes ROLE_ prefixes and SUPERUSER alias", () => {
  assert.deepEqual(userRoles({ role: "ROLE_ADMIN" }), [ROLE.ADMIN]);
  assert.deepEqual(userRoles({ info: { roles: ["SUPERUSER"] } }), [ROLE.SUPER_ADMIN]);
});

test("kitchen staff can reach the admin area (kitchen queue)", () => {
  assert.equal(canAccessAdmin(asUser([ROLE.KITCHEN_STAFF])), true);
});

test("isKitchenStaffOnly is true only for pure KITCHEN_STAFF users", () => {
  assert.equal(isKitchenStaffOnly(asUser([ROLE.KITCHEN_STAFF])), true);
});

test("isKitchenStaffOnly is false for admin / super admin / manager", () => {
  assert.equal(isKitchenStaffOnly(asUser([ROLE.ADMIN])), false);
  assert.equal(isKitchenStaffOnly(asUser([ROLE.SUPER_ADMIN])), false);
  assert.equal(isKitchenStaffOnly(asUser([ROLE.MANAGER])), false);
});

test("isKitchenStaffOnly is false when combined with a broader admin role", () => {
  assert.equal(isKitchenStaffOnly(asUser([ROLE.KITCHEN_STAFF, ROLE.ADMIN])), false);
  assert.equal(isKitchenStaffOnly(asUser([ROLE.KITCHEN_STAFF], { isSuperUser: true })), false);
  assert.equal(isKitchenStaffOnly(asUser([ROLE.KITCHEN_STAFF], { isAdmin: true })), false);
});

test("isKitchenStaffOnly is false for anonymous / customer users", () => {
  assert.equal(isKitchenStaffOnly(null), false);
  assert.equal(isKitchenStaffOnly(asUser([ROLE.CUSTOMER])), false);
});

test("hasRole respects the super-user flag", () => {
  assert.equal(hasRole({ isSuperUser: true }, [ROLE.ADMIN]), true);
});

test("canSelectAllLocations is true only for SUPER_ADMIN", () => {
  assert.equal(canSelectAllLocations(asUser([ROLE.SUPER_ADMIN])), true);
  assert.equal(canSelectAllLocations({ isSuperUser: true }), true);
});

test("canSelectAllLocations is false for admin / manager / kitchen staff / customer", () => {
  assert.equal(canSelectAllLocations(asUser([ROLE.ADMIN])), false);
  assert.equal(canSelectAllLocations(asUser([ROLE.MANAGER])), false);
  assert.equal(canSelectAllLocations(asUser([ROLE.KITCHEN_STAFF])), false);
  assert.equal(canSelectAllLocations(asUser([ROLE.CUSTOMER])), false);
  assert.equal(canSelectAllLocations(null), false);
});
