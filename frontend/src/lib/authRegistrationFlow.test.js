import test from "node:test";
import assert from "node:assert/strict";
import { validateLocationCompanySelection, normalizeIndianMobileInput, validateCustomerDetails } from "./authRegistrationFlow.js";

const locations = [
  { id: 11, name: "Workplace South", active: true },
  { id: 22, name: "Food Court North", active: true },
  { id: 33, name: "Closed Venue", active: false },
];
const companiesAtEleven = [{ id: 7, name: "Company One" }, { id: 8, name: "Company Two" }];

test("location and company from same location allow signup to continue", () => {
  assert.equal(validateLocationCompanySelection({
    locationId: "11", companyId: "7", locations, companies: companiesAtEleven,
  }), null);
});

test("location must be an active registered venue", () => {
  for (const locationId of ["", "33", "999"]) {
    assert.match(validateLocationCompanySelection({
      locationId, companyId: "7", locations, companies: companiesAtEleven,
    }), /location/i);
  }
});

test("company must be selected from the current location's fetched list", () => {
  for (const companyId of ["", "91"]) {
    assert.match(validateLocationCompanySelection({
      locationId: "11", companyId, locations, companies: companiesAtEleven,
    }), /company/i);
  }
});

test("changing location requires selecting a company from its own list", () => {
  assert.match(validateLocationCompanySelection({
    locationId: "22", companyId: "7", locations, companies: [{ id: 91, name: "Other tenant" }],
  }), /company/i);
});

test("a location or company fetch error does not unlock registration", () => {
  assert.match(validateLocationCompanySelection({
    locationId: "11", companyId: "7", locations, companies: undefined,
  }), /company/i);
});

test("mobile input accepts formatted or pasted national and international numbers", () => {
  for (const input of ["9876543210", "+91 98765 43210", "919876543210", "09876543210"]) {
    assert.equal(normalizeIndianMobileInput(input), "9876543210");
  }
  assert.equal(normalizeIndianMobileInput("abc123"), "123");
});
test("customer signup accepts a simple eight-character password and optional dates", () => {
  const valid = {name:"Test Customer", phone:"9876543210", password:"longpass"};
  assert.equal(validateCustomerDetails(valid), null);
  assert.match(validateCustomerDetails({...valid,name:" "}), /name/i);
  assert.match(validateCustomerDetails({...valid,phone:"123"}), /number/i);
  assert.match(validateCustomerDetails({...valid,password:"short"}), /8 characters/i);
  assert.match(validateCustomerDetails({...valid,password:"a".repeat(73)}), /72/);
  assert.match(validateCustomerDetails({...valid,specialDayType:"Other"}), /date/i);
  assert.match(validateCustomerDetails({...valid,specialDate:"2026-01-01"}), /occasion/i);
});
