import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function SectionEntrances() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches || !("IntersectionObserver" in window)) return;
    const content = document.querySelector(".route-content");
    if (!content) return;
    const elements = new Set();
    const settle = (element) => {
      element.classList.remove("entrance-pending", "entrance-visible");
      element.classList.add("entrance-settled");
      observer.unobserve(element);
    };
    const reveal = (element) => {
      if (element.classList.contains("entrance-settled")) return;
      element.classList.remove("entrance-pending");
      element.classList.add("entrance-visible");
      observer.unobserve(element);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { threshold: 0, rootMargin: "0px 0px -64px 0px" });
    const discover = () => {
      // Cards arrive after the API response and can be replaced by filters.
      elements.forEach((element) => {
        if (!content.contains(element)) {
          observer.unobserve(element);
          elements.delete(element);
        }
      });
      content.querySelectorAll("[data-entrance]").forEach((element) => {
        if (elements.has(element)) return;
        elements.add(element);
        if (motion.matches) return;
        element.classList.add("entrance-pending");
        observer.observe(element);
      });
    };
    discover();
    const mutations = new MutationObserver(discover);
    mutations.observe(content, { childList: true, subtree: true });
    const onFocus = (event) => {
      const element = event.target.closest("[data-entrance]");
      // Finish permanently: disabling a clicked button can move focus away,
      // which must never restart the card's entrance.
      if (element) settle(element);
    };
    const onAnimationEnd = (event) => {
      if (event.animationName === "section-entrance" && elements.has(event.target)) {
        settle(event.target);
      }
    };
    const onMotionChange = () => {
      if (motion.matches) elements.forEach(settle);
    };
    document.addEventListener("focusin", onFocus);
    content.addEventListener("animationend", onAnimationEnd);
    motion.addEventListener("change", onMotionChange);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      document.removeEventListener("focusin", onFocus);
      content.removeEventListener("animationend", onAnimationEnd);
      motion.removeEventListener("change", onMotionChange);
      elements.forEach((element) => element.classList.remove("entrance-pending", "entrance-visible", "entrance-settled"));
    };
  }, [pathname]);
  return null;
}
