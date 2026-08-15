const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk'); 

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); 

function extractJSON(rawText) {
    let text = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    const startArray = text.indexOf('[');
    const endArray = text.lastIndexOf(']');
    if (startArray !== -1 && endArray !== -1) {
        try {
            const arrString = text.substring(startArray, endArray + 1);
            return JSON.parse(arrString); 
        } catch(e) {}
    }
    
    const startObject = text.indexOf('{');
    const endObject = text.lastIndexOf('}');
    if (startObject !== -1 && endObject !== -1) {
         try {
            const objString = text.substring(startObject, endObject + 1);
            return JSON.parse(objString); 
        } catch(e) {}
    }
    
    console.log("\n🛑 CRITICAL PARSE ERROR 🛑\n", rawText, "\n--------------------------------------------------\n");
    throw new Error("AI output could not be parsed as JSON.");
}

app.post('/api/plan-trip', async (req, res) => {
    const { destinations, style } = req.body;

    if (!destinations || !Array.isArray(destinations)) {
        return res.json({ error: "System Mismatch! Your browser is using an old version of the code. Please press Ctrl + F5 to hard refresh the page!" });
    }

    const totalDays = destinations.reduce((sum, dest) => sum + dest.days, 0);
    const destinationString = destinations.map(d => `${d.days} days in ${d.location}`).join(", ");
    const justLocations = destinations.map(d => d.location).join(", ");

    const systemPrompt = `
    You are an expert AI Travel Architect handling a multi-destination itinerary. 

    CRITICAL STEP 1: REALITY & LOGISTICS CHECK
    1. Verify if ALL the following locations are real and travelable: ${justLocations}. 
       If ANY are fictional or gibberish, return exactly:
       {"error": "INVALID_DESTINATION"}
       
    2. Evaluate logistics for this trip: ${destinationString}. 
       Is it physically possible to travel between these locations and explore them in the allotted time? 
       If they are trying to visit distant countries/continents with zero time for transit, return exactly this JSON:
       {"error": "IMPOSSIBLE_TRIP", "message": "Give a short, witty, and slightly sarcastic explanation of why this multi-city hop is physically impossible without a teleporter."}

    CRITICAL STEP 2: ITINERARY GENERATION
    If logistics pass, generate a seamless ${totalDays}-day itinerary blending these locations naturally. Account for travel/transit time between cities.
    Travel style: ${style}. 

    Respond ONLY with a valid JSON array where each object represents a single day. 
    CRITICAL REQUIREMENT: You MUST include a "location" field in each day's object to tell us EXACTLY which city the user is in on that specific day!

    Example format:
    [
      {
        "day": 1,
        "location": "Exact City Name (e.g., Paris)",
        "title": "Day 1 Title",
        "desc": "Description of activities, including any travel between cities if necessary...",
        "hotel": "Name of a real hotel matching the style",
        "dining": "Name of a real restaurant for dinner",
        "tags": ["🏷️ Tag1", "🏷️ Tag2"],
        "image_keyword": "single keyword like 'cafe' or 'landmark'",
        "daily_tip": "A 1-2 sentence fun fact, local secret, or witty/funny warning about this specific city (e.g., 'Beware of the aggressive seagulls near the pier!')"
      }
    ]
    `;

    try {
        console.log(`Architecting multi-city trip: ${destinationString} (${style} style)...`);
        
        let itineraryData = null;

        try {
            console.log("🧠 Knocking on Google Gemini's door...");
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            const result = await model.generateContent(systemPrompt);
            const response = await result.response;
            
            itineraryData = extractJSON(response.text());
            console.log("✅ Google delivered the multi-city masterpiece!");

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

        if (!Array.isArray(itineraryData)) {
            if (itineraryData.error === "INVALID_DESTINATION") {
                return res.json({ error: "Reality Check: One of those destinations doesn't look real. Please enter valid cities or countries!" });
            }
            if (itineraryData.error === "IMPOSSIBLE_TRIP") {
                return res.json({ error: itineraryData.message || "Reality Check: You don't have a time machine! You need way more days to cover that distance." });
            }
        }

        const usedImages = new Set(); 

        for (let i = 0; i < itineraryData.length; i++) {
            let day = itineraryData[i];
            let finalImgUrl = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800'; 
            
            const currentCity = day.location || justLocations.split(',')[0];
            
            try {
                const unsplashQuery = encodeURIComponent(`${currentCity} ${day.image_keyword || 'landmark'}`);
                const unsplashRes = await fetch(`https://api.unsplash.com/search/photos?query=${unsplashQuery}&client_id=${process.env.UNSPLASH_API_KEY}&per_page=10&orientation=landscape`);
                const picData = await unsplashRes.json();
                
                let freshPhotos = [];
                if (picData.results) {
                    freshPhotos = picData.results.filter(pic => !usedImages.has(pic.urls.regular));
                }
                
                if (freshPhotos.length > 0) {
                    const randomIndex = Math.floor(Math.random() * freshPhotos.length);
                    finalImgUrl = freshPhotos[randomIndex].urls.regular;
                    usedImages.add(finalImgUrl); 
                } else {
                    console.log(`Unsplash repeated/empty on "${currentCity}". Hitting Wiki with Caller ID...`);
                    const wikiQuery = encodeURIComponent(`${currentCity} ${day.image_keyword || 'landmark'}`);
                    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${wikiQuery}&gsrlimit=5&prop=pageimages&piprop=original&format=json&origin=*`;
                    
                    const wikiRes = await fetch(wikiUrl, {
                        headers: { 'User-Agent': 'AITravelApp/1.0 (learning-project@example.com)' }
                    });
                    const wikiData = await wikiRes.json();
                    
                    if (wikiData.query && wikiData.query.pages) {
                        const pages = Object.values(wikiData.query.pages);
                        
                        for (const page of pages) {
                            if (page.original && page.original.source) {
                                const wikiImg = page.original.source;
                                if (!usedImages.has(wikiImg)) {
                                    finalImgUrl = wikiImg;
                                    usedImages.add(finalImgUrl);
                                    break; 
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