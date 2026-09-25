import { specDefinitions } from "../../shared/comparison.mjs";
export function SpecValue({ spec, definition }) {
  if (spec?.value == null) return <span className="spec-unknown">Unknown</span>;
  return (
    <>
      {spec.value}
      {definition?.unit ? ` ${definition.unit}` : ""}
    </>
  );
}
export default function ProductFacts({ product }) {
  const facts = product.research;
  return (
    <details className="product-facts">
      <summary>
        Specifications & race history <span aria-hidden="true">+</span>
      </summary>
      <div className="product-facts-body">
        <p className="facts-model">{facts?.model || product.name}</p>
        <p>
          <strong>Riders</strong>
          <br />
          {facts?.riders || "Unknown"}
        </p>
        <dl>
          {Object.entries(
            facts?.specs || {
              weight: { value: null },
              material: { value: null },
              sizes: { value: null },
              tour_wins: { value: null },
            },
          ).map(([key, spec]) => (
            <div key={key}>
              <dt>{specDefinitions[key]?.label || key}</dt>
              <dd>
                <SpecValue spec={spec} definition={specDefinitions[key]} />
                {spec.note && <small>{spec.note}</small>}
              </dd>
            </div>
          ))}
        </dl>
        {facts?.note && <p className="facts-note">{facts.note}</p>}
        <p className="facts-note">
          Tour victories count confirmed men’s overall winning campaigns
          involving this model. Unknown is not zero. Size ranges are
          manufacturer references, not live size stock.
        </p>
        {facts?.sources?.length > 0 && (
          <div className="fact-sources">
            <strong>Sources</strong>
            {facts.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.label} ↗
              </a>
            ))}
            <small>Checked {facts.checked}</small>
          </div>
        )}
      </div>
    </details>
  );
}
