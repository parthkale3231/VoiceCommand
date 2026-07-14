const API_BASE = 'http://127.0.0.1:8000/api';

export const fetchItems = async () => {
  const res = await fetch(`${API_BASE}/items`);
  if (!res.ok) throw new Error('Failed to fetch items');
  return res.json();
};

export const fetchHistory = async () => {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
};

export const addItemToDB = async (item) => {
  const res = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error('Failed to add item');
  return res.json();
};

export const updateItemInDB = async (id, item) => {
  const res = await fetch(`${API_BASE}/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error('Failed to update item');
  return res.json();
};

export const deleteItemFromDB = async (id) => {
  const res = await fetch(`${API_BASE}/items/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete item');
  return res.json();
};

export const clearItemsInDB = async () => {
  const res = await fetch(`${API_BASE}/items`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to clear items');
  return res.json();
};

export const generateRecipe = async (items, language = 'en-US') => {
  const res = await fetch(`${API_BASE}/recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, language })
  });
  if (!res.ok) throw new Error('Failed to generate recipe');
  return res.json();
};

