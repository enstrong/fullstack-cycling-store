import '@/css/App.css'
import '@/css/tabs/bikes.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { api, API_BASE } from '@/api';

export default function Bikes() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const navigate = useNavigate();
  const [activeBike, setActiveBike] = useState(null);
  const [addedBike, setAddedBike] = useState(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const schedule = (callback, delay) => timers.current.push(setTimeout(callback, delay));
  const buttonLabel = (name) => addedBike === name ? '✓ Added to cart' : loading && activeBike === name ? 'Adding…' : 'Buy now →';

  useEffect(() => {
    const fetchBikes = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/products`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        const bikeProducts = data.filter(product => product.category_id === 7);
        setProducts(bikeProducts);
      } catch (error) {
        console.error('Error fetching bike products:', error);
      }
    };

    fetchBikes();
  }, []);

  const handleBuyNow = async (bikeName) => {
    if (loading || addedBike) return;
    try {
      setActiveBike(bikeName);
      setLoading(true);
      
      const bikeProduct = products.find(product => 
        product.name.includes(bikeName) || 
        (bikeName === 'Colnago V4Rs' && product.name.includes('Colnago')) ||
        (bikeName === 'Cervélo R5' && product.name.includes('Cervélo')) ||
        (bikeName === 'Pinarello' && product.name.includes('Pinarello')) ||
        (bikeName === 'S-Works' && product.name.includes('S-Works'))
      );
      
      if (!bikeProduct) {
        setNotification({
          show: true,
          message: `Product not found: ${bikeName}`,
          type: 'error'
        });
        schedule(() => setNotification({ show: false, message: '', type: '' }), 3000);
        return;
      }
      
      await api('/cart/add', { method: 'POST', body: JSON.stringify({ product_id: bikeProduct.product_id, quantity: 1 }) });

      setAddedBike(bikeName);
      setNotification({
        show: true,
        message: `${bikeProduct.name} added to cart!`,
        type: 'success'
      });
      
      schedule(() => {
        navigate('/cart');
      }, 1000);
      
    } catch (error) {
      console.error('Error adding bike to cart:', error);
      setNotification({
        show: true,
        message: 'Failed to add bike to cart',
        type: 'error'
      });
      schedule(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {notification.show && (
        <div className={`shop-toast notification ${notification.type}`} role={notification.type === "error" ? "alert" : "status"}>
          {notification.message}
        </div>
      )}
      
      <div data-header-accent="yellow" className="section colnago-bg d-flex align-center">
        <div className="container d-flex align-center justify-center f-column">
          <h1 data-entrance className="bikes-section__title uppercase">For the winners</h1>
          <section data-entrance className="buy-now">
            <p className="bikes-section__text">Tadej Pogačar, 3-time Tour de France Champion rides <i>Colnago V4Rs</i></p>
            <button 
              className="bikes-section__button d-flex"
              onClick={() => handleBuyNow('Colnago V4Rs')}
              disabled={loading || Boolean(addedBike)}
            >
              {buttonLabel('Colnago V4Rs')}
            </button>
          </section>
        </div>
      </div>

      <div data-header-accent="yellow" className="section cervelo-bg d-flex align-center">
        <div className="container d-flex align-center justify-center f-column">
          <h1 data-entrance className="bikes-section__title uppercase">The Elegant</h1>
          <section data-entrance className="buy-now">
            <p className="bikes-section__text cervelo-text">Jonas Vingegaard, twice Tour de France Champion rides <i>Cervélo R5</i></p>
            <q>The Cervélo R5 is designed for all the glory and fanfare that comes with a summit and a finish on the descent below. A climbing bike that is light, aerodynamic and stiff, it shows that smooth handling, poise, and unmatched speed can come in one stealthy package.</q>
            <button 
              className="bikes-section__button d-flex"
              onClick={() => handleBuyNow('Cervélo R5')}
              disabled={loading || Boolean(addedBike)}
            >
              {buttonLabel('Cervélo R5')}
            </button>
          </section>
        </div>
      </div>

      <div data-header-accent="red" className="section pinarello-bg d-flex align-end">
        <div className="container d-flex f-column">
          <h1 data-entrance className="bikes-section__title uppercase">Falling in love</h1>
          <section data-entrance className="buy-now">
            <p className="bikes-section__text"><i>Pinarello</i> bikes won 7 Tour de France titles in the span of 8 years.</p>
            <button 
              className="bikes-section__button pinarello__button d-flex"
              onClick={() => handleBuyNow('Pinarello')}
              disabled={loading || Boolean(addedBike)}
            >
              {buttonLabel('Pinarello')}
            </button>
          </section>
        </div>
      </div>

      <div data-header-accent="light-blue" className="section sworks-bg d-flex align-center">
        <div className="container d-flex f-column">
          <h1 data-entrance className="bikes-section__title uppercase">S-Works</h1>
          <section data-entrance className="buy-now">
            <p className="bikes-section__text"><i>Specialized S-Works</i>, the choice of champions, powered Astana to Tour de France glory in 2014.</p>
            <button 
              className="bikes-section__button sworks__button d-flex"
              onClick={() => handleBuyNow('S-Works')}
              disabled={loading || Boolean(addedBike)}
            >
              {buttonLabel('S-Works')}
            </button>
          </section>
        </div>
      </div>
    </>
  );
}