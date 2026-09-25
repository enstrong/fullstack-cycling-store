import { Link } from "react-router-dom";
import "@/css/footer.css";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" aria-label="Winner Bikes home">
              WINNER<span>BIKES</span>
              <span className="footer-arrow">↗</span>
            </Link>
            <p>
              For the climbs. For the freedom.
              <br />
              For the love of the ride.
            </p>
          </div>
          <nav className="footer-nav" aria-label="Footer">
            <div>
              <span>EXPLORE</span>
              <Link to="/">Bikes</Link>
              <Link to="/gear">The collection</Link>
              <Link to="/teams">The teams</Link>
            </div>
            <div>
              <span>YOUR RIDE</span>
              <Link to="/account">Your account</Link>
              <Link to="/cart">Your cart</Link>
              <Link to="/support">Help & support</Link>
            </div>
            <div>
              <span>BEHIND THE BUILD</span>
              <a
                href="https://github.com/enstrong/fullstack-cycling-store"
                target="_blank"
                rel="noreferrer"
              >
                Source code ↗
              </a>
              <a
                href="https://github.com/enstrong"
                target="_blank"
                rel="noreferrer"
              >
                enstrong on GitHub ↗
              </a>
            </div>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Winner Bikes</span>
          <span>
            DESIGNED & BUILT BY{" "}
            <a
              href="https://github.com/enstrong"
              target="_blank"
              rel="noreferrer"
            >
              ENSTRONG
            </a>
          </span>
          <span>KEEP MOVING FORWARD ↗</span>
        </div>
      </div>
    </footer>
  );
}
