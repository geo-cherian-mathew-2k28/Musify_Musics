const express = require('express');
const admin = require('firebase-admin');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Razorpay = require('razorpay');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// --- 1. CONFIGURATION ---

// Initialize Firebase Admin
if (!admin.apps.length) {
    // Check if we are in production (Vercel) or local
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
        : require('../service-account-key.json'); // Local file fallback
    
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

// --- 2. MIDDLEWARE ---

app.use(helmet());
app.use(express.json());
app.use(morgan('tiny')); // Logging

// CORS: Allow your frontend to talk to this backend
app.use(cors({
    origin: true, // Allow all origins for simplicity in this setup, or restrict to your Vercel URL
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limit: Prevent spam (100 requests per 15 mins)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// --- 3. HELPER: Auth Middleware ---

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid Token' });
    }
};

// --- 4. API ROUTES ---

// Health Check
app.get('/api', (req, res) => {
    res.json({ status: "Backend is running!", timestamp: new Date() });
});

// Payment: Create Order
app.post('/api/payment/create-order', verifyToken, async (req, res) => {
    try {
        const { plan } = req.body; 
        const amount = plan === 'day' ? 500 : 20000; // 500 paise = ₹5
        
        const options = {
            amount: amount,
            currency: "INR",
            receipt: `rcpt_${req.user.uid}_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        
        // Log to Firestore
        await db.collection('orders').doc(order.id).set({
            userId: req.user.uid,
            plan,
            amount,
            status: 'created',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json(order);
    } catch (error) {
        console.error("Payment Error:", error);
        res.status(500).json({ error: "Payment init failed" });
    }
});

// Payment: Verify
app.post('/api/payment/verify', verifyToken, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
        // Update User to Premium
        await db.collection('users').doc(req.user.uid).set({
            isPremium: true,
            lastPaymentId: razorpay_payment_id,
            premiumSince: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Invalid Signature" });
    }
});

// Song Request
app.post('/api/songs/request', verifyToken, async (req, res) => {
    try {
        const { name, language, singer } = req.body;
        await db.collection('requests').add({
            userId: req.user.uid,
            songName: name,
            language,
            singer,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Database error" });
    }
});

// Start Server (Only locally, Vercel handles export)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;