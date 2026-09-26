export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const catalogCache = new Map();
const catalogPaths = new Set(["/products", "/categories"]);
export function invalidateCatalog() {
  catalogCache.clear();
}
export async function api(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  if (method === "GET" && catalogPaths.has(path) && !options.signal && !options.headers && !options.cache) {
    const previous = catalogCache.get(path);
    if (previous && previous.expires > Date.now()) return structuredClone(await previous.promise);
    const entry = { expires: Date.now() + 30000 };
    entry.promise = request(path, options).catch((error) => {
      if (catalogCache.get(path) === entry) catalogCache.delete(path);
      throw error;
    });
    catalogCache.set(path, entry);
    return structuredClone(await entry.promise);
  }
  return request(path, options);
}
async function request(path, options) {
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
  if (options.method && options.method.toUpperCase() !== "GET" &&
      (path.startsWith("/products") || path === "/orders")) invalidateCatalog();
  if (options.method && options.method.toUpperCase() !== "GET" &&
      (path.startsWith("/cart/") || path === "/orders")) {
    window.dispatchEvent(new Event("cart-changed"));
  }
  return data;
}
export const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value),
  );
