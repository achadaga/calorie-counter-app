const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/search', async (req, res) => {
    const { type, query } = req.body;

    if (type === 'ai') {
        const { GEMINI_API_KEY } = process.env;
        // Fix: Use the correct Gemini model instead of the non-existent one
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
                return res.status(apiResponse.status).json(errorData);
            }
            const data = await apiResponse.json();
            return res.status(200).json(data);
        } catch (error) {
            console.error("Server-side Fetch Error:", error);
            return res.status(500).json({ error: 'Failed to fetch from Gemini API' });
        }
    }

    return res.status(400).json({ error: 'Invalid request type' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
