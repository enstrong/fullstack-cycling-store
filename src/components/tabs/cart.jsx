import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "@/api";
import { useAuth } from "@/auth";
import "@/css/tabs/cart.css";
export default function Cart() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api("/cart")
      .then((data) => {
        if (live) setItems(data.items);
      })
      .catch((err) => {
        if (live) setError(err.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [user]);
  async function change(path, method, body) {
    setBusy(true);
    setError("");
    try {
      const data = await api(path, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const total = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  return (
    <main className="page-shell cart-page">
      <div className="container">
        <div className="page-heading">
          <div>
            <span className="eyebrow">READY FOR THE NEXT RIDE</span>
            <h1>
              Your cart<span className="count-badge">{items.length}</span>
            </h1>
          </div>
          <Link className="text-link" to="/gear">
            Continue shopping ↗
          </Link>
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <div className="page-status" role="status">
            Loading your kit…
          </div>
        ) : !items.length ? (
          <div className="empty-state">
            <span className="empty-mark">↗</span>
            <h2>Your next ride starts here.</h2>
            <p className="muted">
              Find the bike and gear that make you want to get out there.
            </p>
            <Link className="primary-button" to="/gear">
              Explore the collection →
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <section aria-label="Cart items">
              <div className="cart-list">
                {items.map((item) => (
                  <article className="cart-line" key={item.cart_item_id}>
                    <div className="cart-photo">
                      <img src={item.icon} alt={item.name} />
                    </div>
                    <div className="cart-line-info">
                      <h2>{item.name}</h2>
                      <p className="muted">{money(item.price)} each</p>
                      <div className="quantity-controls">
                        <button
                          disabled={busy}
                          aria-label={`Decrease quantity of ${item.name}`}
                          onClick={() =>
                            item.quantity === 1
                              ? change(
                                  `/cart/item/${item.cart_item_id}`,
                                  "DELETE",
                                )
                              : change("/cart/add", "POST", {
                                  product_id: item.product_id,
                                  quantity: -1,
                                })
                          }
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          disabled={
                            busy || item.quantity >= item.stock_quantity
                          }
                          aria-label={`Increase quantity of ${item.name}`}
                          onClick={() =>
                            change("/cart/add", "POST", {
                              product_id: item.product_id,
                              quantity: 1,
                            })
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="cart-line-end">
                      <strong>
                        {money(Number(item.price) * item.quantity)}
                      </strong>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          change(`/cart/item/${item.cart_item_id}`, "DELETE")
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <button
                className="text-button clear-cart"
                disabled={busy}
                onClick={() => change("/cart/clear", "POST", {})}
              >
                Clear cart
              </button>
            </section>
            <aside className="order-summary">
              <span className="eyebrow">THE DETAILS</span>
              <h2>Order summary</h2>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{money(total)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>Complimentary</span>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
              {!user && (
                <div className="guest-note">
                  <strong>Make it yours.</strong>
                  <p>
                    Sign in or create an account to place your order. We’ll keep
                    everything in your cart.
                  </p>
                </div>
              )}
              <Link
                className={`primary-button ${busy ? "disabled" : ""}`}
                to={user ? "/cart/checkout" : "/account?next=/cart/checkout"}
              >
                {user ? "Continue to checkout" : "Sign in to checkout"}{" "}
                <span>→</span>
              </Link>
              <p className="auth-note">
                Prices and availability are confirmed at checkout.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
