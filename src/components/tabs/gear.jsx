import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "@/api";
import "@/css/tabs/gear.css";
function ProductCard({ product, category, add, busy }) {
  return (
    <article className={`shop-card ${category === "Bikes" ? "bike-card" : ""}`}>
      <div className="shop-card-visual">
        <span className="product-tag">{category}</span>
        <img src={product.icon} alt={product.name} loading="lazy" />
        <span className="stock-tag">
          {product.stock_quantity > 0 ? "Ready to ride" : "Sold out"}
        </span>
      </div>
      <div className="shop-card-content">
        <div className="shop-card-title">
          <h3>{product.name}</h3>
          <span>{money(product.price)}</span>
        </div>
        <p>{product.description}</p>
        <button
          className="add-product"
          disabled={busy || product.stock_quantity < 1}
          onClick={() => add(product)}
          aria-label={`Add ${product.name} to cart`}
        >
          <span>
            {busy
              ? "Adding…"
              : product.stock_quantity < 1
                ? "Out of stock"
                : "Add to cart"}
          </span>
          <span className="add-product-icon">+</span>
        </button>
      </div>
    </article>
  );
}
export default function Gear() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState("");
  const rail = useRef(null);
  useEffect(() => {
    let live = true;
    Promise.all([api("/products"), api("/categories")])
      .then(([p, c]) => {
        if (live) {
          setProducts(p);
          setCategories(c);
        }
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
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function add(product) {
    setBusy(product.product_id);
    try {
      await api("/cart/add", {
        method: "POST",
        body: JSON.stringify({ product_id: product.product_id, quantity: 1 }),
      });
      setNotice(`${product.name} added to your cart.`);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(null);
    }
  }
  const filtered = products.filter(
    (p) =>
      (category === "all" || p.category_id === category) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );
  if (sort !== "featured")
    filtered.sort((a, b) =>
      sort === "low" ? a.price - b.price : b.price - a.price,
    );
  const bikes = filtered.filter((p) => p.section === "bikes");
  const gear = filtered.filter((p) => p.section !== "bikes");
  const card = (product) => (
    <ProductCard
      key={product.product_id}
      product={product}
      category={
        categories.find((c) => c.category_id === product.category_id)?.name
      }
      add={add}
      busy={busy !== null}
    />
  );
  const orderedCategories = [...categories].sort(
    (a, b) => (b.section === "bikes") - (a.section === "bikes"),
  );
  return (
    <main className="shop-page">
      {notice && (
        <div className="shop-toast" role="status">
          {notice}
          <Link to="/cart">View cart ↗</Link>
        </div>
      )}
      <section className="shop-hero container">
        <div className="shop-hero-copy">
          <span className="eyebrow">THE WINNER BIKES COLLECTION / 01</span>
          <h1>
            Chase the ride.
            <br />
            <em>Find your edge.</em>
          </h1>
          <p>
            From the first climb to the final sprint. Exceptional bikes and
            considered essentials, made for the miles ahead.
          </p>
          <a href="#collection" className="shop-explore">
            Explore the collection <span>↓</span>
          </a>
        </div>
        <div className="shop-hero-art">
          <span className="hero-outline" aria-hidden="true">
            RIDE
          </span>
          <img
            src="/products/bike_cervelo.png"
            alt="Cervélo R5 road bike in side profile"
          />
          <div className="hero-art-caption">
            <span>PRECISION. PERFORMANCE. PURE JOY.</span>
            <span>↗</span>
          </div>
        </div>
      </section>
      <div className="shop-trust">
        <div className="container">
          <span>Race-inspired performance</span>
          <span>Complimentary shipping</span>
          <span>Made for your next chapter</span>
        </div>
      </div>
      <section id="collection" className="shop-collection container">
        <div className="collection-heading">
          <div>
            <span className="eyebrow">YOUR RIDE, YOUR WAY</span>
            <h2>
              The collection
              <span className="count-badge">{filtered.length}</span>
            </h2>
          </div>
          <label className="shop-search">
            <span className="sr-only">Search products</span>
            <input
              type="search"
              placeholder="Find your next essential…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span aria-hidden="true">⌕</span>
          </label>
        </div>
        <div className="shop-controls">
          <div className="category-tabs" aria-label="Filter by category">
            <button
              className={category === "all" ? "selected" : ""}
              aria-pressed={category === "all"}
              onClick={() => setCategory("all")}
            >
              All equipment
            </button>
            {orderedCategories.map((c) => (
              <button
                key={c.category_id}
                className={category === c.category_id ? "selected" : ""}
                aria-pressed={category === c.category_id}
                onClick={() => setCategory(c.category_id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <label className="shop-sort">
            <span className="sr-only">Sort products</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </label>
        </div>
        {loading ? (
          <div
            className="shop-skeleton"
            aria-label="Loading products"
            role="status"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="inline-error">
            {error}
          </p>
        ) : !filtered.length ? (
          <div className="empty-state">
            <h3>No matches yet.</h3>
            <p className="muted">Try another product name or category.</p>
          </div>
        ) : (
          <>
            {bikes.length > 0 && (
              <section className="bike-shelf" aria-label="Bikes">
                <div className="shelf-heading">
                  <div>
                    <span className="eyebrow">ENGINEERED TO GO FURTHER</span>
                    <h2>The race machines.</h2>
                  </div>
                  <div className="rail-controls">
                    <button
                      aria-label="Previous bikes"
                      onClick={() =>
                        rail.current?.scrollBy({
                          left: -rail.current.clientWidth * 0.8,
                          behavior: "smooth",
                        })
                      }
                    >
                      ←
                    </button>
                    <button
                      aria-label="Next bikes"
                      onClick={() =>
                        rail.current?.scrollBy({
                          left: rail.current.clientWidth * 0.8,
                          behavior: "smooth",
                        })
                      }
                    >
                      →
                    </button>
                  </div>
                </div>
                <div
                  className="bike-rail"
                  ref={rail}
                  tabIndex="0"
                  aria-label="Scroll to explore bikes"
                >
                  {bikes.map(card)}
                </div>
                <p className="rail-hint">
                  SCROLL TO EXPLORE <span>↔</span>
                </p>
              </section>
            )}
            {gear.length > 0 && (
              <section
                className="essentials-shelf"
                aria-label="Cycling essentials"
              >
                <div className="shelf-heading">
                  <div>
                    <span className="eyebrow">
                      SMALL DETAILS. BIG DIFFERENCE.
                    </span>
                    <h2>
                      {category === "all"
                        ? "The ride essentials."
                        : categories.find((c) => c.category_id === category)
                            ?.name}
                    </h2>
                  </div>
                  <span className="muted">{gear.length} pieces</span>
                </div>
                <div className="product-grid">{gear.map(card)}</div>
              </section>
            )}
          </>
        )}
      </section>
      <div className="shop-closing container">
        <span className="eyebrow">LESS SCROLLING. MORE RIDING.</span>
        <h2>See you out there.</h2>
        <Link to="/support">Need a hand choosing? Let’s talk ↗</Link>
      </div>
    </main>
  );
}
