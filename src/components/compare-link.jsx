import { Link } from "react-router-dom";
import { useComparison } from "@/comparison-context";
export function CompareIcon() {
  return (
    <svg
      className="header-action-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4h6v16H4zM14 4h6v16h-6zM7 8h0M17 8h0M7 12h0M17 12h0" />
    </svg>
  );
}
export default function CompareLink() {
  const { ids } = useComparison();
  return (
    <Link
      to="/compare"
      className="header-compare-link"
      aria-label={`Compare products${ids.length ? ` (${ids.length})` : ""}`}
      title="Compare products"
    >
      <CompareIcon />
      {ids.length > 0 && <span className="compare-count">{ids.length}</span>}
    </Link>
  );
}
