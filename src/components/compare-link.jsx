import { Link } from "react-router-dom";
import { useComparison } from "@/comparison-context";
import { useEffect, useRef } from "react";
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
  const badge = useRef(null);
  const previousIds = useRef(ids);
  useEffect(() => {
    const added = ids.some((id) => !previousIds.current.includes(id));
    previousIds.current = ids;
    if (!added || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = badge.current?.animate([
      { transform: "scale(1)" },
      { transform: "scale(1.4)", offset: 0.35 },
      { transform: "scale(1)" },
    ], { duration: 380, easing: "ease-out" });
    return () => animation?.cancel();
  }, [ids]);
  return (
    <Link
      to="/compare"
      className="header-compare-link"
      aria-label={`Compare products${ids.length ? ` (${ids.length})` : ""}`}
      title="Compare products"
    >
      <CompareIcon />
      {ids.length > 0 && <span ref={badge} className="compare-count">{ids.length}</span>}
      <span className="sr-only" role="status">{ids.length} products selected for comparison</span>
    </Link>
  );
}
