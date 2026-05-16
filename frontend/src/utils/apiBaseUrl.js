export const normalizeApiBaseUrl = (value) => {
  const trimmed = (value || "http://localhost:5000").replace(/\/$/, "")
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`
}
