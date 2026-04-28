// This file acts as a secure "middleman" on Vercel's servers.

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { type, query } = request.body;

    // This endpoint now only handles AI requests
    if (type === 'ai') {
        const cleanEnv = (val) => val ? val.replace(/^["']|["']$/g, '').trim() : undefined;
        const GEMINI_API_KEY = cleanEnv(process.env.GEMINI_API_KEY);

        if (!GEMINI_API_KEY) {
            return response.status(500).json({ 
                error: 'Server is missing GEMINI_API_KEY environment variable.',
                message: 'Please add GEMINI_API_KEY exactly as named in your Vercel Project Settings (without quotes) and trigger a REDEPLOY.'
            });
        }

        // CORRECTED: Reverted to the exact API URL from the previously working version of the app.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        try {
            const payload = (typeof query === 'string') 
                ? { contents: [{ parts: [{ text: query }] }] } 
                : query;

            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                console.error("API Error Response:", errorData);
                return response.status(apiResponse.status).json(errorData);
            }
            const data = await apiResponse.json();
            return response.status(200).json(data);
        } catch (error) {
            console.error("Server-side Fetch Error:", error);
            return response.status(500).json({ error: 'Failed to fetch from Gemini API' });
        }
    }

    // If the request type is not 'ai', return an error
    return response.status(400).json({ error: 'Invalid request type' });
}

