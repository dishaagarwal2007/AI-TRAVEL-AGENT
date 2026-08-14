const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk'); 

const app = express();
app.use(cors());
app.use(express.json());

// Initialize both AI engines using your .env keys
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); 

// --- THE ULTIMATE JSON EXTRACTION TOOL ---
function extractJSON(rawText) {
    let text = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    // PRIORITY 1: Look for the itinerary array first
    const startArray = text.indexOf('[');
    const endArray = text.lastIndexOf(']');
    
    if (startArray !== -1 && endArray !== -1) {
        try {
            const arrString = text.substring(startArray, endArray + 1);
            return JSON.parse(arrString); 
        } catch(e) {}
    }
    
    // PRIORITY 2: Look for the error object (INVALID_DESTINATION)
    const startObject = text.indexOf('{');
    const endObject = text.lastIndexOf('}');
    
    if (startObject !== -1 && endObject !== -1) {
         try {
            const objString = text.substring(startObject, endObject + 1);
            return JSON.parse(objString); 
        } catch(e) {}
    }
    
    // THE SNITCH
    console.log("\n🛑 CRITICAL PARSE ERROR 🛑");
    console.log("--------------------------------------------------");
    console.log(rawText);
    console.log("--------------------------------------------------\n");
    throw new Error("AI output could not be parsed as JSON.");
}

app.post('/api/plan-trip', async (req, res) => {
    const { destination, days, style } = req.body;

    const systemPrompt = `
    You are an expert AI Travel Architect. 

    CRITICAL STEP 1: REALITY CHECK
    Verify if "${destination}" is a real, specific, and travelable location on Earth. 
    If it is a fictional place (e.g., Hogwarts, Narnia), a vague concept, or random gibberish, you MUST return exactly this JSON and nothing else:
    {"error": "INVALID_DESTINATION"}

    CRITICAL STEP 2: ITINERARY GENERATION
    If it is a real place, the user wants to travel there for ${days} days.
    Their travel style is: ${style}. 
    
    If Backpacker: focus on hostels, street food, walking, and budget activities.
    If Comfort: focus on 3-4 star hotels, highly-rated local restaurants, and guided tours.
    If Luxury: focus on 5-star resorts, Michelin/fine dining, and private transfers.

    Respond ONLY with a valid JSON array where each object represents a day. Do not use markdown blocks like \`\`\`json.
    Example format:
    [
      {
        "title": "Day 1 Title",
        "desc": "Description of the day's activities...",
        "hotel": "Name of a real hotel matching the style",
        "dining": "Name of a real restaurant for dinner",
        "tags": ["🏷️ Tag1", "🏷️ Tag2"],
        "image_keyword": "a single simple keyword like 'cafe', 'temple', 'nightlife', or 'nature'"
      }
    ]
    `;

    try {
        console.log(`Architecting ${days} days in ${destination} (${style} style)...`);
        
        let itineraryData = null;

        // --- THE DUAL-ENGINE FALLBACK ARCHITECTURE ---
        try {
            console.log("🧠 Knocking on Google Gemini's door...");
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            const result = await model.generateContent(systemPrompt);
            const response = await result.response;
            
            itineraryData = extractJSON(response.text());
            console.log("✅ Google delivered the masterpiece!");

        } catch (googleError) {
            console.log(`⚠️ Google failed/jammed. Instantly swapping to Groq for maximum speed...`);
            
            try {
                const chatCompletion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: systemPrompt }],
                    model: "llama-3.1-8b-instant", 
                    temperature: 0.1 
                });
                
                itineraryData = extractJSON(chatCompletion.choices[0].message.content);
                console.log("⚡ Groq saved the day!");

            } catch (groqError) {
                console.error("❌ Both AI engines failed!", groqError.message || groqError);
                return res.json({ error: "Our AI travel agents are overwhelmed right now. Please try again in 60 seconds!" });
            }
        }
        // ----------------------------------------------

        if (!Array.isArray(itineraryData) && itineraryData.error === "INVALID_DESTINATION") {
            return res.json({ error: "Reality Check: That doesn't look like a real, travelable destination. Please enter a valid city or country!" });
        }

        // --- WATERFALL IMAGE LOOP WITH ANTI-DUPLICATION MEMORY ---
        const usedImages = new Set(); // The memory bank for used images

        for (let i = 0; i < itineraryData.length; i++) {
            let day = itineraryData[i];
            let finalImgUrl = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800'; 
            
            try {
                // ATTEMPT 1: Unsplash (Asking for 10 photos to give us variety)
                const unsplashQuery = encodeURIComponent(`${destination} ${day.image_keyword || 'landmark'}`);
                const unsplashRes = await fetch(`https://api.unsplash.com/search/photos?query=${unsplashQuery}&client_id=${process.env.UNSPLASH_API_KEY}&per_page=10&orientation=landscape`);
                const picData = await unsplashRes.json();
                
                // Filter out any images we've already shown the user
                let freshPhotos = [];
                if (picData.results) {
                    freshPhotos = picData.results.filter(pic => !usedImages.has(pic.urls.regular));
                }
                
                if (freshPhotos.length > 0) {
                    // We found a new image!
                    const randomIndex = Math.floor(Math.random() * freshPhotos.length);
                    finalImgUrl = freshPhotos[randomIndex].urls.regular;
                    usedImages.add(finalImgUrl); // Add to memory bank
                } else {
                    // ATTEMPT 2: Wikipedia Fallback (Because Unsplash was empty or all repeats)
                    console.log(`Unsplash repeated/empty on "${destination}". Hitting Wiki with Caller ID...`);
                    
                    // We add the keyword so Wiki searches for specific places (e.g., "Meerut temple")
                    const wikiQuery = encodeURIComponent(`${destination} ${day.image_keyword || 'landmark'}`);
                    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${wikiQuery}&gsrlimit=5&prop=pageimages&piprop=original&format=json&origin=*`;
                    
                    // The crucial User-Agent header to stop Wiki from blocking us!
                    const wikiRes = await fetch(wikiUrl, {
                        headers: { 'User-Agent': 'AITravelApp/1.0 (learning-project@example.com)' }
                    });
                    const wikiData = await wikiRes.json();
                    
                    if (wikiData.query && wikiData.query.pages) {
                        const pages = Object.values(wikiData.query.pages);
                        
                        // Loop through the 5 Wiki articles to find a fresh image
                        for (const page of pages) {
                            if (page.original && page.original.source) {
                                const wikiImg = page.original.source;
                                if (!usedImages.has(wikiImg)) {
                                    finalImgUrl = wikiImg;
                                    usedImages.add(finalImgUrl);
                                    break; // Found a good one, stop looking!
                                }
                            }
                        }
                    }
                }
                day.imgUrl = finalImgUrl;
            } catch (e) {
                console.error("Image Fetch Error:", e.message);
                day.imgUrl = finalImgUrl; 
            }
        }

        res.json({ itinerary: itineraryData });

    } catch (error) {
        console.error("Server Error:", error.message || error);
        res.status(500).json({ error: "Failed to generate itinerary. Check terminal." });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🧠 AI Brain is awake and listening on http://localhost:${PORT}`);
});