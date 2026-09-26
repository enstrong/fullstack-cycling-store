import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useComparison } from "@/comparison-context";
import ProductFacts from "@/components/product-facts.jsx";
import ProductExplorer from "@/components/product-explorer.jsx";
import BikeShelf from "@/components/bike-shelf.jsx";
import "@/css/tabs/compare.css";
import { api, money } from "@/api";
import "@/css/tabs/gear.css";
function ProductCard({ product, category, add, busy, blocked, added, explore }) {
  const { ids, toggle } = useComparison();
  const selected = ids.includes(product.product_id);
  return (
    <article data-entrance={product.section !== "bikes" ? "card" : undefined} className={`shop-card ${category === "Bikes" ? "bike-card" : ""}`}>
      <button type="button" className="shop-card-visual product-image-trigger" data-header-surface="light"
        onClick={() => explore(product)} aria-label={`Explore ${product.name} image`} aria-haspopup="dialog">
        <span className="product-tag">{category}</span>
        <img src={product.icon} alt={product.name} loading="lazy" />
        <span className="image-explore-hint" aria-hidden="true">View image ↗</span>
        <span className="stock-tag">
          {product.stock_quantity > 0 ? "Ready to ride" : "Sold out"}
        </span>
      </button>
      <div className="shop-card-content">
        <div className="shop-card-title">
          <h3>{product.name}</h3>
          <span>{money(product.price)}</span>
        </div>
        <span className="heritage-tag">
          {product.research?.connection || "Winner link unverified"}
        </span>
        <p>{product.description}</p>
        <ProductFacts product={product} />
        <button
          className={`compare-product ${selected ? "selected" : ""}`}
          aria-pressed={selected}
          disabled={!selected && ids.length >= 4}
          onClick={() => toggle(product.product_id)}
        >
          {selected
            ? "✓ Selected for comparison"
            : ids.length >= 4
              ? "Comparison full (4 / 4)"
              : "+ Compare this product"}
        </button>
        <button
          className={`add-product ${added ? "product-added" : ""}`}
          disabled={blocked || product.stock_quantity < 1}
          aria-busy={busy}
          onClick={() => add(product)}
          aria-label={`Add ${product.name} to cart`}
        >
          <span>
            {busy
              ? "Adding…"
              : product.stock_quantity < 1
                ? "Out of stock"
                : added ? "Added to cart" : "Add to cart"}
          </span>
          <span className={`add-product-icon ${busy ? "is-pending" : ""}`} aria-hidden="true">
            {busy ? "↻" : added ? "✓" : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h2l2.5 12h13l2-8H5" />
                <circle cx="8" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
            )}
          </span>
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
  const [added, setAdded] = useState(null);
  const [exploring, setExploring] = useState(null);
  const pending = useRef(false);
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
    if (pending.current) return;
    pending.current = true;
    setAdded(null);
    setBusy(product.product_id);
    try {
      await api("/cart/add", {
        method: "POST",
        body: JSON.stringify({ product_id: product.product_id, quantity: 1 }),
      });
      setNotice(`${product.name} added to your cart.`);
      setAdded(product.product_id);
    } catch (err) {
      setNotice(err.message);
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }
  useEffect(() => {
    if (added === null) return;
    const timer = setTimeout(() => setAdded(null), 2200);
    return () => clearTimeout(timer);
  }, [added]);
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
      busy={busy === product.product_id}
      blocked={busy !== null}
      added={added === product.product_id}
      explore={setExploring}
    />
  );
  const orderedCategories = [...categories].sort(
    (a, b) => (b.section === "bikes") - (a.section === "bikes"),
  );
  return (
    <main className="shop-page">
      {exploring && <ProductExplorer key={exploring.product_id} product={exploring} onClose={() => setExploring(null)} />}
      {notice && (
        <div className="shop-toast" role="status">
          {notice}
          <Link to="/cart">View cart ↗</Link>
        </div>
      )}
      <section className="shop-hero container">
        <div data-entrance className="shop-hero-copy">
          <span className="eyebrow">TOUR DE FRANCE · THE WINNERS’ EQUIPMENT</span>
          <h1>
            Made for the race.
            <br />
            <em>Remembered by it.</em>
          </h1>
          <p>
            Explore the bikes and equipment linked to Tour de France winners,
            from historic machines to the latest race gear. Product details and
            rider connections are sourced, with unknowns clearly marked.
          </p>
          <a href="#collection" className="shop-explore">
            View the collection <span>↓</span>
          </a>
        </div>
        <div className="shop-hero-art" data-header-surface="light">
          <img
            src="/products/bike_cervelo.png"
            alt="Cervélo R5 road bike in side profile"
          />
          <div className="hero-art-caption">
            <span>CERVÉLO R5 · TOUR WINNING FLEET</span>
            <span>01</span>
          </div>
        </div>
      </section>
      <section id="collection" className="shop-collection container">
        <div className="collection-heading">
          <div>
          <span className="eyebrow">RACE HERITAGE, WITH THE DETAILS</span>
            <h2>
              The collection
              <span className="count-badge">{filtered.length}</span>
            </h2>
          </div>
          <label className="shop-search">
            <span className="sr-only">Search products</span>
            <input
              type="search"
              placeholder="Search bikes and equipment…"
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
              <BikeShelf bikes={bikes}>{bikes.map(card)}</BikeShelf>
            )}
            {gear.length > 0 && (
              <section
                className="essentials-shelf"
                aria-label="Cycling essentials"
              >
                <div className="shelf-heading">
                  <div>
                    <span className="eyebrow">
                      GEAR FROM THE PELOTON
                    </span>
                    <h2>
                      {category === "all"
                        ? "Equipment of the winners."
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
        <Link to="/support">Questions about the collection? Visit support ↗</Link>
      </div>
    </main>
  );
}
