export const CATEGORIES = {
  PRODUCE: 'produce',
  DAIRY: 'dairy',
  BAKERY: 'bakery',
  MEAT: 'meat',
  PANTRY: 'pantry',
  SNACKS: 'snacks',
  BEVERAGES: 'beverages',
  OTHER: 'other'
};

export const MOCK_CATALOG = [
  { id: '1', name: 'milk', category: CATEGORIES.DAIRY, price: 3.50, substitutes: ['almond milk', 'soy milk', 'oat milk'] },
  { id: '2', name: 'almond milk', category: CATEGORIES.DAIRY, price: 4.50, substitutes: ['milk', 'soy milk', 'oat milk'] },
  { id: '3', name: 'eggs', category: CATEGORIES.DAIRY, price: 4.00, substitutes: [] },
  { id: '4', name: 'apples', category: CATEGORIES.PRODUCE, price: 1.20, season: 'fall', substitutes: ['pears', 'oranges'] },
  { id: '5', name: 'bananas', category: CATEGORIES.PRODUCE, price: 0.80, substitutes: [] },
  { id: '6', name: 'bread', category: CATEGORIES.BAKERY, price: 2.50, substitutes: ['whole wheat bread', 'bagels'] },
  { id: '7', name: 'whole wheat bread', category: CATEGORIES.BAKERY, price: 3.00, substitutes: ['bread'] },
  { id: '8', name: 'chicken breast', category: CATEGORIES.MEAT, price: 8.00, substitutes: ['turkey breast', 'tofu'] },
  { id: '9', name: 'rice', category: CATEGORIES.PANTRY, price: 5.00, substitutes: ['quinoa', 'pasta'] },
  { id: '10', name: 'pasta', category: CATEGORIES.PANTRY, price: 2.00, substitutes: ['rice', 'noodles'] },
  { id: '11', name: 'potato chips', category: CATEGORIES.SNACKS, price: 3.00, substitutes: ['popcorn', 'pretzels'] },
  { id: '12', name: 'water', category: CATEGORIES.BEVERAGES, price: 1.00, substitutes: ['sparkling water'] },
  { id: '13', name: 'orange juice', category: CATEGORIES.BEVERAGES, price: 4.00, substitutes: ['apple juice'] },
  { id: '14', name: 'strawberries', category: CATEGORIES.PRODUCE, price: 4.50, season: 'summer', substitutes: ['blueberries', 'raspberries'] },
  { id: '15', name: 'toothpaste', category: CATEGORIES.OTHER, price: 4.00, substitutes: ['mouthwash'] }
];

export const MOCK_HISTORY = [
  'milk', 'eggs', 'bread', 'bananas'
];

export const getSuggestions = (currentList) => {
  const suggestions = [];
  
  // 1. Based on history (items user frequently buys but not in current list)
  const currentItemNames = currentList.map(i => i.name.toLowerCase());
  const missingFromHistory = MOCK_HISTORY.filter(h => !currentItemNames.includes(h));
  if (missingFromHistory.length > 0) {
    suggestions.push({
      type: 'history',
      reason: 'Frequently bought',
      item: MOCK_CATALOG.find(i => i.name === missingFromHistory[0])
    });
  }

  // 2. Seasonal recommendations
  const seasonalItems = MOCK_CATALOG.filter(i => i.season === 'summer' && !currentItemNames.includes(i.name));
  if (seasonalItems.length > 0) {
    suggestions.push({
      type: 'seasonal',
      reason: 'In season right now',
      item: seasonalItems[0]
    });
  }

  // 3. Substitutes for items already in list
  for (const listItem of currentList) {
    const catalogItem = MOCK_CATALOG.find(i => i.name.toLowerCase() === listItem.name.toLowerCase());
    if (catalogItem && catalogItem.substitutes && catalogItem.substitutes.length > 0) {
      const subName = catalogItem.substitutes[0];
      if (!currentItemNames.includes(subName.toLowerCase())) {
        suggestions.push({
          type: 'substitute',
          reason: `Instead of ${listItem.name}?`,
          item: MOCK_CATALOG.find(i => i.name === subName) || { name: subName, category: CATEGORIES.OTHER }
        });
        break; // Just one substitute suggestion is enough to not overwhelm
      }
    }
  }

  return suggestions;
};

export const searchItems = (query, maxPrice = null) => {
  return MOCK_CATALOG.filter(item => {
    const matchesName = item.name.toLowerCase().includes(query.toLowerCase());
    const matchesPrice = maxPrice ? item.price <= maxPrice : true;
    return matchesName && matchesPrice;
  });
};

export const categorizeItem = (itemName) => {
  const item = MOCK_CATALOG.find(i => i.name.toLowerCase() === itemName.toLowerCase());
  return item ? item.category : CATEGORIES.OTHER;
};
