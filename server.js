const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

app.post('/stk-push', async (req, res) => {
    try {
        const { environment, shortcode, passkey, consumerKey, consumerSecret, accountType, amount, phoneNumber } = req.body;
        
        const baseUrl = environment === 'production' 
            ? 'https://api.safaricom.co.ke' 
            : 'https://sandbox.safaricom.co.ke';

        // 1. Get OAuth Token
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const tokenResponse = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { 'Authorization': `Basic ${auth}` }
        });
        const accessToken = tokenResponse.data.access_token;

        // 2. Generate Password & Timestamp
        const date = new Date();
        const timestamp = date.getFullYear() +
            String(date.getMonth() + 1).padStart(2, '0') +
            String(date.getDate()).padStart(2, '0') +
            String(date.getHours()).padStart(2, '0') +
            String(date.getMinutes()).padStart(2, '0') +
            String(date.getSeconds()).padStart(2, '0');

        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
        const transactionType = accountType === 'Paybill' ? 'CustomerPayBillOnline' : 'CustomerBuyGoodsOnline';

        // 3. Send STK Push Request
        const stkResponse = await axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: transactionType,
            Amount: amount,
            PartyA: phoneNumber,
            PartyB: shortcode,
            PhoneNumber: phoneNumber,
            CallBackURL: 'https://mydomain.com/callback',
            AccountReference: 'AssetGuardPro',
            TransactionDesc: 'Subscription Payment'
        }, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        res.json(stkResponse.data);
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.errorMessage || error.message });
    }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
