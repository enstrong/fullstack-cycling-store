import {
  getAllCountries,
  getCountryByCode,
  validatePostalCode,
} from "postal-code-checker";

export const countries = getAllCountries().sort((a, b) =>
  a.countryName.localeCompare(b.countryName, "en"),
);
const codes = new Set(countries.map((c) => c.countryCode));
export function countryRules(code) {
  if (!codes.has(code)) return null;
  const country = getCountryByCode(code);
  return {
    ...country,
    usesPostalCode: country.postalCodePatterns.length > 0,
    example:
      code === "KZ" ? "050012 or Z00Y5M7" : country.examplePostalCodes[0] || "",
  };
}
export const shippingFields = [
  "first_name",
  "last_name",
  "country",
  "region",
  "city",
  "street",
  "postal_code",
];
const clean = (value) =>
  typeof value === "string"
    ? value.normalize("NFC").trim().replace(/ +/g, " ")
    : "";
export function validateShipping(input = {}) {
  const values = Object.fromEntries(
    shippingFields.map((key) => [key, clean(input[key])]),
  );
  values.country = values.country.toUpperCase();
  values.postal_code = values.postal_code.toUpperCase();
  const errors = {};
  for (const key of ["first_name", "last_name"]) {
    if (
      values[key].length < 2 ||
      values[key].length > 50 ||
      !/^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(values[key])
    )
      errors[key] =
        "Use 2–50 characters: letters, spaces, apostrophes or hyphens.";
  }
  for (const key of ["region", "city"]) {
    if (
      values[key].length < 2 ||
      values[key].length > 100 ||
      !/^[\p{L}\p{M}\p{N} .,'’()/-]+$/u.test(values[key]) ||
      !/\p{L}/u.test(values[key])
    )
      errors[key] = "Use 2–100 characters and include the place name.";
  }
  if (
    values.street.length < 5 ||
    values.street.length > 200 ||
    !/^[\p{L}\p{M}\p{N} .,'’()/#-]+$/u.test(values.street) ||
    !/\p{L}/u.test(values.street)
  )
    errors.street =
      "Enter a street name and building details (5–200 characters).";
  const country = countryRules(values.country);
  if (!country) errors.country = "Choose a country from the list.";
  else if (!country.usesPostalCode) {
    if (values.postal_code)
      errors.postal_code =
        "This country does not use postal codes. Leave this field empty.";
  } else if (
    values.postal_code.length > 20 ||
    !values.postal_code ||
    (!(
      values.country === "KZ" &&
      /^[A-Z]\d{2}[A-Z]\d[A-Z]\d$/.test(values.postal_code)
    ) &&
      !validatePostalCode(values.country, values.postal_code))
  ) {
    errors.postal_code = `Enter a postal code in the format used in ${country.countryName}${country.example ? ` (e.g. ${country.example})` : ""}.`;
  }
  return { values, errors, country };
}
export function formatShipping(values, country) {
  return [
    values.street,
    `${values.city}, ${values.region}`,
    values.postal_code,
    country.countryName,
  ]
    .filter(Boolean)
    .join("\n");
}
