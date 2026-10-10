export function extractApiError(err, fallback = "Something went wrong") {
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .map((item) => typeof item === "string" ? item : item?.message || item?.defaultMessage)
      .filter(Boolean)
      .join(" ");
  }
  if (err?.message) return err.message;
  return fallback;
}
