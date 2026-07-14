import React from 'react';
import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { useShopping } from '../context/ShoppingContext';

const ShoppingList = () => {
  const { items, updateQuantity, removeItem, t } = useShopping();

  if (items.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <ShoppingCart size={48} style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
        <p>{t('emptyList')}</p>
      </div>
    );
  }

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="shopping-list">
      {Object.entries(groupedItems).map(([category, catItems]) => (
        <div key={category} style={{ marginBottom: '1.5rem' }}>
          <h3 className="section-title">
            <span className="category-tag">{t(`categories.${category}`)}</span>
          </h3>
          <ul className="item-list">
            {catItems.map((item) => (
              <li key={item.id} className="list-item">
                <div className="item-details">
                  <span className="item-name">
                    {(() => {
                      const translated = t(`items.${item.name.toLowerCase()}`);
                      return translated.startsWith('items.') ? item.name.charAt(0).toUpperCase() + item.name.slice(1) : translated;
                    })()}
                  </span>
                  <div className="item-meta">
                    <span>{t('qty')}: {item.quantity}</span>
                  </div>
                </div>
                <div className="action-buttons">
                  <button onClick={() => updateQuantity(item.id, -1)} className="icon-btn" aria-label="Decrease">
                    <Minus size={18} />
                  </button>
                  <button onClick={() => updateQuantity(item.id, 1)} className="icon-btn" aria-label="Increase">
                    <Plus size={18} />
                  </button>
                  <button onClick={() => removeItem(item.name)} className="icon-btn danger" aria-label="Remove">
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default ShoppingList;
