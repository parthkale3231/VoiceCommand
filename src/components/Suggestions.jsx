import React from 'react';
import { Lightbulb, Plus } from 'lucide-react';
import { useShopping } from '../context/ShoppingContext';

const Suggestions = () => {
  const { suggestions, addItem } = useShopping();

  if (suggestions.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: '1rem', marginTop: '1rem' }}>
      <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
        <Lightbulb size={18} color="var(--accent-secondary)" />
        Smart Suggestions
      </h3>
      <div className="suggestions-container">
        {suggestions.map((sug, idx) => (
          <div 
            key={`${sug.item.name}-${idx}`} 
            className="suggestion-chip"
            onClick={() => addItem(sug.item.name, 1, sug.item.category)}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{sug.item.name}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{sug.reason}</span>
            </div>
            <Plus size={16} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Suggestions;
