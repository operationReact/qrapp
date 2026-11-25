import test from "node:test";
import assert from "node:assert/strict";
import { validateLocationCompanySelection } from "./authRegistrationFlow.js";

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
