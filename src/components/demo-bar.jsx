import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/auth';
import { api, invalidateCatalog } from '@/api';
import '../css/demo.css';
export default function DemoBar() {
  const { demo, setUser } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const bar = useRef(null);
  useEffect(() => {
    if (!demo || !bar.current) return;
    const observer = new ResizeObserver(([entry]) => document.documentElement.style.setProperty('--demo-height', `${entry.target.offsetHeight}px`));
    observer.observe(bar.current);
    document.body.classList.add('has-demo');
    return () => { observer.disconnect(); document.body.classList.remove('has-demo'); };
  }, [demo]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!demo) return null;
  async function act(reset) {
    setBusy(true); setError('');
    try {
      if (reset) {
        await api('/demo/reset', { method: 'POST', body: '{}' });
        invalidateCatalog();
        try { localStorage.removeItem("winner-compare"); } catch { /* Storage is optional. */ }
        window.location.assign('/');
      } else {
        const { user } = await api('/demo/role', { method: 'POST', body: JSON.stringify({ role: pathname === '/admin' ? 'customer' : 'admin' }) });
        setUser(user); invalidateCatalog();
        navigate(pathname === '/admin' ? '/' : '/admin');
      }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <aside ref={bar} className="demo-bar" aria-label="Portfolio demo">
    <div><strong>Portfolio demo</strong><span>Private shop · expires in 24h · no real purchases</span></div>
    <nav aria-label="Demo controls">
      <Link to="/account">Your orders</Link>
      <button disabled={busy} onClick={() => act(false)}>{pathname === '/admin' ? 'Back to shop' : 'Explore admin'}</button>
      <button disabled={busy} onClick={() => act(true)}>Reset demo</button>
    </nav>
    {error && <p role="alert">{error}</p>}
  </aside>;
}
