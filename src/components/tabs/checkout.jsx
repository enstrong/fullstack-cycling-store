import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, money } from "@/api";
import { useAuth } from "@/auth";
import {
  countries,
  countryRules,
  validateShipping,
} from "../../../shared/shipping.mjs";
export default function Checkout() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);
  const [country, setCountry] = useState("");
  const [fields, setFields] = useState({});
  const rules = countryRules(country);
  useEffect(() => {
    if (user)
      api("/cart")
        .then((data) => setItems(data.items))
        .catch((err) => setError(err.message));
  }, [user]);
  if (!user) return <Navigate to="/account?next=/cart/checkout" replace />;
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const { values, errors } = validateShipping(
      Object.fromEntries(new FormData(form)),
    );
    setFields(errors);
    if (Object.keys(errors).length) {
      form.elements.namedItem(Object.keys(errors)[0])?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      setOrder(
        await api("/orders", {
          method: "POST",
          body: JSON.stringify(values),
        }),
      );
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
      if (err.fields)
        form.elements.namedItem(Object.keys(err.fields)[0])?.focus();
    } finally {
      setBusy(false);
    }
  }
  if (order)
    return (
      <main className="page-shell">
        <div className="container empty-state">
          <span className="empty-mark">✓</span>
          <span className="eyebrow">ORDER #{order.order_id}</span>
          <h1>You’re ready to roll.</h1>
          <p className="muted">
            Your order has been placed. Confirmed total:{" "}
            <strong>{money(order.total_price)}</strong>.
          </p>
          <Link className="primary-button" to="/account">
            View your orders →
          </Link>
        </div>
      </main>
    );
  return (
    <main className="page-shell">
      <div className="container">
        <div className="page-heading">
          <div>
            <span className="eyebrow">ONE LAST STEP</span>
            <h1>Checkout</h1>
          </div>
          <Link className="text-link" to="/cart">
            ← Back to cart
          </Link>
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {items?.length === 0 ? (
          <div className="empty-state">
            <h2>Your cart is empty.</h2>
            <Link to="/gear" className="primary-button">
              Explore the shop →
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <form
              className="checkout-form account-form"
              onSubmit={submit}
              noValidate
            >
              <h2>Where are we heading?</h2>
              <p className="muted">Signed in as {user.email}</p>
              <div className="shipping-fields">
                {[
                  ["first_name", "First name", "given-name", 50],
                  ["last_name", "Last name", "family-name", 50],
                ].map(([name, label, autoComplete, max]) => (
                  <label key={name}>
                    {label}
                    <input
                      name={name}
                      autoComplete={autoComplete}
                      maxLength={max}
                      required
                      aria-invalid={!!fields[name]}
                      aria-describedby={
                        fields[name] ? `${name}-error` : undefined
                      }
                    />
                    {fields[name] && (
                      <small id={`${name}-error`} className="field-error">
                        {fields[name]}
                      </small>
                    )}
                  </label>
                ))}
                <label className="shipping-wide">
                  Country / territory
                  <select
                    name="country"
                    autoComplete="country"
                    value={country}
                    required
                    aria-invalid={!!fields.country}
                    aria-describedby={
                      fields.country ? "country-error" : undefined
                    }
                    onChange={(event) => {
                      setCountry(event.target.value);
                      event.target.form.elements.postal_code.value = "";
                      setFields((previous) => ({
                        ...previous,
                        country: undefined,
                        postal_code: undefined,
                      }));
                    }}
                  >
                    <option value="">Select a country</option>
                    {countries.map((item) => (
                      <option key={item.countryCode} value={item.countryCode}>
                        {item.countryName}
                      </option>
                    ))}
                  </select>
                  {fields.country && (
                    <small id="country-error" className="field-error">
                      {fields.country}
                    </small>
                  )}
                </label>
                {[
                  [
                    "region",
                    "Region / state / province",
                    "address-level1",
                    100,
                  ],
                  ["city", "City / town", "address-level2", 100],
                  [
                    "street",
                    "Street and building / apartment",
                    "street-address",
                    200,
                  ],
                ].map(([name, label, autoComplete, max]) => (
                  <label
                    key={name}
                    className={name === "street" ? "shipping-wide" : undefined}
                  >
                    {label}
                    <input
                      name={name}
                      autoComplete={autoComplete}
                      maxLength={max}
                      required
                      aria-invalid={!!fields[name]}
                      aria-describedby={
                        fields[name] ? `${name}-error` : undefined
                      }
                    />
                    {fields[name] && (
                      <small id={`${name}-error`} className="field-error">
                        {fields[name]}
                      </small>
                    )}
                  </label>
                ))}
                <label className="shipping-wide">
                  Postal code{" "}
                  {rules && !rules.usesPostalCode ? "(not used)" : ""}
                  <input
                    name="postal_code"
                    autoComplete="postal-code"
                    maxLength={20}
                    disabled={!rules || !rules.usesPostalCode}
                    required={rules?.usesPostalCode}
                    placeholder={rules?.example || ""}
                    aria-invalid={!!fields.postal_code}
                    aria-describedby="postal-hint postal-error"
                  />
                  <small id="postal-hint">
                    {!rules
                      ? "Choose your country first."
                      : !rules.usesPostalCode
                        ? "No postal code is needed for this country."
                        : `Use the postal-code format for ${rules.countryName}${rules.example ? `, e.g. ${rules.example}` : ""}.`}
                  </small>
                  {fields.postal_code && (
                    <small id="postal-error" className="field-error">
                      {fields.postal_code}
                    </small>
                  )}
                </label>
              </div>
              <button
                className="primary-button"
                disabled={busy || !items?.length}
              >
                {busy ? "Placing your order…" : "Place order →"}
              </button>
            </form>
            <aside className="order-summary">
              <span className="eyebrow">YOUR SELECTION</span>
              <h2>Order summary</h2>
              {items ? (
                items.map((i) => (
                  <div className="summary-row" key={i.product_id}>
                    <span>
                      {i.name} <small>×{i.quantity}</small>
                    </span>
                    <strong>{money(i.price * i.quantity)}</strong>
                  </div>
                ))
              ) : (
                <p role="status">Loading…</p>
              )}
              <div className="summary-total">
                <span>Total</span>
                <strong>
                  {money(
                    items?.reduce((sum, i) => sum + i.price * i.quantity, 0) ||
                      0,
                  )}
                </strong>
              </div>
              <p className="auth-note">
                Complimentary shipping. Final prices are confirmed when you
                place your order.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
