export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Prevent caching to ensure fresh env variables are served
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Helper to strip accidental quotes and whitespace from Vercel env variables
    const cleanEnv = (val) => val ? val.replace(/^["']|["']$/g, '').trim() : undefined;

    res.status(200).json({
        apiKey: cleanEnv(process.env.FIREBASE_API_KEY) || "YOUR_FIREBASE_API_KEY",
        authDomain: cleanEnv(process.env.FIREBASE_AUTH_DOMAIN) || "YOUR_FIREBASE_AUTH_DOMAIN",
        projectId: cleanEnv(process.env.FIREBASE_PROJECT_ID) || "YOUR_FIREBASE_PROJECT_ID",
        storageBucket: cleanEnv(process.env.FIREBASE_STORAGE_BUCKET) || "YOUR_FIREBASE_STORAGE_BUCKET",
        messagingSenderId: cleanEnv(process.env.FIREBASE_MESSAGING_SENDER_ID) || "YOUR_FIREBASE_MESSAGING_SENDER_ID",
        appId: cleanEnv(process.env.FIREBASE_APP_ID) || "YOUR_FIREBASE_APP_ID"
    });
}
