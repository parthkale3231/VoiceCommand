import React from 'react';
import { ShoppingBag } from 'lucide-react';
import VoiceController from './components/VoiceController';
import ShoppingList from './components/ShoppingList';
import Suggestions from './components/Suggestions';
import SearchResults from './components/SearchResults';
import { useShopping } from './context/ShoppingContext';

const StatusBanner = () => {
  const { statusMessage } = useShopping();
  
  if (!statusMessage.text) return null;
  
  return (
    <div className={`status-banner ${statusMessage.type}`}>
      {statusMessage.text}
    </div>
  );
};

function App() {
  return (
    <div className="app-container">
      <header className="header">
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <ShoppingBag size={28} color="var(--accent-primary)" />
          VoiceCart
        </h1>
        <p>Your smart, voice-activated shopping assistant</p>
      </header>

      <StatusBanner />
      
      <VoiceController />
      
      <SearchResults />
      
      <Suggestions />

      <div style={{ marginTop: '1rem' }}>
        <h2 className="section-title">My List</h2>
        <ShoppingList />
      </div>
    </div>
  );
}

export default App;
