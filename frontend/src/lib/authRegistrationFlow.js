/**
 * Keep the chosen company scoped to the selected food court.
 * Client-side guard only; the backend must enforce the same relationship.
 */
export function validateLocationCompanySelection({ locationId, companyId, locations, companies }) {
  const locationIsValid = Array.isArray(locations)
    && locations.some((item) => String(item.id) === String(locationId) && item.active !== false && item.isActive !== false);
  if (!locationId || !locationIsValid) return "Choose your food court location to continue.";

  const companyIsValid = Array.isArray(companies)
    && companies.some((item) => String(item.id) === String(companyId));
  if (!companyId || !companyIsValid) return "Choose a company from this location to continue.";

  return null;
}
