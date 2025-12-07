const express = require('express');
const admin = require('firebase-admin');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Razorpay = require('razorpay');
const morgan = require('morgan');

// Native fetch is available in Node 18+ (standard on Vercel)

const app = express();
const PORT = process.env.PORT || 5000;

// --- 1. CONFIGURATION ---

// Initialize Firebase Admin securely
if (!admin.apps.length) {
    // In Vercel, this comes from the Environment Variable string.
    // Locally, it can fallback to a file if you set it up, but Env Var is safer.
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
        : require('../service-account-key.json'); 
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Telegram Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// --- 2. MIDDLEWARE ---

app.use(helmet()); // Secure HTTP headers
app.use(express.json()); // Parse JSON bodies
app.use(morgan('tiny')); // Logging

// CORS: Allow your frontend domain
app.use(cors({ 
    origin: true, // In production, replace 'true' with your actual Vercel URL for stricter security
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limit: Prevent abuse (100 requests per 15 minutes)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// --- 3. AUTH MIDDLEWARE ---

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        return res.status(403).json({ error: 'Unauthorized: Invalid token' });
    }
};

// --- 4. API ROUTES ---

// Health Check
app.get('/api', (req, res) => {
    res.json({ status: "Backend is active", time: new Date().toISOString() });
});

/**
 * SONG REQUEST ENDPOINT
 * Saves to Firestore AND sends a notification to your Telegram Bot
 */
app.post('/api/songs/request', verifyToken, async (req, res) => {
    try {
        const { name, language, singer } = req.body;
        
        // 1. Save to Firestore (Database)
        await db.collection('requests').add({
            userId: req.user.uid,
            userName: req.user.email || 'Anonymous',
            songName: name,
            language,
            singer,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Send to Telegram (Notification)
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            const text = `🎵 *New Song Request* 🎵\n\n💿 **Song:** ${name}\n🗣 **Language:** ${language}\n🎤 **Singer:** ${singer}\n👤 **User:** ${req.user.email || req.user.uid}`;
            
            // We use 'fetch' to call the Telegram API
            // We don't await this so the user gets a fast response even if Telegram is slow
            fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: TELEGRAM_CHAT_ID, 
                    text: text,
                    parse_mode: 'Markdown'
                })
            }).catch(err => console.error("Telegram Error:", err));
        }

        res.json({ success: true, message: "Request sent successfully" });
    } catch (e) {
        console.error("Request Error:", e);
        res.status(500).json({ error: "Failed to process request" });
    }
});

/**
 * FEEDBACK ENDPOINT
 * Sends user feedback directly to your Telegram
 */
app.post('/api/feedback', verifyToken, async (req, res) => {
    try {
        const { message } = req.body;
        
        // 1. Save to Firestore (Optional Log)
        await db.collection('feedback').add({
            userId: req.user.uid,
            userEmail: req.user.email,
            message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Send to Telegram
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            const text = `💬 *New Feedback Received* 💬\n\n👤 **User:** ${req.user.email || req.user.uid}\n📝 **Message:**\n${message}`;
            
            fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: TELEGRAM_CHAT_ID, 
                    text: text,
                    parse_mode: 'Markdown'
                })
            }).catch(err => console.error("Telegram Error:", err));
        }

        res.json({ success: true, message: "Feedback sent" });
    } catch (e) {
        console.error("Feedback Error:", e);
        res.status(500).json({ error: "Failed to send feedback" });
    }
});

/**
 * PAYMENT: CREATE ORDER
 */
app.post('/api/payment/create-order', verifyToken, async (req, res) => {
    try {
        const { plan } = req.body; 
        const amount = plan === 'day' ? 500 : 20000; // 500 paise = ₹5, 20000 paise = ₹200
        
        const options = {
            amount: amount,
            currency: "INR",
            receipt: `rcpt_${req.user.uid}_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        
        // Log Order Intent
        await db.collection('orders').doc(order.id).set({
            userId: req.user.uid,
            plan,
            amount,
            status: 'created',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json(order);
    } catch (error) {
        console.error("Payment Init Error:", error);
        res.status(500).json({ error: "Payment initiation failed" });
    }
});

/**
 * PAYMENT: VERIFY SIGNATURE
 * This is crucial for security. It ensures the payment actually happened.
 */
app.post('/api/payment/verify', verifyToken, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature === razorpay_signature) {
            // Payment Successful: Upgrade User
            await db.collection('users').doc(req.user.uid).collection('profile').doc('profileDoc').set({
                isPremium: true,
                lastPaymentId: razorpay_payment_id,
                premiumSince: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            res.json({ success: true, message: "Premium Activated" });
        } else {
            res.status(400).json({ error: "Invalid Signature" });
        }
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ error: "Payment verification failed" });
    }
});

// --- SERVER START ---

// Vercel Serverless requires exporting the app
// Local development requires app.listen()
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`✅ Secure Backend running locally on http://localhost:${PORT}`);
    });
}

module.exports = app;