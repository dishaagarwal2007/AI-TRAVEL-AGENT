require('dotenv').config();

async function findMyModels() {
    console.log("🕵️ Scanning Google's servers for your available models...");
    
    try {
        // We use a direct web request to bypass the SDK entirely
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();

        if (data.error) {
            console.error("API Rejected the Key:", data.error.message);
            return;
        }

        console.log("\n✅ SUCCESS! Here are the exact models you can use:");
        console.log("--------------------------------------------------");
        
        // Filter out the old/weird ones and only show models that support text generation
        const textModels = data.models.filter(m => 
            m.supportedGenerationMethods.includes("generateContent")
        );

        textModels.forEach(model => {
            console.log(`➡️  ${model.name.replace('models/', '')}`);
        });
        
        console.log("--------------------------------------------------");
        console.log("Copy ONE of the names above and put it in your server.js file!");

    } catch (error) {
        console.error("Failed to connect to Google:", error);
    }
}

findMyModels();