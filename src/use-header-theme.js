import { useLayoutEffect, useState } from "react";

const ACCENTS = new Set(["yellow", "red", "light-blue", "blue"]);

export default function useHeaderTheme(pathname, headerRef) {
  const [theme, setTheme] = useState({ pathname, accent: "yellow", contrast: false });

  useLayoutEffect(() => {
    const content = document.querySelector(".route-content");
    const header = headerRef.current;
    if (!content || !header) return;
    let observers = [];
    let frame = 0;
    let activeSection = null;
    let contrast = false;
    const refresh = () => {
      frame = 0;
      observers.forEach((observer) => observer.disconnect());
      const bounds = header.getBoundingClientRect();
      const sections = pathname === "/" || pathname === "/teams"
        ? [...content.querySelectorAll("[data-header-accent]")] : [];
      const surfaces = [...content.querySelectorAll('[data-header-surface="light"]')];
      const sectionHits = new Set();
      const innerHits = new Set();
      const outerHits = new Set();
      const publish = () => {
        // Keep the current section while it still crosses the narrow probe band.
        if (!sectionHits.has(activeSection)) activeSection = sections.find((element) => sectionHits.has(element));
        const candidate = activeSection?.dataset.headerAccent;
        const accent = ACCENTS.has(candidate) ? candidate : "yellow";
        setTheme((previous) => previous.pathname === pathname && previous.accent === accent && previous.contrast === contrast
          ? previous : { pathname, accent, contrast });
      };
      const observeBand = (targets, top, bottom, hits, update) => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(({ target, isIntersecting }) => {
            if (isIntersecting) hits.add(target); else hits.delete(target);
          });
          update();
          publish();
        }, { rootMargin: `${-top}px 0px ${bottom - window.innerHeight}px 0px`, threshold: 0 });
        targets.forEach((target) => observer.observe(target));
        return observer;
      };
      observers = [
        observeBand(sections, bounds.bottom + 20, bounds.bottom + 28, sectionHits, () => {}),
        // Enter on a clear overlap; leave only after passing the larger band.
        observeBand(surfaces, bounds.top + 12, bounds.bottom - 12, innerHits, () => {
          if (innerHits.size) contrast = true;
        }),
        observeBand(surfaces, bounds.top, bounds.bottom + 6, outerHits, () => {
          if (!outerHits.size) contrast = false;
        }),
      ];
      if (!surfaces.length) contrast = false;
      if (!sections.length) activeSection = null;
      publish();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(refresh); };
    const mutations = new MutationObserver((records) => {
      if (records.some((record) => [...record.addedNodes, ...record.removedNodes].some((node) =>
        node.nodeType === 1 && (node.matches('[data-header-accent], [data-header-surface]') ||
          node.querySelector('[data-header-accent], [data-header-surface]'))))) schedule();
    });
    mutations.observe(content, { childList: true, subtree: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(header);
    window.addEventListener("resize", schedule);
    refresh();
    return () => {
      cancelAnimationFrame(frame);
      observers.forEach((observer) => observer.disconnect());
      mutations.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [pathname, headerRef]);

  return theme.pathname === pathname ? theme : { accent: "yellow", contrast: false };
}
