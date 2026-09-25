export const comparisonGroups = [
  ["bikes", "Bikes"],
  ["helmets", "Helmets"],
  ["glasses", "Eyewear"],
  ["gloves", "Gloves"],
  ["jerseys", "Jerseys"],
  ["shoes", "Shoes"],
  ["bottles", "Bottles"],
  ["cages", "Bottle cages"],
];
export const specDefinitions = {
  price: {
    label: "Price",
    direction: "lower",
    best: "Lowest price",
    worst: "Highest price",
  },
  weight: {
    label: "Weight",
    unit: "g",
    direction: "lower",
    best: "Lightest",
    worst: "Heaviest",
  },
  frame_weight: {
    label: "Frame weight",
    unit: "g",
    direction: "lower",
    best: "Lightest frame",
    worst: "Heaviest frame",
  },
  material: { label: "Material" },
  sizes: { label: "Size range" },
  purpose: { label: "Designed for" },
  tour_wins: {
    label: "Tour de France victories",
    direction: "higher",
    best: "Most confirmed wins",
    worst: "Fewer confirmed wins",
  },
  tyre_clearance: { label: "Tyre clearance", unit: "mm" },
  protection: { label: "Protection system" },
  vents: { label: "Ventilation ports" },
  fit: { label: "Fit / adjustment" },
  closure: { label: "Closure" },
  visor: { label: "Visor" },
  lens: { label: "Lens" },
  padding: { label: "Padding" },
  pockets: { label: "Pockets" },
  temperature: { label: "Temperature range" },
  sole: { label: "Sole" },
  cleats: { label: "Cleat system" },
  capacity: { label: "Capacity", unit: "ml" },
  diameter: { label: "Diameter", unit: "mm" },
  max_temperature: { label: "Max drink temperature", unit: "°C" },
  insulation: { label: "Insulation" },
  brakes: { label: "Brakes" },
  bottom_bracket: { label: "Bottom bracket" },
  gearing: { label: "Gearing" },
};
export const groupFor = (product) => product.research?.group || product.section;
export function getSpec(product, key) {
  if (key === "price") return { value: Number(product.price), basis: "USD" };
  return product.research?.specs?.[key] || { value: null };
}
export function rankSpec(products, key, product) {
  const def = specDefinitions[key];
  const current = getSpec(product, key);
  if (
    !def?.direction ||
    !current.basis ||
    typeof current.value !== "number" ||
    !Number.isFinite(current.value)
  )
    return null;
  const values = products
    .filter((p) => groupFor(p) === groupFor(product))
    .map((p) => getSpec(p, key))
    .filter(
      (s) =>
        s.basis === current.basis &&
        typeof s.value === "number" &&
        Number.isFinite(s.value),
    )
    .map((s) => s.value);
  if (values.length < 2 || Math.min(...values) === Math.max(...values))
    return null;
  const best =
    def.direction === "lower" ? Math.min(...values) : Math.max(...values);
  const worst =
    def.direction === "lower" ? Math.max(...values) : Math.min(...values);
  return current.value === best
    ? "best"
    : current.value === worst
      ? "worst"
      : null;
}
export function compareRows(products) {
  const keys = new Set([
    "price",
    "weight",
    "material",
    "sizes",
    "purpose",
    "tour_wins",
  ]);
  products.forEach((p) =>
    Object.keys(p.research?.specs || {}).forEach((k) => keys.add(k)),
  );
  return Object.keys(specDefinitions).filter((k) => keys.has(k));
}
