import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ProductExplorer({ product, onClose }) {
  const dialogRef = useRef(null);
  const stageRef = useRef(null);
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    stage.scrollLeft = zoomed ? (stage.scrollWidth - stage.clientWidth) / 2 : 0;
    stage.scrollTop = zoomed ? (stage.scrollHeight - stage.clientHeight) / 2 : 0;
  }, [zoomed]);
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog ref={dialogRef} className="product-explorer" aria-labelledby="explorer-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}>
      <div className="explorer-heading">
        <div><span className="eyebrow">PRODUCT VIEW</span><h2 id="explorer-title">{product.name}</h2></div>
        <button type="button" className="explorer-close" onClick={onClose} aria-label="Close product view" autoFocus>×</button>
      </div>
      <div ref={stageRef} className={`explorer-stage ${zoomed ? "is-zoomed" : ""}`} tabIndex="0" aria-label="Product image; scroll to explore when enlarged">
        {failed ? <p role="status">This image could not be loaded.</p> :
          <img src={product.icon} alt={product.name} onError={() => setFailed(true)} />}
      </div>
      <div className="explorer-toolbar">
        <p>{zoomed ? "Scroll or swipe to explore the image." : "Enlarge the image for a closer look."}</p>
        <button type="button" className="secondary-button" disabled={failed} aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)}>{zoomed ? "Fit image" : "Zoom in +"}</button>
      </div>
    </dialog>, document.body,
  );
}
