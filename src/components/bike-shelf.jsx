import { useLayoutEffect, useRef, useState } from "react";

export default function BikeShelf({ bikes, children }) {
  const rail = useRef(null);
  const [position, setPosition] = useState({ first: 1, last: 1, start: true, end: false });
  const signature = bikes.map((bike) => bike.product_id).join(",");
  useLayoutEffect(() => {
    const element = rail.current;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const bounds = element.getBoundingClientRect();
      const visible = [...element.children].flatMap((card, index) => {
        const rect = card.getBoundingClientRect();
        const overlap = Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left);
        return overlap >= rect.width / 2 ? [index + 1] : [];
      });
      const next = { first: visible[0] || 1, last: visible.at(-1) || 1,
        start: element.scrollLeft < 2,
        end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2 };
      setPosition((previous) => Object.keys(next).every((key) => next[key] === previous[key]) ? previous : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    element.scrollTo({ left: 0, behavior: "instant" });
    measure();
    element.addEventListener("scroll", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); element.removeEventListener("scroll", schedule); };
  }, [signature]);
  const goTo = (index) => {
    const element = rail.current;
    const target = element.children[index];
    if (!target) return;
    element.scrollTo({
      left: target.getBoundingClientRect().left - element.getBoundingClientRect().left + element.scrollLeft,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };
  return (
    <section className="bike-shelf" aria-label="Bikes">
      <div className="shelf-heading">
        <div><span className="eyebrow">TOUR DE FRANCE WINNING MACHINES</span><h2>Bikes of the champions.</h2></div>
        <div className="rail-controls">
          <button type="button" aria-controls="shop-bikes" aria-label="Previous bikes" disabled={position.start} onClick={() => goTo(Math.max(0, position.first - 2))}>← <span>Previous</span></button>
          <button type="button" aria-controls="shop-bikes" aria-label="Next bikes" disabled={position.end} onClick={() => goTo(position.first)}> <span>Next</span> →</button>
        </div>
      </div>
      <div id="shop-bikes" className="bike-rail" ref={rail} tabIndex="0" role="region" aria-label="Bike carousel" onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight") { event.preventDefault(); goTo(Math.min(bikes.length - 1, position.first)); }
        if (event.key === "ArrowLeft") { event.preventDefault(); goTo(Math.max(0, position.first - 2)); }
      }}>{children}</div>
      {bikes.length > 1 && <div className="bike-pagination" aria-label="Jump to a bike">
        {bikes.map((bike, index) => <button key={bike.product_id} type="button" aria-label={`Show ${bike.name}`} aria-controls="shop-bikes" aria-current={index + 1 >= position.first && index + 1 <= position.last ? "true" : undefined} onClick={() => goTo(index)}><span /></button>)}
      </div>}
    </section>
  );
}
