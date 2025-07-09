const express = require('express');
const path = require('path');
const os = require('os');
const http = require('http');
const { WebSocketServer } = require('ws');
const fileUploadRoutes = require('./routes/upload');
const fileListRoutes = require('./routes/files');

console.log(">>> Mật khẩu được nạp từ .env là:", process.env.PASSWORD);

const app = express();
const server = http.createServer(app);

// ===== WebSocket Setup =====
const wss = new WebSocketServer({ server });
const clients = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'register' && data.clientId) {
                clients.set(data.clientId, ws);
                console.log(`Client đã đăng ký với ID: ${data.clientId}`);
                ws.clientId = data.clientId;
            }
        } catch (e) {
            console.error('Lỗi khi xử lý message từ client:', e);
        }
    });
    ws.on('close', () => {
        if (ws.clientId) {
            clients.delete(ws.clientId);
            console.log(`Client ${ws.clientId} đã ngắt kết nối.`);
        }
    });
    ws.on('error', console.error);
});

app.use((req, res, next) => {
    req.wss = { clients };
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/upload', fileUploadRoutes);
app.use('/files', fileListRoutes);

app.get('/storage-info', async (req, res) => {
    try {
        const local = require('./services/local');
        const r2 = require('./services/r2');
        const supabase = require('./services/supabase');
        const [localFiles, r2Files] = await Promise.all([local.listFiles(), r2.listFiles(),supabase.listFiles()]);
        const localUsed = localFiles.reduce((sum, f) => sum + f.size, 0);
        const r2Used = r2Files.reduce((sum, f) => sum + f.size, 0);
        res.json({
            Local: { used: localUsed, available: "Infinity" },
            R2: { used: r2Used, available: 10 * 1024 * 1024 * 1024 - r2Used },
        });
    } catch (err) {
        res.status(500).send('Lỗi khi lấy thông tin: ' + err.message);
    }
});

function getLocalIP() {
    const networkInterfaces = os.networkInterfaces();
    for (const iface of Object.values(networkInterfaces)) {
        for (const details of iface) {
            if (details.family === 'IPv4' && !details.internal) return details.address;
        }
    }
    return 'localhost';
}

const port = process.env.PORT || 3000;
app.get('/api/environment', (req, res) => {
    // Railway (và nhiều PaaS khác) tự động đặt biến môi trường NODE_ENV
    if (process.env.NODE_ENV === 'production') {
        res.json({ env: 'production' });
    } else {
        res.json({ env: 'development' });
    }
});
server.listen(port, '0.0.0.0', () => {
    console.log(`Server đang chạy tại http://${getLocalIP()}:${port}`);
});