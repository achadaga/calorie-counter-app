// This file acts as a secure "middleman" on Vercel's servers.

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { type, query } = request.body;

    // This endpoint now only handles AI requests
    if (type === 'ai') {
        const { GEMINI_API_KEY } = process.env;
        // CORRECTED: Changed the API endpoint from v1beta to the stable v1 and using the standard 'gemini-pro' model.
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
        
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

