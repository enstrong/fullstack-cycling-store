import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth";
import { api, API_BASE, money } from "@/api";
import "@/css/tabs/account.css";
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.5-.1-2.9-.4-4.3H24v8.2h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.3Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2c-1.8 1.2-4.1 2-6.8 2-5.3 0-9.8-3.6-11.4-8.4H5.7v5.4A20.4 20.4 0 0 0 24 44Z"
      />
      <path
        fill="#FBBC05"
        d="M12.6 27.5a12 12 0 0 1 0-7.6v-5.4H5.7a20.3 20.3 0 0 0 0 18.4l6.9-5.4Z"
      />
      <path
        fill="#EA4335"
        d="M24 11.6c3 0 5.6 1 7.7 3l5.8-5.8A19.4 19.4 0 0 0 24 3.5 20.4 20.4 0 0 0 5.7 14.5l6.9 5.4c1.6-4.8 6.1-8.3 11.4-8.3Z"
      />
    </svg>
  );
}
export default function Account() {
  const { user, setUser, googleAvailable, logout } = useAuth();
  const [params] = useSearchParams();
  const next =
    params.get("next") === "/cart/checkout" ? "/cart/checkout" : "/account";
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const googleErrors = {
    google_state: "This sign-in attempt expired. Please try again.",
    google_cancelled: "Google sign-in was cancelled.",
    google_failed: "Google sign-in did not complete. Please try again.",
    existing_account:
      "This email already has an account. Please sign in with your password.",
  };
  const [error, setError] = useState(googleErrors[params.get("error")] || "");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const data = await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setUser(data.user);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    try {
      await logout();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="account-page page-shell">
      <div className="account-layout">
        <aside className="account-story">
          <span className="eyebrow">THE WINNER’S CIRCLE</span>
          <h1>
            Every ride.
            <br />
            One account.
          </h1>
          <p>
            Your next ride starts here. Keep your kit together, pick up where
            you left off, and make it yours.
          </p>
          <span className="account-story-note">
            BUILT FOR THE LOVE OF CYCLING
          </span>
        </aside>
        <section className="account-panel">
          {user ? (
            <>
              <span className="eyebrow">YOUR ACCOUNT</span>
              <h2>
                Good to see you,
                <br />
                {user.name}.
              </h2>
              <p className="muted">{user.email}</p>
              <p className="account-caption">
                Your cart stays with your account, wherever you sign in.
              </p>
              <Link className="primary-button" to="/cart">
                View your cart <span>↗</span>
              </Link>
              {user.role === "admin" && (
                <Link className="text-link" to="/admin">
                  Manage products →
                </Link>
              )}
              <button
                className="secondary-button"
                disabled={busy}
                onClick={signOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <div
                className="auth-tabs"
                role="tablist"
                aria-label="Account action"
              >
                {["login", "register"].map((value) => (
                  <button
                    key={value}
                    role="tab"
                    aria-selected={mode === value}
                    className={mode === value ? "selected" : ""}
                    onClick={() => {
                      setMode(value);
                      setError("");
                    }}
                  >
                    {value === "login" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>
              <h2>{mode === "login" ? "Welcome back." : "Join the ride."}</h2>
              <p className="muted">
                {next === "/cart/checkout"
                  ? "Sign in to finish checkout. Your cart is coming with you."
                  : mode === "login"
                    ? "Your next adventure is waiting."
                    : "One account. All your cycling essentials."}
              </p>
              <form onSubmit={submit} key={mode} className="account-form">
                {mode === "register" && (
                  <label>
                    Full name
                    <input
                      name="name"
                      autoComplete="name"
                      maxLength="100"
                      required
                      placeholder="Your name"
                    />
                  </label>
                )}
                <label>
                  Email address
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    maxLength="254"
                    required
                    placeholder="you@example.com"
                  />
                </label>
                <label>
                  Password
                  <span className="password-field">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      aria-label="Password"
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      minLength={mode === "register" ? 10 : 1}
                      maxLength="128"
                      required
                      placeholder={
                        mode === "register"
                          ? "At least 10 characters"
                          : "Your password"
                      }
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </span>
                </label>
                <button className="primary-button" disabled={busy}>
                  {busy
                    ? "Please wait…"
                    : mode === "login"
                      ? "Sign in →"
                      : "Create account →"}
                </button>
              </form>
              <div className="auth-divider">
                <span>or continue with</span>
              </div>
              <button
                className="google-button"
                disabled={!googleAvailable || busy}
                onClick={() => {
                  window.location.href = `${API_BASE}/api/auth/google?returnTo=${encodeURIComponent(next)}`;
                }}
              >
                <GoogleLogo />
                Google
              </button>
              {!googleAvailable && (
                <p className="auth-note">
                  Google sign-in is currently unavailable.
                </p>
              )}
            </>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <Link to="/gear" className="account-back">
            ← Back to the shop
          </Link>
        </section>
      </div>
      {user && <OrderHistory key={user.user_id} />}
    </main>
  );
}

function OrderHistory() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api("/orders")
      .then((data) => {
        if (active) setOrders(data.orders);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <section className="order-history" aria-labelledby="orders-heading">
      <span className="eyebrow">YOUR RIDING ESSENTIALS</span>
      <h2 id="orders-heading">Your orders</h2>
      <p className="muted">
        Past purchases, all in one place. Open an order to see its details.
      </p>
      {error ? (
        <div role="alert" className="inline-error">
          <p>{error}</p>
          <button
            className="secondary-button"
            onClick={() => {
              setError("");
              setAttempt(attempt + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : orders === null ? (
        <p role="status">Loading your orders…</p>
      ) : orders.length === 0 ? (
        <div className="orders-empty">
          <h3>No orders yet.</h3>
          <p>Your first ride starts with the right gear.</p>
          <Link className="text-link" to="/gear">
            Explore the shop →
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <details className="history-order" key={order.order_id}>
              <summary>
                <span className="history-order-id">
                  <strong>Order #{order.order_id}</strong>
                  <time dateTime={order.time_of_creation}>
                    {new Date(order.time_of_creation).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "short", day: "numeric" },
                    )}
                  </time>
                </span>
                <span className="order-status">
                  {(order.order_status || "pending").replaceAll("_", " ")}
                </span>
                <strong className="history-total">
                  {money(order.total_price)}
                </strong>
                <span className="order-disclosure" aria-hidden="true">
                  +
                </span>
              </summary>
              <div className="history-details">
                <ul className="history-items">
                  {order.items.map((item) => (
                    <li key={item.order_item_id}>
                      <OrderItemImage src={item.icon} name={item.name} />
                      <div className="history-item-description">
                        <strong>{item.name || "Cycling product"}</strong>
                        <span>
                          {item.quantity} × {money(item.price)}
                        </span>
                      </div>
                      <strong>{money(item.subtotal)}</strong>
                    </li>
                  ))}
                </ul>
                <div className="history-shipping">
                  <h3>Ship to</h3>
                  <p>{order.customer_name}</p>
                  <p>{order.shipping_address}</p>
                </div>
                <div className="history-order-total">
                  <span>Order total</span>
                  <strong>{money(order.total_price)}</strong>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function OrderItemImage({ src, name }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="history-item-image">
      {src && !failed ? (
        <img
          src={src}
          alt={name || "Ordered product"}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="history-image-fallback">Image unavailable</span>
      )}
    </span>
  );
}
