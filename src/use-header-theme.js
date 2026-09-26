import { useLayoutEffect, useState } from "react";

const ACCENTS = new Set(["yellow", "red", "light-blue", "blue"]);

export default function useHeaderTheme(pathname, headerRef) {
  const [theme, setTheme] = useState({ pathname, accent: "yellow", contrast: false });

  useLayoutEffect(() => {
    const content = document.querySelector(".route-content");
    const header = headerRef.current;
    if (!content || !header) return;

    let frame = 0;
    let sections = [];
    let lightSurfaces = [];
    const update = () => {
      frame = 0;
      const bounds = header.getBoundingClientRect();
      // Include the scroll padding used by team links so their destination
      // receives its colour as soon as it settles just below the header.
      const probe = bounds.bottom + 24;
      const section = sections.find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top <= probe && rect.bottom > probe;
      });
      const candidate = section?.dataset.headerAccent;
      const accent = ACCENTS.has(candidate) ? candidate : "yellow";
      const contrast = lightSurfaces.some((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top < bounds.bottom - 12 && rect.bottom > bounds.top + 12
          && rect.left < bounds.right && rect.right > bounds.left;
      });
      setTheme((previous) => previous.pathname === pathname
        && previous.accent === accent && previous.contrast === contrast
        ? previous : { pathname, accent, contrast });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const refresh = () => {
      sections = pathname === "/" || pathname === "/teams"
        ? [...content.querySelectorAll("[data-header-accent]")] : [];
      lightSurfaces = [...content.querySelectorAll('[data-header-surface="light"]')];
      schedule();
    };

    refresh();
    // Products arrive asynchronously; refresh targets without polling the DOM.
    const mutationObserver = new MutationObserver(refresh);
    mutationObserver.observe(content, { childList: true, subtree: true });
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(content);
    resizeObserver.observe(header);
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname, headerRef]);

  // Route changes never carry a bike/team colour onto Shop or Support.
  return theme.pathname === pathname ? theme : { accent: "yellow", contrast: false };
}
