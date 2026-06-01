export function extractApiError(err, fallback = "Something went wrong") {
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (err?.message) return err.message;
  return fallback;
}
