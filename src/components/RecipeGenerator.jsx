import React, { useState } from 'react';
import { ChefHat, Loader2, Plus } from 'lucide-react';
import { useShopping } from '../context/ShoppingContext';
import { generateRecipe } from '../services/apiService';

const RecipeGenerator = () => {
  const { items, language, addItem, t } = useShopping();
  const [recipe, setRecipe] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (items.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    setRecipe(null);
    
    try {
      const itemNames = items.map(i => i.name);
      const data = await generateRecipe(itemNames, language);
      setRecipe(data);
    } catch (err) {
      setError(t('recipeError') || "Failed to generate recipe.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMissing = () => {
    if (!recipe || !recipe.missing_ingredients) return;
    
    recipe.missing_ingredients.forEach(ingredient => {
      addItem(ingredient, 1);
    });
    
    // Clear missing ingredients from UI after adding
    setRecipe(prev => ({ ...prev, missing_ingredients: [] }));
  };

  if (items.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ChefHat size={20} color="var(--accent-secondary)" />
          {t('chefMode') || 'Chef Mode'}
        </h3>
        <button 
          className="btn-primary" 
          onClick={handleGenerate} 
          disabled={isLoading}
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : (t('generateRecipe') || 'Generate Recipe')}
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {recipe && !error && (
        <div className="recipe-card" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.1rem' }}>
            {recipe.recipe_name}
          </h4>
          <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {recipe.recipe_description}
          </p>
          
          {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
                {t('missingIngredients') || 'Missing Ingredients:'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {recipe.missing_ingredients.map((ing, idx) => (
                  <span key={idx} style={{ padding: '0.25rem 0.5rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                    {(() => {
                      const translated = t(`items.${ing.toLowerCase()}`);
                      return translated.startsWith('items.') ? ing : translated;
                    })()}
                  </span>
                ))}
              </div>
              <button 
                className="btn-primary" 
                onClick={handleAddMissing}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'var(--accent-secondary)' }}
              >
                <Plus size={16} />
                {t('addAllMissing') || 'Add All Missing to List'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecipeGenerator;
