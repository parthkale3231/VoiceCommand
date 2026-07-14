import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSuggestions, searchItems, categorizeItem } from '../services/mockDatabase';

const ShoppingContext = createContext();

export const useShopping = () => useContext(ShoppingContext);

export const ShoppingProvider = ({ children }) => {
  const [items, setItems] = useState([
    { id: 'item-1', name: 'milk', quantity: 1, category: 'dairy' }
  ]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [language, setLanguage] = useState('en-US');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Update suggestions whenever items change
  useEffect(() => {
    setSuggestions(getSuggestions(items));
  }, [items]);

  const showStatus = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 4000);
  };

  const addItem = (name, quantity = 1, category = null) => {
    const itemName = name.toLowerCase();
    const itemCategory = category || categorizeItem(itemName);
    
    setItems(prev => {
      const existingItem = prev.find(i => i.name === itemName);
      if (existingItem) {
        return prev.map(i => i.name === itemName ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { id: `item-${Date.now()}`, name: itemName, quantity, category: itemCategory }];
    });
    showStatus(`Added ${quantity} ${itemName} to your list.`);
  };

  const removeItem = (name) => {
    const itemName = name.toLowerCase();
    setItems(prev => {
      const exists = prev.some(i => i.name === itemName);
      if (!exists) {
        showStatus(`Couldn't find ${itemName} on your list.`, 'error');
        return prev;
      }
      showStatus(`Removed ${itemName} from your list.`);
      return prev.filter(i => i.name !== itemName);
    });
  };

  const updateQuantity = (id, change) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const clearList = () => {
    setItems([]);
    showStatus('List cleared.');
  };

  const performSearch = (query, maxPrice) => {
    const results = searchItems(query, maxPrice);
    setSearchResults({ query, maxPrice, results });
    if (results.length > 0) {
      showStatus(`Found ${results.length} items for "${query}".`);
    } else {
      showStatus(`No items found for "${query}".`, 'error');
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
  };

  const value = {
    items,
    suggestions,
    searchResults,
    language,
    setLanguage,
    statusMessage,
    addItem,
    removeItem,
    updateQuantity,
    clearList,
    performSearch,
    clearSearch,
    showStatus
  };

  return (
    <ShoppingContext.Provider value={value}>
      {children}
    </ShoppingContext.Provider>
  );
};
