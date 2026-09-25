import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [error, setError] = useState("");
  async function refresh() {
    setError("");
    try {
      const data = await api("/auth/me");
      setUser(data.user);
      setGoogleAvailable(data.googleAvailable);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function logout() {
    await api("/auth/logout", { method: "POST", body: "{}" });
    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, googleAvailable, logout }}
    >
      {loading ? (
        <div className="page-status" role="status">
          Getting ready for the ride…
        </div>
      ) : error ? (
        <div className="page-status">
          <p>We couldn’t connect to the shop.</p>
          <button className="primary-button" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
