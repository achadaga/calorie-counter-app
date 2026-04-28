const express = require('express');
const path = require('path');
const { Resend } = require('resend');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Google Sheets Auth Setup
const getGoogleSheetsClient = async () => {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const client = await auth.getClient();
        return google.sheets({ version: 'v4', auth: client });
    } catch (e) {
        console.error("Google Sheets Auth Error:", e);
        return null;
    }
};

app.post('/api/register', async (req, res) => {
    const { email, name, optIn } = req.body;
    
    try {
        // 1. Send Welcome Email via Resend
        if (process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #4F6F52; background-color: #FBF9F6; padding: 30px; border-radius: 12px; border: 1px solid #E9E5E0;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #86A789; margin: 0; font-size: 28px;">Welcome to Journey! 🌱</h1>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6;">Hi ${name || 'there'},</p>
                    <p style="font-size: 16px; line-height: 1.6;">We are absolutely thrilled to welcome you to the Journey community! Taking the first step towards a healthier lifestyle is a huge achievement, and we're honored to be part of yours.</p>
                    <p style="font-size: 16px; line-height: 1.6;">Our goal is to make tracking your daily nutrition and progress as effortless and insightful as possible. Don't forget to check in with your AI coach for personalized tips!</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="background-color: #86A789; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Let's Get Started</span>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6;">We can't wait to see you crush your goals.</p>
                    <p style="font-size: 14px; color: #888; text-align: center; margin-top: 40px;">Stay healthy, stay happy.<br>The Journey Team</p>
                </div>
            `;
            await resend.emails.send({
                from: 'Journey Team <onboarding@resend.dev>', // Resend free tier email
                to: email,
                subject: 'Welcome to your new Journey! 🌱',
                html: htmlContent
            });
        }

        // 2. Append to Google Sheets
        if (process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
            const sheets = await getGoogleSheetsClient();
            if (sheets) {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: process.env.GOOGLE_SHEET_ID,
                    range: 'Sheet1!A:D', // Assuming columns are Email, Name, OptIn, Date
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: [[email, name || '', optIn ? 'Yes' : 'No', new Date().toISOString()]]
                    }
                });
            }
        }
        
        res.status(200).json({ success: true, message: 'Registration processed.' });
    } catch (error) {
        console.error("Registration endpoint error:", error);
        res.status(500).json({ error: 'Failed to process registration.' });
    }
});

app.get('/api/config', (req, res) => {
    res.json({
        apiKey: process.env.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || "YOUR_FIREBASE_AUTH_DOMAIN",
        projectId: process.env.FIREBASE_PROJECT_ID || "YOUR_FIREBASE_PROJECT_ID",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "YOUR_FIREBASE_STORAGE_BUCKET",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_FIREBASE_MESSAGING_SENDER_ID",
        appId: process.env.FIREBASE_APP_ID || "YOUR_FIREBASE_APP_ID"
    });
});

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
