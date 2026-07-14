import os
import json
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# We'll use google-genai as recommended by the deprecation warning, or fallback to generativeai
try:
    from google import genai
    from google.genai import types
    USE_NEW_SDK = True
except ImportError:
    import google.generativeai as genai_old
    USE_NEW_SDK = False

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class CommandRequest(BaseModel):
    transcript: str
    language: str = "en-US"

class ProcessedCommand(BaseModel):
    intent: str
    item: str | None = None
    quantity: int = 1
    category: str = "other"
    maxPrice: float | None = None
    message: str | None = None

SYSTEM_PROMPT = """
You are a Natural Language Processing engine for a Shopping Assistant app.
Analyze the user's voice transcript and extract the intent and parameters.
Ensure the extracted item is translated into English for standardisation.
Generate a friendly success/response message in the user's original language based on the user's Language Code.
The output MUST be a valid JSON object matching this schema exactly:
{
  "intent": "ADD" | "REMOVE" | "SEARCH" | "UPDATE" | "CLEAR" | "CHECK" | "UNKNOWN",
  "item": "string (the clean item name in English, without numbers, quantities, or units like '10' or 'bottle of')",
  "quantity": integer (extract the number if present, default 1),
  "category": "produce" | "dairy" | "bakery" | "meat" | "pantry" | "snacks" | "beverages" | "other",
  "maxPrice": float or null (if intent is SEARCH and they specified a price limit),
  "message": "string (localized response message for the user in the language specified by the Language Code)"
}
Return ONLY the raw JSON string. Do not wrap in markdown block quotes. Do not include any explanations.

Examples:
Language Code: en-US
Transcript: "Can you add a couple of organic apples to my list?"
Output: {"intent": "ADD", "item": "organic apples", "quantity": 2, "category": "produce", "maxPrice": null, "message": "Added 2 organic apples to your list."}

Language Code: es-ES
Transcript: "Elimina la leche, por favor."
Output: {"intent": "REMOVE", "item": "milk", "quantity": 1, "category": "dairy", "maxPrice": null, "message": "He eliminado la leche de tu lista."}
"""

def fallback_parser(transcript: str, language: str = "en-US") -> dict:
    """A basic rule-based parser that kicks in if the Gemini API key is invalid or missing."""
    text = transcript.lower().strip()
    intent = "UNKNOWN"
    item = ""
    quantity = 1
    maxPrice = None
    message = "I'm not sure how to handle that."
    
    # Simple multilingual keywords for basic offline support
    search_keywords = ['find', 'search', 'looking', 'buscar', 'encuentra', 'chercher', 'trouver', 'suchen']
    remove_keywords = ['remove', 'delete', 'take off', 'eliminar', 'quitar', 'borrar', 'supprimer', 'enlever', 'entfernen']
    update_keywords = ['update', 'change', 'actualizar', 'cambiar', 'modifier', 'changer', 'ändern']
    clear_keywords = ['clear', 'empty', 'vaciar', 'limpiar', 'vider', 'leeren']
    check_keywords = ['check', 'do i have', 'comprobar', 'tengo', 'vérifier', 'est-ce que j\'ai', 'prüfen']
    add_keywords = ['add', 'buy', 'i need', 'añadir', 'comprar', 'necesito', 'ajouter', 'acheter', 'j\'ai besoin', 'hinzufügen', 'kaufen']
    
    if any(p in text for p in clear_keywords):
        intent = "CLEAR"
        message = "List cleared." if "en" in language else "Lista vaciada." if "es" in language else "Liste vidée." if "fr" in language else "Liste geleert."
    elif any(p in text for p in check_keywords):
        intent = "CHECK"
        item = text
        for kw in check_keywords:
            item = item.replace(kw, '')
        item = item.strip()
        message = f"Checking for {item}..."
    elif any(p in text for p in update_keywords):
        intent = "UPDATE"
        item = text
        for kw in update_keywords:
            item = item.replace(kw, '')
        item = item.strip()
        # naive quantity extraction
        qty_match = re.search(r'\b(\d+)\b', text)
        if qty_match:
            quantity = int(qty_match.group(1))
        message = f"Updated {item} to {quantity}."
    elif any(p in text for p in search_keywords):
        intent = "SEARCH"
        item = text
        for kw in search_keywords:
            item = item.replace(kw, '')
        item = item.strip()
        price_match = re.search(r'(?:under|menos de|moins de|unter)\s*\$?\s*(\d+(?:\.\d{2})?)', text)
        if price_match:
            maxPrice = float(price_match.group(1))
            item = item.replace(price_match.group(0), '').strip()
        message = f"Searching for {item}..."
    elif any(p in text for p in remove_keywords):
        intent = "REMOVE"
        item = text
        for kw in remove_keywords:
            item = item.replace(kw, '')
        item = item.strip()
        message = f"Removed {item} from your list." if "en" in language else f"Se ha eliminado {item}." if "es" in language else f"{item} retiré."
    else:
        intent = "ADD"
        item = text
        for kw in add_keywords:
            item = item.replace(kw, '')
        item = item.strip()
        qty_match = re.search(r'\b(\d+)\b', item)
        if qty_match:
            quantity = int(qty_match.group(1))
            item = item.replace(qty_match.group(0), '').strip()
        message = f"Added {quantity} {item} to your list." if "en" in language else f"Añadido {quantity} {item}." if "es" in language else f"Ajouté {quantity} {item}."
        
    return {
        "intent": intent,
        "item": item,
        "quantity": quantity,
        "category": "other",
        "maxPrice": maxPrice,
        "message": message
    }

@app.post("/api/process-command", response_model=ProcessedCommand)
async def process_command(request: CommandRequest):
    data = None
    try:
        if GEMINI_API_KEY and GEMINI_API_KEY != "your_api_key_here":
            if USE_NEW_SDK:
                client = genai.Client(api_key=GEMINI_API_KEY)
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[SYSTEM_PROMPT, f"Language Code: {request.language}\nTranscript: \"{request.transcript}\""]
                )
            else:
                genai_old.configure(api_key=GEMINI_API_KEY)
                model = genai_old.GenerativeModel('gemini-2.5-flash')
                response = model.generate_content([
                    {"role": "user", "parts": [{"text": SYSTEM_PROMPT}]},
                    {"role": "user", "parts": [{"text": f"Language Code: {request.language}\nTranscript: \"{request.transcript}\""}]}
                ])
                
            raw_text = response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
                
            data = json.loads(raw_text.strip())
        else:
            raise Exception("No valid GEMINI_API_KEY provided")
            
    except Exception as e:
        print(f"AI Model Error (falling back to local parser): {e}")
        data = fallback_parser(request.transcript, request.language)
        
    # Build success message if missing
    if not data.get("message"):
        intent = data.get("intent", "UNKNOWN")
        item = data.get("item", "")
        qty = data.get("quantity", 1)
        
        msg = "I'm not sure how to handle that."
        if intent == "ADD":
            msg = f"Added {qty} {item} to your list."
        elif intent == "REMOVE":
            msg = f"Removed {item} from your list."
        elif intent == "SEARCH":
            msg = f"Searching for {item}..."
        elif intent == "UPDATE":
            msg = f"Updated {item} to {qty}."
        elif intent == "CLEAR":
            msg = "List cleared."
        elif intent == "CHECK":
            msg = f"Checking for {item}..."
            
        data["message"] = msg

    return data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
