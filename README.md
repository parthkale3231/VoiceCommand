# Voice Command Shopping Assistant

VoiceCart is a modern, voice-first web application that allows users to manage their shopping lists using natural language. Built with Vite, React, and Vanilla CSS, it features a sleek dark-mode glassmorphic UI.

## Features
- **Voice Input**: Uses the Web Speech API for real-time transcription. Supports English, Spanish, and French.
- **Natural Language Processing**: Includes a robust local NLP service that extracts intents (ADD, REMOVE, SEARCH) and parameters (quantities, items, price limits) from varied voice commands.
- **Smart Suggestions**: Suggests items based on simulated history, seasonality, and substitutes.
- **Search**: Voice-activated catalog search with price filtering (e.g., "Find organic apples under 5 dollars").
- **Minimalist UI**: Dynamic visual feedback, micro-animations, and responsive design.

## Setup & Running Locally
1. Clone the repository.
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Ensure you run this on a browser that supports the Web Speech API (like Chrome, Edge, or Safari) and grant microphone permissions.

## Deployment
This app can be easily deployed to Vercel, Firebase Hosting, or AWS Amplify. Since it is a purely client-side Vite application, you simply need to build it using `npm run build` and serve the `dist` folder.

---

### Candidate Write-Up (Approach)

To deliver a reliable, highly responsive experience within the assessment constraints, I built the application entirely on the client side using **React (Vite)**. 

Instead of relying on a paid third-party LLM for NLP which introduces latency and API key dependencies, I engineered a **robust, rule-based local NLP engine**. This service parses transcripts from the native **Web Speech API** in real-time, mapping complex user phrases to specific intents (`ADD`, `REMOVE`, `SEARCH`) and extracting parameters like quantities, items, and price limits. This guarantees the app is instantly testable without any external configuration.

For the **Smart Suggestions** and **Search**, I implemented a mock database containing categorization, seasonality data, and substitute mapping. This allows the app to dynamically suggest alternatives or seasonal picks (e.g., suggesting 'almond milk' for 'milk', or 'strawberries' in summer).

The UI prioritizes a **premium, mobile-first aesthetic**. I utilized Vanilla CSS to create a dark-mode glassmorphic design featuring intuitive micro-animations and visual pulsing during voice capture, ensuring the interface feels alive and highly interactive. The global state is managed seamlessly via React Context, resulting in a clean, production-ready codebase.
