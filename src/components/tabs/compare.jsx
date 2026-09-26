import ResponsiveImage from "@/components/responsive-image.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "@/api";
import { useComparison } from "@/comparison-context";
import { SpecValue } from "@/components/product-facts.jsx";
import {
  comparisonGroups,
  compareRows,
  getSpec,
  groupFor,
  rankSpec,
  specDefinitions,
} from "../../../shared/comparison.mjs";

export default function Compare() {
  const { ids, toggle, clear, setIds } = useComparison();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [group, setGroup] = useState("bikes");
  const [search, setSearch] = useState("");
  const [differences, setDifferences] = useState(false);
  useEffect(() => {
    let live = true;
    api("/products")
      .then((data) => {
        if (live) {
          setProducts(data);
          setError("");
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
  }, [attempt]);
  useEffect(() => {
    if (loading || error) return;
    const valid = ids.filter((id) => products.some((p) => p.product_id === id));
    if (valid.length !== ids.length) setIds(valid);
  }, [ids, products, loading, error, setIds]);
  const selected = ids
    .map((id) => products.find((p) => p.product_id === id))
    .filter(Boolean);
  const available = products.filter(
    (p) =>
      groupFor(p) === group &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const rows = compareRows(selected).filter(
    (key) =>
      !differences ||
      selected.length < 2 ||
      new Set(selected.map((p) => JSON.stringify(getSpec(p, key)))).size > 1,
  );
  return (
    <main className="page-shell comparison-page">
      <div className="container">
        <div className="comparison-heading">
          <div>
            <span className="eyebrow">THE DETAILS MAKE THE DIFFERENCE</span>
            <h1>
              Side by side.
              <br />
              <em>Find your edge.</em>
            </h1>
            <p>
              From the yellow jersey to your next ride. Compare the numbers,
              explore the stories, and choose what matters to you.
            </p>
          </div>
          <div className="comparison-counter">
            <strong>
              {selected.length}
              <span>/ 4</span>
            </strong>
            <span>PRODUCTS ON THE LINE</span>
          </div>
        </div>
        {error ? (
          <div className="inline-error" role="alert">
            <p>{error}</p>
            <button
              className="secondary-button"
              onClick={() => {
                setLoading(true);
                setAttempt(attempt + 1);
              }}
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <p className="comparison-loading" role="status">
            Loading the collection…
          </p>
        ) : (
          <>
            <section
              className="compare-picker"
              aria-labelledby="choose-heading"
            >
              <div className="compare-section-heading">
                <div>
                  <span className="eyebrow">01 / BUILD YOUR LINE-UP</span>
                  <h2 id="choose-heading">Choose your equipment</h2>
                </div>
                <Link className="text-link" to="/gear">
                  Explore the shop ↗
                </Link>
              </div>
              <div className="compare-picker-controls">
                <label>
                  Category
                  <select
                    value={group}
                    onChange={(e) => {
                      setGroup(e.target.value);
                      setSearch("");
                    }}
                  >
                    {comparisonGroups.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Find a product
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search this category…"
                  />
                </label>
              </div>
              <div className="compare-candidates">
                {available.map((p) => (
                  <button
                    key={p.product_id}
                    className={`compare-candidate ${ids.includes(p.product_id) ? "selected" : ""}`}
                    onClick={() => toggle(p.product_id)}
                    aria-pressed={ids.includes(p.product_id)}
                    disabled={!ids.includes(p.product_id) && ids.length >= 4}
                  >
                    <ResponsiveImage sizes="90px" src={p.icon} alt="" loading="lazy" />
                    <span>
                      <strong>{p.name}</strong>
                      <small>{money(p.price)}</small>
                    </span>
                    <span className="candidate-mark" aria-hidden="true">
                      {ids.includes(p.product_id) ? "✓" : "+"}
                    </span>
                  </button>
                ))}
                {!available.length && (
                  <p className="muted">No matches in this category.</p>
                )}
              </div>
              <p className="compare-selection-status" role="status">
                {ids.length === 4
                  ? "Your line-up is full. Remove a product to choose another."
                  : `${ids.length} of 4 selected. Choose at least two to highlight differences.`}
              </p>
            </section>
            {selected.length === 0 ? (
              <div className="comparison-empty">
                <span aria-hidden="true">↔</span>
                <h2>Every champion has a choice.</h2>
                <p>Select products above, or use “Compare” on any shop card.</p>
              </div>
            ) : (
              <section
                className="comparison-results"
                aria-labelledby="results-heading"
              >
                <div className="compare-section-heading">
                  <div>
                    <span className="eyebrow">02 / LOOK CLOSER</span>
                    <h2 id="results-heading">Your comparison</h2>
                  </div>
                  <button className="text-link" onClick={clear}>
                    Clear comparison ×
                  </button>
                </div>
                <div className="comparison-toolbar">
                  <div className="comparison-legend">
                    <span className="legend-best">Favourable figure</span>
                    <span className="legend-worst">Less favourable figure</span>
                    <span>Unknowns & ties stay neutral</span>
                  </div>
                  <label className="difference-toggle">
                    <input
                      type="checkbox"
                      checked={differences}
                      onChange={(e) => setDifferences(e.target.checked)}
                    />{" "}
                    Only differences
                  </label>
                </div>
                <p className="comparison-explainer">
                  Colours compare price, reference weight and confirmed Tour
                  wins within the same category. Reference sizes and builds may
                  differ—check the notes. More wins do not mean a better
                  product.
                </p>
                <p className="comparison-scroll-hint">
                  Swipe or scroll horizontally to see every product ↔
                </p>
                <div
                  className="comparison-scroll"
                  tabIndex="0"
                  role="region"
                  aria-label="Product comparison table, scroll horizontally"
                >
                  <table className="comparison-table">
                    <caption className="sr-only">
                      Product specifications and Tour de France heritage. Green
                      and red figures also include text labels.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col" className="comparison-label">
                          <span className="eyebrow">THE LINE-UP</span>
                          <p>
                            Built for
                            <br />
                            your ride.
                          </p>
                        </th>
                        {selected.map((p) => (
                          <th scope="col" key={p.product_id}>
                            <div className="comparison-product">
                              <button
                                className="comparison-remove"
                                onClick={() => toggle(p.product_id)}
                                aria-label={`Remove ${p.name} from comparison`}
                              >
                                ×
                              </button>
                              <ResponsiveImage sizes="260px" src={p.icon} alt={p.name} />
                              <span className="eyebrow">
                                {comparisonGroups.find(
                                  ([v]) => v === groupFor(p),
                                )?.[1] || "Equipment"}
                              </span>
                              <h3>{p.name}</h3>
                              <span className="heritage-tag">
                                {p.research?.connection ||
                                  "Winner link unverified"}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((key) => (
                        <tr key={key}>
                          <th scope="row" className="comparison-label">
                            {specDefinitions[key].label}
                            {key === "tour_wins" && (
                              <small>Men’s overall · confirmed campaigns</small>
                            )}
                            {key === "weight" && selected.every((p) => groupFor(p) === "bikes") && (
                              <small>Complete bike</small>
                            )}
                          </th>
                          {selected.map((p) => {
                            const spec = getSpec(p, key),
                              rank = rankSpec(selected, key, p),
                              definition = specDefinitions[key];
                            return (
                              <td
                                key={p.product_id}
                                className={rank ? `spec-${rank}` : ""}
                              >
                                <strong className="spec-main">
                                  {key === "price" ? (
                                    money(spec.value)
                                  ) : (
                                    <SpecValue
                                      spec={spec}
                                      definition={definition}
                                    />
                                  )}
                                </strong>
                                {rank && (
                                  <span className="spec-rank">
                                    {rank === "best" ? "↗" : "↘"}{" "}
                                    {definition[rank]}
                                  </span>
                                )}
                                {spec.note && (
                                  <small className="spec-note">
                                    {spec.note}
                                  </small>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={selected.length + 1}>
                            No differences in the available specification rows.
                            Unknown values do not confirm identical products.
                          </td>
                        </tr>
                      )}
                      <tr>
                        <th scope="row" className="comparison-label">
                          Riders & heritage
                        </th>
                        {selected.map((p) => (
                          <td key={p.product_id}>
                            <strong>{p.research?.riders || "Unknown"}</strong>
                            <p className="spec-story">{p.description}</p>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th scope="row" className="comparison-label">
                          Model & sources
                        </th>
                        {selected.map((p) => (
                          <td key={p.product_id}>
                            <strong>
                              {p.research?.model || "Exact model unknown"}
                            </strong>
                            <p className="spec-story">
                              {p.research?.note ||
                                "Specifications have not been researched for this product."}
                            </p>
                            <div className="fact-sources">
                              {p.research?.sources?.map((source) => (
                                <a
                                  key={source.url}
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {source.label} ↗
                                </a>
                              ))}
                              {p.research?.checked && (
                                <small>Checked {p.research.checked}</small>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="comparison-footnote">
                  Tour de France victories count documented winning campaigns
                  involving the model—not the rider’s career total, stage wins,
                  or another generation’s record. Riders may use several bikes
                  in one Tour. Retail replicas do not inherit the race
                  equipment’s wins. Size ranges are manufacturer references, not
                  live stock.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
