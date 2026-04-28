export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Prevent caching to ensure fresh env variables are served
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Hardcoded public Firebase config to bypass Vercel env injection issues
    // Note: Firebase client keys are inherently public and designed to be exposed to the browser.
    res.status(200).json({
        apiKey: "AIzaSyABXYCaIR2ui6CiYPwWu2iFxjHt_3Gf-l4",
        authDomain: "calorie-counter-app-ash.firebaseapp.com",
        projectId: "calorie-counter-app-ash",
        storageBucket: "calorie-counter-app-ash.firebasestorage.app",
        messagingSenderId: "984607945983",
        appId: "1:984607945983:web:741d35a87b423248af88ca"
    });
}
