import React, { useState, useEffect } from 'react';

const GIPHY_API_KEY = 'dc6zaTOxFJmzC'; // Public beta key

export default function GifPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGifs();
  }, []);

  const fetchGifs = async (query = '') => {
    setLoading(true);
    try {
      const url = query 
        ? `https://api.giphy.com/1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20`
        : `https://api.giphy.com/1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`;
      
      const resp = await fetch(url);
      const data = await resp.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Error fetching GIFs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchGifs(search);
  };

  return (
    <div className="gif-picker-container" onClick={(e) => e.stopPropagation()}>
      <div className="gif-picker-header">
        <form onSubmit={handleSearch}>
          <input 
            type="text" 
            placeholder="Buscar GIFs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit"><i className="bx bx-search" /></button>
        </form>
        <button className="gif-close-btn" onClick={onClose}>&times;</button>
      </div>
      <div className="gif-picker-content">
        {loading ? (
          <div className="gif-loading">Cargando...</div>
        ) : (
          <div className="gif-grid">
            {gifs.map(gif => (
              <img 
                key={gif.id} 
                src={gif.images.fixed_height_small.url} 
                alt={gif.title}
                onClick={() => onSelect(gif.images.fixed_height.url)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
