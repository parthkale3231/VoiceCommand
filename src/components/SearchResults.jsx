import React from 'react';
import { Search, X, Plus } from 'lucide-react';
import { useShopping } from '../context/ShoppingContext';

const SearchResults = () => {
  const { searchResults, clearSearch, addItem, t } = useShopping();

  if (!searchResults) return null;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--accent-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="section-title" style={{ margin: 0 }}>
          <Search size={20} color="var(--accent-primary)" />
          {t('search')}: "{searchResults.query}"
          {searchResults.maxPrice && <span className="category-tag">{t('under')} ${searchResults.maxPrice}</span>}
        </h3>
        <button onClick={clearSearch} className="icon-btn" aria-label="Close search">
          <X size={20} />
        </button>
      </div>

      {searchResults.results.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>{t('noItemsFound')}</p>
      ) : (
        <ul className="item-list">
          {searchResults.results.map((item) => (
            <li key={`search-${item.id}`} className="list-item">
              <div className="item-details">
                <span className="item-name">{item.name}</span>
                <div className="item-meta">
                  <span className="category-tag">{t(`categories.${item.category}`)}</span>
                  <span>${item.price.toFixed(2)}</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  addItem(item.name, 1, item.category);
                  clearSearch();
                }} 
                className="icon-btn" 
                style={{ color: 'var(--success)' }}
              >
                <Plus size={20} /> {t('add')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchResults;
