// This file acts as a secure "middleman" on Vercel's servers.
// It receives requests from your app, adds the secret API keys,
// and then forwards the requests to the external APIs.

export default async function handler(request, response) {
    // We only expect POST requests to this endpoint.
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { type, query } = request.body;

    // Handle the food search request
    if (type === 'food') {
        // These keys are securely pulled from your Vercel Environment Variables
        const { EDAMAM_APP_ID, EDAMAM_APP_KEY } = process.env;
        const url = `https://api.edamam.com/api/food-database/v2/parser?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}&ingr=${encodeURIComponent(query)}&nutrition-type=logging`;
        
        try {
            const apiResponse = await fetch(url);
            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                return response.status(apiResponse.status).json(errorData);
            }
            const data = await apiResponse.json();
            return response.status(200).json(data);
        } catch (error) {
            return response.status(500).json({ error: 'Failed to fetch from Edamam API' });
        }
    }

    // Handle the AI chat/coach request
    if (type === 'ai') {
        const { GEMINI_API_KEY } = process.env;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
        
        try {
            // FIX: This section now correctly handles both simple prompts and full conversation objects.
            let payload;
            if (typeof query === 'string') {
                // If the request is a simple string (from "Get Advice"), wrap it correctly.
                payload = { contents: [{ parts: [{ text: query }] }] };
            } else {
                // Otherwise, assume it's the full conversational payload from the chatbot.
                payload = query;
            }

            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                return response.status(apiResponse.status).json(errorData);
            }
            const data = await apiResponse.json();
            return response.status(200).json(data);
        } catch (error) {
            return response.status(500).json({ error: 'Failed to fetch from Gemini API' });
        }
    }

    // If the request type is not 'food' or 'ai', return an error
    return response.status(400).json({ error: 'Invalid request type' });
}

