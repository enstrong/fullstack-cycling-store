import { useLayoutEffect } from "react";
import ComparisonProvider from "@/components/comparison-provider.jsx";
import Compare from "@/components/tabs/compare.jsx";
import { AuthProvider } from "@/auth";
import Account from "@/components/tabs/account.jsx";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import "./css/App.css";
import Header from "@/components/header.jsx";
import Footer from "@/components/footer.jsx";
import Bikes from "@/components/tabs/bikes.jsx";
import Teams from "@/components/tabs/teams.jsx";
import Gear from "@/components/tabs/gear.jsx";
import Support from "@/components/tabs/support.jsx";
import Cart from "@/components/tabs/cart.jsx";
import Checkout from "@/components/tabs/checkout.jsx";
import Admin from "@/components/tabs/admin.jsx";
import ScrollToTop from "@/components/scrollTop.jsx";
import "./css/design-overrides.css";
import "./css/dynamic-header.css";
import SectionEntrances from "@/components/section-entrances.jsx";
import "./css/interactions.css";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ComparisonProvider>
          <RoutePosition />
          <SectionEntrances />
          <div className="wrapper">
            <Header />

            <div className="route-content">
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
