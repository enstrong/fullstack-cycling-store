import CompareLink from "@/components/compare-link.jsx";
import { useAuth } from "@/auth";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "@/css/App.css";
import "@/css/header.css";
import TdFlogo from "/icons/TdF_logo_white.png";

function CartIcon() {
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
      <path d="M2 3h2l2.5 12h13l2-8H5" />
      <circle cx="8" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

function AccountIcon() {
  const { user } = useAuth();
  return (
    <Link
      to="/account"
      className="header-account-link"
      aria-label={user ? "Your account" : "Sign in"}
      title={user ? user.name : "Sign in"}
    >
      <svg
        viewBox="0 0 24 24"
        className="header-action-icon"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
      </svg>
      {user && <span className="account-dot" />}
    </Link>
  );
}

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 700);
  const { pathname } = useLocation();

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 700);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener("resize", checkScreenSize);

    // Clean up
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    document.body.classList.remove("lock");
  }, [pathname, isMobile]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    document.body.classList.toggle("lock", !isOpen);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleClick = () => {
    if (isOpen) toggleMenu();
    scrollToTop();
  };

  return (
    <div className={`header ${pathname === "/compare" ? "header-comparison" : ""}`}>
      <div className="container header-content">
        {isMobile ? (
          <>
            <div className="mobile-header">
              <div className="mobile-header-actions">
                <Link
                  to="/cart"
                  onClick={handleClick}
                  className="mobile-cart-link"
                  aria-label="Cart"
                >
                  <CartIcon />
                </Link>
                <CompareLink />
                <AccountIcon />
              </div>

              <Link to="/" onClick={handleClick} className="mobile-logo-link">
                <img
                  src={TdFlogo}
                  alt="TdF logo"
                  className="header__logo header__logo-tdf"
                />
              </Link>

              <button
                className="burger-menu-button"
                onClick={toggleMenu}
                aria-label="Menu"
              >
                <div className={`burger-icon ${isOpen ? "open" : ""}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>

              <div className={`mobile-nav ${isOpen ? "open" : ""}`}>
                <div className="mobile-nav-links uppercase">
                  <Link
                    to="/"
                    className={pathname === "/" ? "active" : ""}
                    onClick={handleClick}
                  >
                    Bikes
                  </Link>
                  <Link
                    to="/teams"
                    className={pathname === "/teams" ? "active" : ""}
                    onClick={handleClick}
                  >
                    Teams
                  </Link>
                  <Link
                    to="/gear"
                    className={pathname === "/gear" ? "active" : ""}
                    onClick={handleClick}
                  >
                    Shop
                  </Link>
                  <Link
                    to="/support"
                    className={pathname === "/support" ? "active" : ""}
                    onClick={handleClick}
                  >
                    Support
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : (
          <nav className="main-header-nav uppercase">
            <Link
              to="/"
              className={pathname === "/" ? "active" : ""}
              onClick={handleClick}
            >
              Bikes
            </Link>
            <Link
              to="/teams"
              className={pathname === "/teams" ? "active" : ""}
              onClick={handleClick}
            >
              Teams
            </Link>
            <Link to="/" onClick={handleClick}>
              <img
                src={TdFlogo}
                alt="TdF logo"
                className="header__logo header__logo-tdf"
              />
            </Link>
            <Link
              to="/gear"
              className={pathname === "/gear" ? "active" : ""}
              onClick={handleClick}
            >
              Shop
            </Link>
            <Link
              to="/support"
              className={pathname === "/support" ? "active" : ""}
              onClick={handleClick}
            >
              Support
            </Link>
            <Link to="/cart" onClick={handleClick} aria-label="Cart">
              <CartIcon />
            </Link>
            <CompareLink />
            <AccountIcon />
          </nav>
        )}
      </div>
    </div>
  );
}
