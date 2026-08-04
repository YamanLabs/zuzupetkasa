/**
 * GMP3 Protocol TCP Server Listener for inPOS m530 Fiscal Cash Register
 * 
 * Hardware Network Setup:
 * - Laptop Static IP: 192.168.1.3 (or any local IP)
 * - POS Terminal IP: 192.168.1.40
 * - PC Listening Port: 59000
 * 
 * Purpose:
 * Binds a TCP Server on port 59000 to listen for incoming handshakes,
 * heartbeat signals, and status check packets from the inPOS m530 terminal.
 * Responds with standard GMP3 ACK (0x06) to clear "no connection found" /
 * "bağlantı bulunamadı" state on the POS screen and maintain "Connected" status.
 */

const net = require('net');
const os = require('os');

// GMP3 Protocol Byte Constants
const GMP3 = {
    STX: 0x02, // Start of Text
    ETX: 0x03, // End of Text
    EOT: 0x04, // End of Transmission
    ENQ: 0x05, // Enquiry (Heartbeat / Ping from POS)
    ACK: 0x06, // Acknowledge (Sent to POS to confirm connection/packet)
    NAK: 0x15, // Negative Acknowledge
};

// Helper function to get all local IPv4 addresses
function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const netIf of interfaces[name]) {
            if (netIf.family === 'IPv4' && !netIf.internal) {
                ips.push(`${name}: ${netIf.address}`);
            }
        }
    }
    return ips;
}

// Configuration defaults (defaults to 0.0.0.0 so it listens on all local network adapters)
const DEFAULT_CONFIG = {
    host: (process.env.GMP3_HOST || '0.0.0.0').trim(),
    port: parseInt(process.env.GMP3_PORT || '59000', 10),
    posIp: (process.env.POS_IP || '192.168.1.75').trim(),
    autoAck: true
};

let serverInstance = null;
const activeSockets = new Set();

/**
 * Calculates Longitudinal Redundancy Check (LRC) byte for GMP3 frame verification.
 * XOR sum of all bytes between STX and ETX (inclusive of ETX).
 * @param {Buffer} buffer 
 * @returns {number} LRC byte value (0-255)
 */
function calculateLRC(buffer) {
    let lrc = 0;
    for (const byte of buffer) {
        lrc ^= byte;
    }
    return lrc;
}

/**
 * Starts the GMP3 TCP Server.
 * @param {Object} options 
 * @returns {net.Server}
 */
function startGmp3Server(options = {}) {
    const config = { ...DEFAULT_CONFIG, ...options };

    if (serverInstance) {
        console.log('[GMP3 Server] TCP Server listener is already running.');
        return serverInstance;
    }

    const server = net.createServer((socket) => {
        const clientIp = socket.remoteAddress ? socket.remoteAddress.replace(/^.*:/, '') : 'Unknown';
        const clientPort = socket.remotePort;
        const connectionTime = new Date().toLocaleTimeString();

        console.log(`\n==================================================`);
        console.log(`[GMP3 Server]  INCOMING POS CONNECTION DETECTED!`);
        console.log(`[GMP3 Server] Time     : ${connectionTime}`);
        console.log(`[GMP3 Server] Client IP: ${clientIp}:${clientPort}`);
        console.log(`==================================================\n`);

        // Verify if connection is coming from target POS terminal IP
        if (clientIp === config.posIp || config.posIp === '*') {
            console.log(`[GMP3 Server] Verified connection from inPOS m530 Terminal (${clientIp}). Status: CONNECTED`);
        } else {
            console.log(`[GMP3 Server] Note: Connection from IP (${clientIp}). Target POS IP: ${config.posIp}`);
        }

        // Enable TCP Keep-Alive (ping every 10s) to keep socket open continuously
        socket.setKeepAlive(true, 10000);
        activeSockets.add(socket);

        // Handle incoming data streams from POS terminal
        socket.on('data', (data) => {
            const hexString = data.toString('hex').toUpperCase();
            const asciiString = data.toString('ascii').replace(/[^\x20-\x7E]/g, '.');

            console.log(`[GMP3 Data Received] Bytes: ${data.length} | Hex: [${hexString}] | ASCII: "${asciiString}"`);

            // Detect Packet Types (ENQ, Heartbeat, STX...ETX)
            const isEnquiry = data.includes(GMP3.ENQ);

            if (isEnquiry) {
                console.log(`[GMP3 Heartbeat] Detected ENQ (0x05) heartbeat signal from inPOS terminal.`);
            }

            // =========================================================================
            // PLACEHOLDER: GMP3 ACK / RESPONSE LOGIC
            // =========================================================================
            // Sending ACK (0x06) back to the terminal notifies inPOS m530 that the
            // PC server listener is alive and acknowledging its signal.
            // This clears the "Bağlantı Bulunamadı / No Connection Found" idle alert state.
            // =========================================================================
            if (config.autoAck) {
                const ackBuffer = Buffer.from([GMP3.ACK]);
                socket.write(ackBuffer, () => {
                    console.log(`[GMP3 Response] Sent ACK (0x06) to inPOS Terminal -> Software Handshake Active.`);
                });
            }
        });

        // Connection termination events
        socket.on('end', () => {
            console.log(`[GMP3 Server] Connection closed by POS Terminal (${clientIp}:${clientPort}).`);
            activeSockets.delete(socket);
        });

        socket.on('close', (hadError) => {
            console.log(`[GMP3 Server] Socket closed (${clientIp}:${clientPort}). Had Error: ${hadError}`);
            activeSockets.delete(socket);
        });

        // Handle Socket Errors gracefully to prevent server process crash
        socket.on('error', (err) => {
            if (err.code === 'ECONNRESET') {
                console.log(`[GMP3 Server] POS Terminal reset connection (${clientIp}). Handshake will reconnect automatically.`);
            } else {
                console.error(`[GMP3 Socket Error] (${clientIp}):`, err.message);
            }
            activeSockets.delete(socket);
        });
    });

    const localIps = getLocalIpAddresses();

    const printBanner = (boundHost) => {
        console.log(`\n==================================================`);
        console.log(`  GMP3 TCP SERVER LISTENER STARTED SUCCESSFULLY   `);
        console.log(`==================================================`);
        console.log(` Listening Host : ${boundHost} (All Adapters)`);
        console.log(` Listening Port : ${config.port}`);
        console.log(` Local Adapters : ${localIps.join(', ') || 'None'}`);
        console.log(` Target POS IP  : inPOS m530 (${config.posIp})`);
        console.log(` Status         : Active & Listening for POS handshake...`);
        console.log(`==================================================\n`);
    };

    // Server-level Error Handling with automatic fallback to 0.0.0.0
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`[GMP3 Server Info] Port ${config.port} is already active and listening on another process.`);
        } else if (err.code === 'EADDRNOTAVAIL') {
            console.warn(`[GMP3 Server Warning] IP ${config.host} not available on local adapters.`);
            console.warn(`[GMP3 Server Fallback] Retrying bind on 0.0.0.0 (all network adapters)...`);
            // Automatic fallback to 0.0.0.0
            server.listen(config.port, () => printBanner('0.0.0.0'));
        } else {
            console.error('[GMP3 Server Error]:', err.message);
        }
    });

    // Bind to target host IP or 0.0.0.0 (wildcard for all adapters)
    if (config.host === '0.0.0.0' || !config.host) {
        server.listen(config.port, () => printBanner('0.0.0.0'));
    } else {
        server.listen(config.port, config.host, () => printBanner(config.host));
    }

    serverInstance = server;
    return server;
}

/**
 * Broadcasts or sends payload buffer to all active connected POS sockets.
 * @param {Buffer|string} payload 
 */
function sendToPos(payload) {
    const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    for (const socket of activeSockets) {
        if (!socket.destroyed && socket.writable) {
            socket.write(buffer);
        }
    }
}

function getActiveSocketCount() {
    return activeSockets.size;
}

// Execute directly if launched via `node gmp3-server.js`
if (require.main === module) {
    startGmp3Server();
}

module.exports = {
    startGmp3Server,
    sendToPos,
    getActiveSocketCount,
    calculateLRC,
    GMP3
};
