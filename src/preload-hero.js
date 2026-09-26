import heroes from "./hero-images.json";

const requested = new Set();
export function preloadHero(pathname, priority = "low") {
  const hero = heroes[pathname];
  if (!hero) return;
  const desired = window.innerWidth <= 700 ? 960 : window.innerWidth <= 1100 ? 1440 : 1920;
  const variant = hero.background
    ? hero.variants.find((entry) => entry.width >= desired) || hero.variants.at(-1)
    : hero.variants.find((entry) => entry.width >= 640) || hero.variants.at(-1);
  if (requested.has(variant.src)) return;
  requested.add(variant.src);
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = variant.src;
  link.fetchPriority = priority;
  if (!hero.background) {
    link.imageSrcset = hero.variants.map((entry) => `${entry.src} ${entry.width}w`).join(", ");
    link.imageSizes = "(max-width: 700px) 92vw, 50vw";
  }
  document.head.append(link);
}
