import React, { useState, useEffect, useCallback } from 'react';

// Fallback Giphy API key if none is provided in .env
const DEFAULT_GIPHY_API_KEY = 'LIVD6SrqS96Iu9E7U19r1y4hG5GfO615'; 
const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || DEFAULT_GIPHY_API_KEY;

const CATEGORIES = [
  { id: 'trending', label: 'Trending', icon: 'bx-trending-up' },
  { id: 'reactions', label: 'Reacciones', query: 'reactions' },
  { id: 'love', label: 'Amor', query: 'love' },
  { id: 'funny', label: 'Gracioso', query: 'funny' },
  { id: 'bye', label: 'Adiós', query: 'bye' },
];

export default function GifPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('trending');
  const [error, setError] = useState(null);

  const fetchGifs = useCallback(async (query = '', categoryId = 'trending') => {
    setLoading(true);
    setError(null);
    try {
      let url;
      if (query) {
        url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`;
      } else {
        const cat = CATEGORIES.find(c => c.id === categoryId);
        if (cat && cat.query) {
          url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(cat.query)}&limit=20&rating=g`;
        } else {
          url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;
        }
      }
      
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
      const data = await resp.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Error fetching GIFs:', err);
      setError('No se pudieron cargar los GIFs. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGifs('', activeCategory);
  }, [activeCategory, fetchGifs]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      setActiveCategory('custom');
      fetchGifs(search);
    }
  };

  const handleCategoryClick = (id) => {
    setSearch('');
    setActiveCategory(id);
  };

  return (
    <div className="gif-picker-container" onClick={(e) => e.stopPropagation()}>
      <div className="gif-picker-header">
        <form onSubmit={handleSearch}>
          <div className="gif-search-box">
            <i className="bx bx-search" />
            <input 
              type="text" 
              placeholder="Buscar GIFs..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </form>
        <button className="gif-close-btn" onClick={onClose}>&times;</button>
      </div>
      
      <div className="gif-categories">
        {CATEGORIES.map(cat => (
          <button 
            key={cat.id} 
            className={`gif-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => handleCategoryClick(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="gif-picker-content">
        {loading ? (
          <div className="gif-loading">
            <div className="gif-spinner"></div>
            <span>Cargando...</span>
          </div>
        ) : error ? (
          <div className="gif-no-results">{error}</div>
        ) : (
          <div className="gif-grid">
            {gifs.length > 0 ? gifs.map(gif => (
              <div key={gif.id} className="gif-item" onClick={() => onSelect(gif.images.fixed_height.url)}>
                <img 
                  src={gif.images.fixed_height_small.url} 
                  alt={gif.title}
                  loading="lazy"
                />
              </div>
            )) : (
              <div className="gif-no-results">No se encontraron GIFs</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
