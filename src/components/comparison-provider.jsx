import { useEffect, useState } from "react";
import { ComparisonContext } from "@/comparison-context";
export default function ComparisonProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("winner-compare") || "[]");
      return Array.isArray(saved)
        ? [
            ...new Set(
              saved.filter((id) => Number.isSafeInteger(id) && id > 0),
            ),
          ].slice(0, 4)
        : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("winner-compare", JSON.stringify(ids));
    } catch {
      /* Comparison works without browser storage. */
    }
  }, [ids]);
  function toggle(id) {
    setIds((current) =>
      current.includes(id)
        ? current.filter((v) => v !== id)
        : current.length < 4
          ? [...current, id]
          : current,
    );
  }
  return (
    <ComparisonContext.Provider
      value={{ ids, toggle, clear: () => setIds([]), setIds }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}
