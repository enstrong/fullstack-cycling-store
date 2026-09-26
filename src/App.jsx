import { loadRoute, preloadRoute } from "./route-loaders";
import { Component, lazy, Suspense, useLayoutEffect } from "react";
import ComparisonProvider from "@/components/comparison-provider.jsx";
import { AuthProvider } from "@/auth";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Header from "@/components/header.jsx";
import Footer from "@/components/footer.jsx";
import ScrollToTop from "@/components/scrollTop.jsx";
import SectionEntrances from "@/components/section-entrances.jsx";

import "./css/App.css";
import "./css/tabs/compare.css";
import "./css/tabs/account.css";
import "./css/header.css";
import "./css/footer.css";
import "./css/tabs/bikes.css";
import "./css/tabs/teams.css";
import "./css/tabs/gear.css";
import "./css/tabs/support.css";
import "./css/tabs/cart.css";
import "./css/tabs/admin.css";
import "./css/scrollTop.css";
import "./css/responsive-images.css";
import "./css/design-overrides.css";
import "./css/dynamic-header.css";
import "./css/interactions.css";

const Bikes = lazy(() => loadRoute("/"));
const Teams = lazy(() => loadRoute("/teams"));
const Gear = lazy(() => loadRoute("/gear"));
const Support = lazy(() => loadRoute("/support"));
const Cart = lazy(() => loadRoute("/cart"));
const Checkout = lazy(() => loadRoute("/cart/checkout"));
const Compare = lazy(() => loadRoute("/compare"));
const Account = lazy(() => loadRoute("/account"));
const Admin = lazy(() => loadRoute("/admin"));

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ComparisonProvider>
          <RoutePosition />
          <SectionEntrances />
          <div className="wrapper" onPointerOver={preloadRoute} onFocus={preloadRoute} onTouchStart={preloadRoute}>
            <Header />

            <div className="route-content">
              <RouteBoundary>
                <Suspense fallback={<div className="route-loading" role="status">Loading page…</div>}>
                <Routes>
                  <Route path="/" element={<Bikes />} />
                  <Route path="/teams" element={<Teams />} />
                  <Route path="/gear" element={<Gear />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/cart/checkout" element={<Checkout />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/account" element={<Account />} />
                </Routes>
                </Suspense>
              </RouteBoundary>
            </div>

            <Footer />
            <ScrollToTop />
          </div>
        </ComparisonProvider>
      </AuthProvider>
    </Router>
  );
}
function RoutePosition() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

class RouteBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="route-loading" role="alert">
      <p>This page couldn’t load. Please reload to try again.</p>
      <button className="primary-button" onClick={() => window.location.reload()}>Reload page</button>
    </div>;
    return this.props.children;
  }
}
