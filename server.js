/**
 * Custom Next.js Server with Integrated GMP3 TCP Listener
 * 
 * Runs Next.js web application while starting the persistent TCP server
 * listener on 192.168.1.3:59000 for inPOS m530 fiscal yazar kasa integration.
 */

const { createServer } = require('http');
const parse = require('url').parse;
const next = require('next');
const { startGmp3Server } = require('./gmp3-server');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    // Start persistent GMP3 TCP Listener on 192.168.1.3:59000
    try {
        startGmp3Server({
            host: process.env.GMP3_HOST || '192.168.1.3',
            port: parseInt(process.env.GMP3_PORT || '59000', 10),
            posIp: process.env.POS_IP || '192.168.1.40',
            autoAck: true
        });
    } catch (err) {
        console.error('[GMP3 Server Init Error]', err);
    }

    createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error handling request:', req.url, err);
            res.statusCode = 500;
            res.end('Internal Server Error');
        }
    }).listen(port, () => {
        console.log(`> Next.js POS App ready on http://${hostname}:${port}`);
    });
});
