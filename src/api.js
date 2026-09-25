export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.message || data.error || "Request failed. Please try again.",
    );
    error.status = response.status;
    error.fields = data.errors;
    throw error;
  }
  return data;
}
export const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value),
  );
