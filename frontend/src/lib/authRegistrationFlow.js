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

/** Accept national numbers or a pasted +91 / 91 / 0 prefixed number. */
export function normalizeIndianMobileInput(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function validateCustomerDetails({ name, phone, password, specialDate, specialDayType, specialDayCustomLabel }) {
  if (!String(name ?? "").trim()) return "Enter your full name.";
  if (!/^[6-9]\d{9}$/.test(phone ?? "")) return "Enter a valid 10-digit Indian WhatsApp number.";
  if (typeof password !== "string" || password.length < 8 || !password.trim()) return "Choose a password with at least 8 characters.";
  if (new TextEncoder().encode(password).length > 72) return "Choose a shorter password (maximum 72 UTF-8 bytes).";
  if (specialDayType && !specialDate) return "Choose a date for your special occasion.";
  if (specialDate && !specialDayType) return "Choose a special-day occasion.";
  if (specialDayType === "Other" && !String(specialDayCustomLabel ?? "").trim()) return "Enter your special occasion.";
  return null;
}
