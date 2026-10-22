const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { initDatabase, getDb, isUsingPostgres } = require('./database');
const authController = require('./controllers/authController');
const authRoutes = require('./routes/auth');
const numbersRoutes = require('./routes/numbers');
const walletRoutes = require('./routes/wallet');
const windscribeRoutes = require('./routes/windscribe');
const geminiRoutes = require('./routes/gemini');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// Health check endpoint for UptimeRobot / monitoring keep-alive
app.get(['/health', '/ping', '/api/health'], (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Serve static files
const clientDist = path.join(__dirname, '../../client/dist');
if (require('fs').existsSync(clientDist)) {
    app.use(express.static(clientDist));
}

// Public routes
app.use('/api/auth', authRoutes);

// Windscribe VPN routes
app.use('/api/windscribe', windscribeRoutes);

// Gemini Pro 18M routes
app.use('/api/gemini', geminiRoutes);

// Protected routes (require authentication)
app.use('/api/numbers', authController.authenticate, numbersRoutes);
app.use('/api/payment', authController.authenticate, walletRoutes);
app.use('/api/user', authController.authenticate, walletRoutes);

// Legacy routes for compatibility
const walletController = require('./controllers/walletController');
const numbersController = require('./controllers/numbersController');

app.get('/api/wallex/rate', walletController.getWallexRate);
app.get('/api/card/info', walletController.getCardInfo);
app.get('/api/provider/prices', authController.optionalAuth, async (req, res) => {
    try {
        const servicesData = await require('./services/providerService').getPricesAndAvailability();
        res.json({ success: true, prices: servicesData });
    } catch (e) {
        console.error('Provider prices error:', e);
        res.status(500).json({ success: false, message: 'خطا در دریافت لیست قیمت‌ها' });
    }
});

// Telegram Bot Webhook Endpoint
const { initTelegramBot, getBot } = require('./services/telegramBot');

app.post('/api/telegram-webhook', async (req, res) => {
    try {
        const botInstance = getBot();
        if (botInstance) {
            await botInstance.handleUpdate(req.body, res);
            if (!res.headersSent) {
                res.status(200).send('OK');
            }
        } else {
            console.warn('⚠️ Telegram webhook update arrived before bot was ready.');
            res.status(200).send('Bot initializing');
        }
    } catch (err) {
        console.error('❌ Error handling Telegram webhook update:', err);
        if (!res.headersSent) {
            res.status(200).send('OK');
        }
    }
});

app.get('/api/telegram-webhook', (req, res) => {
    res.json({
        status: 'active',
        service: 'Telegram Webhook Endpoint',
        botReady: !!getBot(),
        timestamp: new Date().toISOString()
    });
});

// Fallback for Single Page Application (compatible with Express 5)
if (require('fs').existsSync(clientDist)) {
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            return res.sendFile(path.join(clientDist, 'index.html'));
        }
        next();
    });
}

// Initialize database and start server
async function start() {
    await initDatabase();
    
    // Launch Telegram Bot
    initTelegramBot();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
        const providerService = require('./services/providerService');
        const active = providerService.getActiveProviders();
        console.log(`🚀 Numberland Server running on port ${PORT}`);
        console.log(`📦 Active Providers: ${active.map(p => p.displayName).join(', ') || 'None'}`);
        console.log(`🔒 Auth: JWT enabled`);
        console.log(`💾 Database: ${isUsingPostgres() ? 'Neon PostgreSQL (Cloud)' : 'SQLite (Local)'}`);
    });
}

start().catch(console.error);
