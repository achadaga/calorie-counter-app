export default async function handler(request, response) {
    const { type, query } = request.body;

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    if (type === 'food') {
        const { EDAMAM_APP_ID, EDAMAM_APP_KEY } = process.env;
        const url = `https://api.edamam.com/api/food-database/v2/parser?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}&ingr=${encodeURIComponent(query)}&nutrition-type=logging`;
        
        try {
            const apiResponse = await fetch(url);
            const data = await apiResponse.json();
            return response.status(200).json(data);
        } catch (error) {
            return response.status(500).json({ error: 'Failed to fetch from Edamam API' });
        }
    }

    if (type === 'ai') {
        const { GEMINI_API_KEY } = process.env;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
        
        try {
            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: query }] }] })
            });
            const data = await apiResponse.json();
            return response.status(200).json(data);
        } catch (error) {
            return response.status(500).json({ error: 'Failed to fetch from Gemini API' });
        }
    }

    return response.status(400).json({ error: 'Invalid request type' });
}