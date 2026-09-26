import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

export default function useCartCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let controller;
    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      try {
        const { items } = await api("/cart", { signal });
        if (!signal.aborted) {
          setCount(items.reduce((total, item) => total + Number(item.quantity), 0));
        }
      } catch {
        // Keep the last confirmed count during a temporary connection failure.
      }
    };
    setCount(0);
    window.addEventListener("cart-changed", refresh);
    window.addEventListener("focus", refresh);
    refresh();
    return () => {
      controller?.abort();
      window.removeEventListener("cart-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [user]);

  return count;
}
