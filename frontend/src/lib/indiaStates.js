export const INDIA_STATES_AND_UTS = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export const INDIA_STATE_CODES = {
  "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", Assam: "AS", Bihar: "BR", Chhattisgarh: "CG",
  Goa: "GA", Gujarat: "GJ", Haryana: "HR", "Himachal Pradesh": "HP", Jharkhand: "JH", Karnataka: "KA",
  Kerala: "KL", "Madhya Pradesh": "MP", Maharashtra: "MH", Manipur: "MN", Meghalaya: "ML", Mizoram: "MZ",
  Nagaland: "NL", Odisha: "OD", Punjab: "PB", Rajasthan: "RJ", Sikkim: "SK", "Tamil Nadu": "TN",
  Telangana: "TG", Tripura: "TR", "Uttar Pradesh": "UP", Uttarakhand: "UK", "West Bengal": "WB",
  "Andaman and Nicobar Islands": "AN", Chandigarh: "CH",
  "Dadra and Nagar Haveli and Daman and Diu": "DH", Delhi: "DL", "Jammu and Kashmir": "JK",
  Ladakh: "LA", Lakshadweep: "LD", Puducherry: "PY",
};

const LOCATION_CODE_FILLER_WORDS = new Set(["THE", "AND", "OF", "AT", "IN"]);

export function locationNameAbbreviation(value) {
  const words = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word && !LOCATION_CODE_FILLER_WORDS.has(word));
  if (!words.length) return "";
  const prefix = words[0];
  return words[1] === words[0] ? `${prefix}${prefix}` : prefix;
}

export function locationCodePreview(name, stateUt, sequence = 1) {
  const prefix = locationNameAbbreviation(name);
  const stateCode = INDIA_STATE_CODES[stateUt];
  return prefix && stateCode ? `${prefix}-${stateCode}-${String(sequence).padStart(3, "0")}` : "";
}
