require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const NodeCS2 = require('node-cs2');
const { Rcon } = require('rcon-client');
const { CS2Inspect } = require('cs2-inspect-lib');

const app = express();
app.use(bodyParser.json());

// Serve Web UI static files
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const AUTH_KEY = process.env.AUTH_KEY;

// ==========================================
// INITIALIZE OFFLINE INSPECT UTILITY
// ==========================================
const inspectServer = new CS2Inspect(); // Used for offline masking and parsing

// ==========================================
// DIRECT STEAM & CS2 GC BOT INTEGRATION
// ==========================================
const hasSteamCredentials = 
    process.env.STEAM_USERNAME && 
    process.env.STEAM_USERNAME !== 'your_steam_username' &&
    process.env.STEAM_PASSWORD && 
    process.env.STEAM_PASSWORD !== 'your_steam_password';

let steamClient = null;
let csgoClient = null;
let gcConnected = false;

if (hasSteamCredentials) {
    console.log('[STEAM] Connecting directly to Steam & CS2 Game Coordinator...');
    
    steamClient = new SteamUser();
    csgoClient = new NodeCS2(steamClient);
    
    // Steam Guard 2FA Handler
    steamClient.on('steamGuard', (domain, callback, lastCodeWrong) => {
        if (lastCodeWrong) {
            console.error('[STEAM GUARD] The previous 2FA code was incorrect.');
        }

        const sharedSecret = process.env.STEAM_SHARED_SECRET;
        if (sharedSecret && sharedSecret.trim().length > 0) {
            try {
                const code = SteamTotp.generateAuthCode(sharedSecret.trim());
                console.log(`[STEAM GUARD] Automatically generating 2FA code: ${code}`);
                return callback(code);
            } catch (err) {
                console.error('[STEAM GUARD] Failed to auto-generate code:', err.message);
            }
        }

        console.log('\n==================================================');
        console.log(`[STEAM GUARD] A login code is required for: ${process.env.STEAM_USERNAME}`);
        console.log(`[STEAM GUARD] Code sent to email or available on authenticator.`);
        console.log('==================================================\n');

        promptFor2FA(callback);
    });

    steamClient.on('loggedOn', () => {
        console.log('[STEAM] Logged into Steam successfully!');
        steamClient.setPersona(1); // Online
        steamClient.gamesPlayed([730]); // CS2 App ID
    });

    steamClient.on('error', (err) => {
        console.error('[STEAM] Steam client error:', err.message);
        gcConnected = false;
    });

    csgoClient.on('connectedToGC', () => {
        console.log('[STEAM] Connected to CS2 Game Coordinator!');
        gcConnected = true;
    });

    csgoClient.on('disconnectedFromGC', (reason) => {
        console.warn('[STEAM] Disconnected from CS2 GC:', reason);
        gcConnected = false;
    });

    // Initiate login
    steamClient.logOn({
        accountName: process.env.STEAM_USERNAME,
        password: process.env.STEAM_PASSWORD
    });
} else {
    console.log('[SYSTEM] Steam Bot Integration: DISABLED (Offline Mode - Masked links only)');
}

function promptFor2FA(callback) {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    readline.question('Enter Steam Guard Code: ', (code) => {
        readline.close();
        if (!code || code.trim().length === 0) {
            console.log('[STEAM GUARD] No code entered. Retrying in console prompt...');
            return promptFor2FA(callback);
        }
        callback(code.trim());
    });
}

// ==========================================
// GC INSPECTION QUEUE MANAGER
// ==========================================
function queryGC(inspectUrl, assetId) {
    return new Promise((resolve, reject) => {
        if (!csgoClient || !gcConnected) {
            return reject(new Error('Game Coordinator connection is not ready.'));
        }

        const targetAssetId = BigInt(assetId);
        
        // Timeout handler
        const timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error('Steam GC query timed out after 10 seconds.'));
        }, 10000);

        // Success handler
        const handleInspectInfo = (item) => {
            if (item && item.itemid && BigInt(item.itemid) === targetAssetId) {
                console.log(`[STEAM] Match found for AssetID ${targetAssetId}`);
                cleanup();
                resolve(item);
            }
        };

        function cleanup() {
            clearTimeout(timeoutId);
            csgoClient.removeListener('inspectItemInfo', handleInspectInfo);
        }

        csgoClient.on('inspectItemInfo', handleInspectInfo);
        
        console.log(`[STEAM] Requesting inspect for link: ${inspectUrl}`);
        csgoClient.inspectItem(inspectUrl);
    });
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// Middleware for authentication
const authenticate = (req, res, next) => {
    if (!AUTH_KEY || AUTH_KEY.trim() === '') {
        return next();
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    if (token !== AUTH_KEY) {
        return res.status(403).json({ error: 'Forbidden: Invalid authorization token' });
    }
    
    next();
};

// Healthcheck endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        mode: hasSteamCredentials ? 'online' : 'offline',
        steamReady: gcConnected,
        rconConfigured: !!process.env.RCON_PASSWORD
    });
});

// Inspect Endpoint (Decodes any link, either unmasked using Steam bot or masked offline)
app.get('/inspect', authenticate, async (req, res) => {
    let url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'Bad Request: Missing "url" query parameter' });
    }
    
    try {
        console.log(`[API] Received inspect request for URL: ${url}`);
        
        // Normalize inspect link prefix to standard format so cs2-inspect-lib can parse it
        try {
            let decodedUrl = decodeURIComponent(url);
            const previewIndex = decodedUrl.indexOf('+csgo_econ_action_preview');
            if (previewIndex !== -1) {
                const payload = decodedUrl.substring(previewIndex);
                url = 'steam://rungame/730/76561202255233023/' + payload;
            }
        } catch (e) {
            // Keep original if decoding fails
        }

        const analysis = inspectServer.analyzeUrl(url);
        
        if (analysis.url_type === 'masked') {
            console.log('[API] URL is masked (hex). Decoding offline...');
            const result = inspectServer.decodeInspectUrl(url);
            return res.json({
                success: true,
                type: 'masked',
                data: result
            });
        }
        
        // Unmasked link requires Steam GC Bot
        if (!hasSteamCredentials || !gcConnected) {
            console.warn('[API] Requested an unmasked URL but Steam Bot is not ready.');
            return res.status(503).json({ 
                error: 'Service Unavailable: Steam Bot is not connected. Only custom masked/hex inspect links can be decoded offline.',
                help: 'Provide valid STEAM_USERNAME and STEAM_PASSWORD in the .env file to enable online inspection.'
            });
        }
        
        console.log('[API] URL is unmasked (Steam). Querying Steam GC...');
        const result = await queryGC(url, analysis.asset_id);
        
        res.json({
            success: true,
            type: 'unmasked',
            data: {
                defindex: result.defindex,
                paintindex: result.paintindex,
                paintseed: result.paintseed,
                paintwear: result.paintwear
            }
        });
    } catch (err) {
        console.error(`[API] Error inspecting item:`, err.message);
        res.status(500).json({
            success: false,
            error: err.message || 'An error occurred during inspection'
        });
    }
});

// Generate Endpoint (Encodes weapon parameters into a custom masked/hex inspect link offline)
app.get('/api/generate', (req, res) => {
    const { defindex, paintindex, paintseed, paintwear } = req.query;
    
    if (!defindex || !paintindex || !paintseed || !paintwear) {
        return res.status(400).json({ error: 'Missing required parameters: defindex, paintindex, paintseed, paintwear' });
    }
    
    try {
        const item = {
            defindex: parseInt(defindex),
            paintindex: parseInt(paintindex),
            paintseed: parseInt(paintseed),
            paintwear: parseFloat(paintwear)
        };
        
        const inspectUrl = inspectServer.createInspectUrl(item);
        
        res.json({
            success: true,
            inspectUrl: inspectUrl,
            genCommand: `!gen ${item.defindex} ${item.paintindex} ${item.paintseed} ${item.paintwear}`
        });
    } catch (err) {
        console.error('[API] Error generating inspect URL:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Send to Server Endpoint (Sends skin parameters directly to a player using CS2 RCON)
app.post('/api/send-to-server', async (req, res) => {
    const { steamId, defindex, paintindex, paintseed, paintwear } = req.body;
    
    if (!steamId || !defindex || !paintindex || !paintseed || !paintwear) {
        return res.status(400).json({ error: 'Missing required body parameters' });
    }
    
    if (!process.env.RCON_PASSWORD || process.env.RCON_PASSWORD === 'your_rcon_password') {
        return res.status(400).json({ error: 'RCON is not configured or uses default password in .env' });
    }
    
    let rconConnection;
    try {
        console.log(`[RCON] Connecting to CS2 Server ${process.env.RCON_HOST || '127.0.0.1'}:${process.env.RCON_PORT || 27015}...`);
        
        rconConnection = await Rcon.connect({
            host: process.env.RCON_HOST || '127.0.0.1',
            port: parseInt(process.env.RCON_PORT) || 27015,
            password: process.env.RCON_PASSWORD,
            timeout: 5000
        });
        
        const rconCmd = `css_inspect_target ${steamId} ${defindex} ${paintindex} ${paintseed} ${paintwear}`;
        console.log(`[RCON] Sending command: ${rconCmd}`);
        
        const response = await rconConnection.send(rconCmd);
        await rconConnection.end();
        
        res.json({
            success: true,
            response: response || 'Command executed successfully.'
        });
    } catch (err) {
        console.error('[RCON] Connection or execution error:', err.message);
        if (rconConnection) {
            try { await rconConnection.end(); } catch (e) {}
        }
        res.status(500).json({
            success: false,
            error: `Failed to connect/send command to CS2 server: ${err.message}`
        });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`[SYSTEM] Inspect Server API listening on port ${PORT}`);
    console.log(`[SYSTEM] Web UI available at http://localhost:${PORT}`);
});
