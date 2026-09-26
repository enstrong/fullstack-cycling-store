import { preloadHero } from "./preload-hero";
const loaders = {
  "/": () => import("./components/tabs/bikes.jsx"),
  "/teams": () => import("./components/tabs/teams.jsx"),
  "/gear": () => import("./components/tabs/gear.jsx"),
  "/support": () => import("./components/tabs/support.jsx"),
  "/cart": () => import("./components/tabs/cart.jsx"),
  "/cart/checkout": () => import("./components/tabs/checkout.jsx"),
  "/compare": () => import("./components/tabs/compare.jsx"),
  "/account": () => import("./components/tabs/account.jsx"),
  "/admin": () => import("./components/tabs/admin.jsx"),
};
const pending = new Map();
export function loadRoute(path) {
  if (!Object.hasOwn(loaders, path)) return Promise.resolve();
  if (!pending.has(path)) {
    pending.set(path, loaders[path]().catch((error) => {
      pending.delete(path);
      throw error;
    }));
  }
  return pending.get(path);
}
export function preloadRoute(event) {
  if (navigator.connection?.saveData || /(^|-)2g$/.test(navigator.connection?.effectiveType || "")) return;
  const anchor = event.target.closest("a[href]");
  if (!anchor || anchor.target === "_blank") return;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin === window.location.origin && Object.hasOwn(loaders, url.pathname)) {
    preloadHero(url.pathname);
    loadRoute(url.pathname).catch(() => {});
  }
}
