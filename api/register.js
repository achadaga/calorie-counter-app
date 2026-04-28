import { Resend } from 'resend';
import { google } from 'googleapis';

const cleanEnv = (val) => val ? val.replace(/^["']|["']$/g, '').trim() : undefined;

const getGoogleSheetsClient = async () => {
    try {
        const privateKeyRaw = cleanEnv(process.env.GOOGLE_PRIVATE_KEY);
        const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, '\n') : '';
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: cleanEnv(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
                private_key: privateKey,
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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Check for missing environment variables
    const missingVars = [];
    if (!cleanEnv(process.env.RESEND_API_KEY)) missingVars.push('RESEND_API_KEY');
    if (!cleanEnv(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)) missingVars.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    if (!cleanEnv(process.env.GOOGLE_PRIVATE_KEY)) missingVars.push('GOOGLE_PRIVATE_KEY');
    if (!cleanEnv(process.env.GOOGLE_SHEET_ID)) missingVars.push('GOOGLE_SHEET_ID');

    if (missingVars.length > 0) {
        return res.status(500).json({ 
            error: 'Server is missing environment variables: ' + missingVars.join(', '),
            message: 'Please add these exactly as named in your Vercel Project Settings (without quotes) and trigger a REDEPLOY.'
        });
    }

    const { email, name, optIn } = req.body;
    
    try {
        // 1. Send Welcome Email via Resend
        const resendKey = cleanEnv(process.env.RESEND_API_KEY);
        if (resendKey) {
            const resend = new Resend(resendKey);
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
        const sheetId = cleanEnv(process.env.GOOGLE_SHEET_ID);
        const serviceEmail = cleanEnv(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
        if (sheetId && serviceEmail) {
            const sheets = await getGoogleSheetsClient();
            if (sheets) {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: sheetId,
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
}
