import os
import json
import re
import motor.motor_asyncio
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

# MongoDB setup
mongo_client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
db = mongo_client.voicecart
items_collection = db.items
history_collection = db.history

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

class RecipeRequest(BaseModel):
    items: list[str]
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
    search_keywords = ['find', 'search', 'looking', 'buscar', 'encuentra', 'chercher', 'trouver', 'suchen', 'खोजें', 'ढूंढें']
    remove_keywords = ['remove', 'delete', 'take off', 'eliminar', 'quitar', 'borrar', 'supprimer', 'enlever', 'entfernen', 'हटाएं', 'निकालें', 'निकाल दे', 'निकाल', 'हटा', 'हटाओ', 'निकालो']
    update_keywords = ['update', 'change', 'actualizar', 'cambiar', 'modifier', 'changer', 'ändern', 'बदलें', 'अपडेट']
    clear_keywords = ['clear', 'empty', 'vaciar', 'limpiar', 'vider', 'leeren', 'साफ़', 'खाली']
    check_keywords = ['check', 'do i have', 'comprobar', 'tengo', 'vérifier', 'est-ce que j\'ai', 'prüfen', 'चेक', 'क्या मेरे पास']
    add_keywords = ['add', 'buy', 'i need', 'añadir', 'comprar', 'necesito', 'ajouter', 'acheter', 'j\'ai besoin', 'hinzufügen', 'kaufen', 'जोड़ें', 'खरीदें', 'चाहिए', 'डाल', 'डालो', 'लाओ']
    
    # Convert common text numbers to digits for parsing
    number_words = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
        'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5',
        'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 'diez': '10',
        'un': '1', 'deux': '2', 'trois': '3', 'quatre': '4', 'cinq': '5',
        'ein': '1', 'zwei': '2', 'drei': '3', 'vier': '4', 'fünf': '5',
        'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5',
        'dozen': '12', 'dozens': '12', 'docena': '12', 'douzaine': '12', 'दर्जन': '12'
    }
    
    # Pre-process multi-word numbers
    text = text.replace('a dozen', '12')

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
        message = f"Removed {item} from your list." if "en" in language else f"Se ha eliminado {item}." if "es" in language else f"{item} retiré." if "fr" in language else f"{item} हटा दिया गया।" if "hi" in language else f"Removed {item}."
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
        message = f"Added {quantity} {item} to your list." if "en" in language else f"Añadido {quantity} {item}." if "es" in language else f"Ajouté {quantity} {item}." if "fr" in language else f"{quantity} {item} जोड़े गए।" if "hi" in language else f"Added {quantity} {item}."
        
    # Translate item to English if needed for internal standardization
    hi_to_en = {
        'केला': 'banana', 'केले': 'banana',
        'सेब': 'apples', 'सेबो': 'apples',
        'दूध': 'milk',
        'अंडा': 'eggs', 'अंडे': 'eggs',
        'रोटी': 'bread',
        'चिकन': 'chicken breast',
        'चावल': 'rice',
        'पास्ता': 'pasta',
        'पानी': 'water',
        'स्ट्रॉबेरी': 'strawberries'
    }
    
    # Clean up filler words
    for filler in ['अभी', 'को', 'से', 'मेरे', 'लिए', 'a']:
        # Be careful not to replace 'a' inside words. Only whole words.
        item = re.sub(r'\b' + filler + r'\b', '', item, flags=re.IGNORECASE).strip()
        
    if item in hi_to_en:
        item = hi_to_en[item]
        
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

class ItemModel(BaseModel):
    id: str
    name: str
    quantity: int
    category: str

@app.get("/api/items")
async def get_items():
    items = []
    async for item in items_collection.find({}, {"_id": 0}):
        items.append(item)
    return items

@app.post("/api/items")
async def add_item(item: ItemModel):
    existing = await items_collection.find_one({"id": item.id})
    if existing:
        await items_collection.update_one({"id": item.id}, {"$set": item.model_dump()})
    else:
        await items_collection.insert_one(item.model_dump())
    return {"status": "success"}

@app.put("/api/items/{item_id}")
async def update_item(item_id: str, item: ItemModel):
    await items_collection.update_one({"id": item_id}, {"$set": item.model_dump()})
    return {"status": "success"}

@app.delete("/api/items/{item_id}")
async def delete_item(item_id: str):
    await items_collection.delete_one({"id": item_id})
    return {"status": "success"}

@app.delete("/api/items")
async def clear_items():
    items_to_history = []
    async for item in items_collection.find({}, {"_id": 0}):
        existing_hist = await history_collection.find_one({"name": item["name"]})
        if not existing_hist:
            items_to_history.append({"name": item["name"], "category": item.get("category", "other")})
            
    if items_to_history:
        await history_collection.insert_many(items_to_history)

    await items_collection.delete_many({})
    return {"status": "success"}

@app.get("/api/history")
async def get_history():
    history = []
    async for item in history_collection.find({}, {"_id": 0}):
        history.append(item)
    return history

@app.post("/api/recipe")
async def generate_recipe(request: RecipeRequest):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_api_key_here":
        return {
            "recipe_name": "API Key Required",
            "recipe_description": "Please provide a valid Gemini API key in the backend/.env file to generate recipes.",
            "missing_ingredients": []
        }
        
    try:
        items_list = ", ".join(request.items)
        prompt = f"""
        You are a creative chef. The user has the following ingredients in their shopping list: {items_list}.
        Suggest a simple, delicious recipe they can make that uses at least some of these ingredients.
        Also, identify any missing ingredients they need to buy to complete the recipe.
        The user's preferred language is {request.language}.
        
        Return ONLY a JSON object matching this schema exactly, with NO markdown formatting:
        {{
            "recipe_name": "String (Name of the recipe in the user's language)",
            "recipe_description": "String (Short instructions or description in the user's language)",
            "missing_ingredients": ["ingredient1", "ingredient2"] (List of missing ingredients in English for standardization, singular form)
        }}
        """
        
        if USE_NEW_SDK:
            client = genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[prompt]
            )
        else:
            genai_old.configure(api_key=GEMINI_API_KEY)
            model = genai_old.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            
        text = response.text.strip()
        
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text)
    except Exception as e:
        print(f"Recipe Generation Error: {e}")
        return {
            "recipe_name": "Error Generating Recipe",
            "recipe_description": str(e),
            "missing_ingredients": []
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
