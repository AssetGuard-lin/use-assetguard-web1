// Requires: express@4.21.2, axios@1.7.9, cors@2.8.5
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const {
    PORT = 3000,
    ALLOWED_ORIGINS = '',
    DARAJA_ENVIRONMENT = 'sandbox',
    DARAJA_SHORTCODE,
    DARAJA_PASSKEY,
    DARAJA_CONSUMER_KEY,
    DARAJA_CONSUMER_SECRET,
    DARAJA_ACCOUNT_TYPE = 'Paybill',
    DARAJA_CALLBACK_URL
} = process.env;

const allowedOrigins = ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Origin not allowed'));
    },
    methods: ['POST']
}));

function normalizePhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (/^0\d{9}$/.test(digits)) return '254' + digits.slice(1);
    if (/^254\d{9}$/.test(digits)) return digits;
    return null;
}

app.post('/stk-push', async (req, res) => {
    if (!DARAJA_SHORTCODE || !DARAJA_PASSKEY || !DARAJA_CONSUMER_KEY || !DARAJA_CONSUMER_SECRET || !DARAJA_CALLBACK_URL) {
        return res.status(500).json({ error: 'Payment gateway is not configured.' });
    }

    const phoneNumber = normalizePhone(req.body.phoneNumber);
    const amount = Number.parseInt(req.body.amount, 10);

    if (!phoneNumber) {
        return res.status(400).json({ error: 'A valid Kenyan phone number is required.' });
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > 150000) {
        return res.status(400).json({ error: 'Amount must be a whole number between 1 and 150000.' });
    }

    const baseUrl = DARAJA_ENVIRONMENT === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

    try {
        // 1. Get OAuth Token
        const auth = Buffer.from(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`).toString('base64');
        const tokenResponse = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { 'Authorization': `Basic ${auth}` }
        });
        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
            const tokenError = new Error('Safaricom OAuth response did not include an access_token');
            tokenError.upstreamStatus = tokenResponse.status || 502;
            tokenError.upstreamPayload = tokenResponse.data;
            throw tokenError;
        }

        // 2. Generate Password & Timestamp
        const date = new Date();
        const timestamp = date.getFullYear() +
            String(date.getMonth() + 1).padStart(2, '0') +
            String(date.getDate()).padStart(2, '0') +
            String(date.getHours()).padStart(2, '0') +
            String(date.getMinutes()).padStart(2, '0') +
            String(date.getSeconds()).padStart(2, '0');

        const password = Buffer.from(`${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`).toString('base64');
        const transactionType = DARAJA_ACCOUNT_TYPE === 'Paybill' ? 'CustomerPayBillOnline' : 'CustomerBuyGoodsOnline';

        // 3. Send STK Push Request
        const stkResponse = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
            BusinessShortCode: DARAJA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: transactionType,
            Amount: amount,
            PartyA: phoneNumber,
            PartyB: DARAJA_SHORTCODE,
            PhoneNumber: phoneNumber,
            CallBackURL: DARAJA_CALLBACK_URL,
            AccountReference: 'AssetGuardPro',
            TransactionDesc: 'Subscription Payment'
        }, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        res.json(stkResponse.data);
    } catch (error) {
        console.error('STK push failed:', error.response?.data || error.upstreamPayload || error.message);
        res.status(502).json({ error: 'Payment request could not be completed.' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
