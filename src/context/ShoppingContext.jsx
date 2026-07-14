import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { getSuggestions, searchItems, categorizeItem } from '../services/mockDatabase';
import { translate } from '../utils/i18n';
import stringSimilarity from 'string-similarity';
import { fetchItems, fetchHistory, addItemToDB, updateItemInDB, deleteItemFromDB, clearItemsInDB } from '../services/apiService';

const ShoppingContext = createContext();

export const useShopping = () => useContext(ShoppingContext);

export const ShoppingProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  const [history, setHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [language, setLanguage] = useState('en-US');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Fetch items from DB on mount
  useEffect(() => {
    fetchItems()
      .then(data => setItems(data))
      .catch(err => console.error("Error fetching items:", err));
      
    fetchHistory()
      .then(data => setHistory(data))
      .catch(err => console.error("Error fetching history:", err));
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Update suggestions whenever items change
  useEffect(() => {
    setSuggestions(getSuggestions(items, history));
  }, [items, history]);

  const showStatus = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 4000);
  };

  const findItemMatch = (itemName, itemsArray) => {
    const exact = itemsArray.find(i => i.name === itemName);
    if (exact) return exact;
    
    if (itemsArray.length > 0) {
      const names = itemsArray.map(i => i.name);
      const matches = stringSimilarity.findBestMatch(itemName, names);
      if (matches.bestMatch && matches.bestMatch.rating > 0.8) {
        return itemsArray.find(i => i.name === matches.bestMatch.target);
      }
    }
    return null;
  };

  const addItem = async (name, quantity = 1, category = null) => {
    const itemName = name.toLowerCase();
    const itemCategory = category || categorizeItem(itemName);
    
    const existingItem = findItemMatch(itemName, itemsRef.current);
    
    try {
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        const updatedItem = { ...existingItem, quantity: newQty };
        await updateItemInDB(existingItem.id, updatedItem);
        setItems(prev => prev.map(i => i.id === existingItem.id ? updatedItem : i));
      } else {
        const newItem = { id: `item-${Date.now()}`, name: itemName, quantity, category: itemCategory };
        await addItemToDB(newItem);
        setItems(prev => [...prev, newItem]);
      }
      showStatus(translate(language, 'addedToList', quantity, itemName));
    } catch (err) {
      showStatus("Error saving to database", "error");
    }
  };

  const removeItem = async (name, quantityToRemove = null) => {
    const itemName = name.toLowerCase();
    const existingItem = findItemMatch(itemName, itemsRef.current);
    
    if (!existingItem) {
      showStatus(translate(language, 'couldNotFind', itemName), 'error');
      return;
    }
    
    try {
      if (quantityToRemove && existingItem.quantity > quantityToRemove) {
        const updatedItem = { ...existingItem, quantity: existingItem.quantity - quantityToRemove };
        await updateItemInDB(existingItem.id, updatedItem);
        setItems(prev => prev.map(i => i.id === existingItem.id ? updatedItem : i));
        showStatus(translate(language, 'removedFromList', `${quantityToRemove} ${existingItem.name}`));
      } else {
        await deleteItemFromDB(existingItem.id);
        setItems(prev => prev.filter(i => i.id !== existingItem.id));
        showStatus(translate(language, 'removedFromList', existingItem.name));
      }
    } catch (err) {
      showStatus("Error updating database", "error");
    }
  };

  const updateQuantity = async (id, change) => {
    const existingItem = itemsRef.current.find(i => i.id === id);
    if (!existingItem) return;
    
    const newQ = Math.max(1, existingItem.quantity + change);
    if (newQ === existingItem.quantity) return;
    
    const updatedItem = { ...existingItem, quantity: newQ };
    try {
      await updateItemInDB(id, updatedItem);
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (err) {
      showStatus("Error updating database", "error");
    }
  };

  const updateItemByName = async (name, newQuantity) => {
    const itemName = name.toLowerCase();
    const existingItem = findItemMatch(itemName, itemsRef.current);
    
    if (!existingItem) {
      showStatus(translate(language, 'couldNotFindUpdate', itemName), 'error');
      return;
    }
    
    const updatedItem = { ...existingItem, quantity: newQuantity };
    try {
      await updateItemInDB(existingItem.id, updatedItem);
      setItems(prev => prev.map(item => item.id === existingItem.id ? updatedItem : item));
    } catch (err) {
      showStatus("Error updating database", "error");
    }
  };

  const clearList = async () => {
    try {
      await clearItemsInDB();
      setItems([]);
      // Refresh history since cleared items were moved to history
      const newHistory = await fetchHistory();
      setHistory(newHistory);
      showStatus(translate(language, 'listCleared'));
    } catch (err) {
      showStatus("Error clearing database", "error");
    }
  };

  const performSearch = (query, maxPrice) => {
    const results = searchItems(query, maxPrice);
    setSearchResults({ query, maxPrice, results });
    if (results.length > 0) {
      showStatus(translate(language, 'foundItems', results.length, query));
    } else {
      showStatus(translate(language, 'noItemsForSearch', null, query), 'error');
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
  };

  const t = (key, ...args) => translate(language, key, ...args);

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
    updateItemByName,
    clearList,
    performSearch,
    clearSearch,
    showStatus,
    t
  };

  return (
    <ShoppingContext.Provider value={value}>
      {children}
    </ShoppingContext.Provider>
  );
};
