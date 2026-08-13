const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const serve = require('electron-serve');
const electronServe = serve.default || serve;
const db = require('./database');
const posTerminal = require('./pos_terminal');
const { startGmp3Server } = require('../gmp3-server');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const https = require('https');
const child_process = require('child_process');

const loadURL = electronServe({ directory: path.join(__dirname, '../out') });

// Set Application User Model ID for Windows Taskbar Icon Grouping
if (process.platform === 'win32') {
    app.setAppUserModelId('com.yamanlabs.kasapos');
}

let mainWindow = null;

async function createWindow() {
    await db.init();

    // Start GMP3 TCP Server Listener for inPOS m530
    try {
        startGmp3Server();
    } catch (err) {
        console.error('[Electron] Failed to start GMP3 TCP Server:', err);
    }

    const iconPath = path.join(__dirname, '../public/icon.ico');
    const iconImage = nativeImage.createFromPath(iconPath);

    mainWindow = new BrowserWindow({
        width: 1366,
        height: 768,
        minWidth: 1024,
        minHeight: 600,
        frame: false,
        icon: iconImage,
        backgroundColor: '#0f172a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        }
    });

    if (mainWindow.setIcon) {
        mainWindow.setIcon(iconImage);
    }

    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        loadURL(mainWindow);
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // IMP-22: Content Security Policy
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:* ws://localhost:* https://*.google.com https://*.googleapis.com;"
                ]
            }
        });
    });

    // Schedule 20:00 Daily Backup and Check Startup Backup
    setupDailyBackupScheduler();
}

function getLocalBackupDir() {
    const docsPath = app ? app.getPath('documents') : path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'Documents');
    const backupDir = path.join(docsPath, 'ZuzuKasa_Yedekler');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
}

function listLocalBackups() {
    const backupDir = getLocalBackupDir();
    if (!fs.existsSync(backupDir)) return [];
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db'));
    return files.map(filename => {
        const filePath = path.join(backupDir, filename);
        const stats = fs.statSync(filePath);
        return {
            filename,
            filePath,
            sizeBytes: stats.size,
            mtime: stats.mtime
        };
    }).sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

// BUG-07 FIX: Clean old backups, keep only the most recent maxCount files
function cleanOldBackups(backupDir, maxCount = 30) {
    try {
        if (!fs.existsSync(backupDir)) return;
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.db'))
            .map(f => ({ name: f, mtime: fs.statSync(path.join(backupDir, f)).mtime }))
            .sort((a, b) => b.mtime - a.mtime);
        for (const file of files.slice(maxCount)) {
            try {
                fs.unlinkSync(path.join(backupDir, file.name));
                console.log(`[Backup] Rotated old backup: ${file.name}`);
            } catch (e) {
                console.error('[Backup] Failed to delete old backup:', e.message);
            }
        }
    } catch (e) {
        console.error('[Backup] cleanOldBackups error:', e.message);
    }
}

async function performDailyBackup() {
    try {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
        const fileName = `pos_system_${dateStr}_${timeStr}.db`;

        const backupDir = getLocalBackupDir();
        const targetPath = path.join(backupDir, fileName);

        // Flush in-memory DB to disk before copying
        db.save();
        const res = db.exportBackup(targetPath);
        if (res.success) {
            console.log(`[Backup] Daily backup saved to local: ${targetPath}`);
            db.setSetting('last_daily_backup_date', dateStr);
            // BUG-07 FIX: Rotate old backups after each successful backup
            cleanOldBackups(backupDir, 30);
            return { success: true, filePath: targetPath };
        }
        return res;
    } catch (err) {
        console.error('[Backup] performDailyBackup error:', err);
        return { success: false, error: err.message };
    }
}

function setupDailyBackupScheduler() {
    // Check if backup for today was already taken
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastBackupDate = db.getSetting('last_daily_backup_date', '');

    // If not backed up today and it's already past 20:00, or skipped yesterday
    const currentHour = new Date().getHours();
    if (lastBackupDate !== todayStr && currentHour >= 20) {
        performDailyBackup();
    }

    // Interval check every minute for 20:00
    setInterval(() => {
        const now = new Date();
        const curDate = now.toISOString().slice(0, 10);
        const curHour = now.getHours();
        const curMin = now.getMinutes();

        if (curHour === 20 && curMin === 0) {
            const lastDate = db.getSetting('last_daily_backup_date', '');
            if (lastDate !== curDate) {
                performDailyBackup();
            }
        }
    }, 60000);
}

// IPC Database Handlers
ipcMain.handle('db:getProducts', (event, searchQuery, category) => db.getAllProducts(searchQuery, category));
ipcMain.handle('db:getProductByBarcode', (event, barcode) => db.getProductByBarcode(barcode));
ipcMain.handle('db:getProductById', (event, id) => db.getProductById(id));
ipcMain.handle('db:addProduct', (event, data) => db.addProduct(data));
ipcMain.handle('db:updateProduct', (event, id, data) => db.updateProduct(id, data));
ipcMain.handle('db:deleteProduct', (event, id) => db.deleteProduct(id));
ipcMain.handle('db:getCategories', () => db.getCategories());

ipcMain.handle('db:createSale', (event, saleData) => db.createSale(saleData));
ipcMain.handle('db:getSalesList', (event, dateStart, dateEnd) => db.getSalesList(dateStart, dateEnd));
ipcMain.handle('db:getSaleItems', (event, saleId) => db.getSaleItems(saleId));
ipcMain.handle('db:processRefund', (event, saleId) => db.processRefund(saleId));
ipcMain.handle('db:deleteSale', (event, saleId) => db.deleteSale(saleId));
ipcMain.handle('db:deleteSales', (event, saleIds) => db.deleteSales(saleIds));

ipcMain.handle('db:getCriticalStockProducts', () => db.getCriticalStockProducts());
ipcMain.handle('db:getStockLogs', (event, limit) => db.getStockLogs(limit));

ipcMain.handle('db:getDailySummary', (event, dateStr) => db.getDailySummary(dateStr));
ipcMain.handle('db:getEndOfDayReport', (event, dateStr) => db.getEndOfDayReport(dateStr));

ipcMain.handle('db:addOrUpdateStockByBarcode', (event, barcode, name, addedStock, price, costPrice, unit, category) =>
    db.addOrUpdateStockByBarcode(barcode, name, addedStock, price, costPrice, unit, category)
);

ipcMain.handle('db:getCategoryMargins', () => db.getCategoryMargins());
ipcMain.handle('db:saveCategoryMargins', (event, margins) => db.saveCategoryMargins(margins));
ipcMain.handle('db:updateCategoryProductPrices', (event, cat, cashMargin, cardMargin) => db.updateCategoryProductPrices(cat, cashMargin, cardMargin));
ipcMain.handle('db:deleteCategory', (event, categoryName) => db.deleteCategory(categoryName));

ipcMain.handle('db:getSetting', (event, key, defaultValue) => db.getSetting(key, defaultValue));
ipcMain.handle('db:setSetting', (event, key, value) => db.setSetting(key, value));
ipcMain.handle('db:getSettings', () => db.getSettings());
ipcMain.handle('db:clearEntireDatabase', (event, keepSettings) => db.clearEntireDatabase(keepSettings));

ipcMain.handle('db:exportBackup', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Veritabanı Yedekle (Dışa Aktar)',
        defaultPath: `yamanlabs_kasa_pos_backup_${today}.db`,
        filters: [{ name: 'SQLite Veritabanı (*.db)', extensions: ['db'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    return db.exportBackup(filePath);
});

ipcMain.handle('db:importBackup', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
        title: 'Veritabanı Geri Yükle (İçe Aktar)',
        filters: [{ name: 'SQLite Veritabanı (*.db)', extensions: ['db'] }],
        properties: ['openFile']
    });
    if (canceled || !filePaths || filePaths.length === 0) return { success: false, canceled: true };
    return db.importBackup(filePaths[0]);
});

ipcMain.handle('db:exportBarcodes', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
        title: 'Barkodları Dışa Aktar',
        defaultPath: `barkod_yedek_${today}.json`,
        filters: [{ name: 'JSON Dosyası (*.json)', extensions: ['json'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    return db.exportBarcodes(filePath);
});

ipcMain.handle('db:importBarcodes', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
        title: 'Barkodları İçe Aktar',
        filters: [{ name: 'JSON Dosyası (*.json)', extensions: ['json'] }],
        properties: ['openFile']
    });
    if (canceled || !filePaths || filePaths.length === 0) return { success: false, canceled: true };
    return db.importBarcodes(filePaths[0]);
});

ipcMain.handle('db:performBackupNow', async () => {
    return await performDailyBackup();
});

ipcMain.handle('db:listBackups', () => {
    return listLocalBackups();
});

ipcMain.handle('db:restoreBackupFile', (event, filePath) => {
    return db.importBackup(filePath);
});


// --- AUTO UPDATER IPC HANDLERS ---
let updateDownloadPath = null;

// BUG-09 FIX: Proper semantic version comparison (semver)
function semverGt(a, b) {
    const cleanA = (a || '').replace(/^[vV]/, '');
    const cleanB = (b || '').replace(/^[vV]/, '');
    const pa = cleanA.split('.').map(Number);
    const pb = cleanB.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return true;
        if (na < nb) return false;
    }
    return false;
}

function getGitHubToken() {
    return db.getSetting('github_pat_token', '') || process.env.GITHUB_PAT || '';
}

ipcMain.handle('app:getVersion', () => app.getVersion() || '3.7.0');

ipcMain.handle('updater:check', () => {
    return new Promise((resolve) => {
        const ghToken = getGitHubToken();
        const headers = {
            'User-Agent': 'zuzupetkasa-updater'
        };
        if (ghToken) {
            headers['Authorization'] = `Bearer ${ghToken}`;
        }

        const options = {
            hostname: 'api.github.com',
            path: '/repos/YamanLabs/zuzupetkasa/releases/latest',
            method: 'GET',
            headers
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const release = JSON.parse(data);
                    const currentVersion = app.getVersion() || '3.7.0';
                    const latestVersion = release.tag_name ? release.tag_name.replace(/^[vV]/, '') : null;

                    // BUG-09 FIX: Use proper semver comparison instead of string equality
                    if (latestVersion && semverGt(latestVersion, currentVersion)) {
                        // Prefer .asar asset (unpacked app update) over .exe (portable installer).
                        // This allows unpacked win-arm64-unpacked deployments to receive updates.
                        const asarAsset = release.assets && release.assets.find(a => a.name.endsWith('.asar'));
                        const exeAsset = release.assets && release.assets.find(a => a.name.endsWith('.exe'));
                        const asset = asarAsset || exeAsset;

                        resolve({
                            hasUpdate: true,
                            currentVersion,
                            latestVersion,
                            releaseNotes: release.body,
                            releaseDate: release.published_at,
                            downloadUrl: asset ? asset.url : null,
                            assetSize: asset ? asset.size : 0,
                            updateType: asarAsset ? 'asar' : 'exe'
                        });
                    } else {
                        resolve({ hasUpdate: false, currentVersion, latestVersion });
                    }
                } catch (err) {
                    console.error('Updater parse error:', err);
                    resolve({ hasUpdate: false, error: err.message });
                }
            });
        });

        req.on('error', (err) => {
            console.error('Updater request error:', err);
            resolve({ hasUpdate: false, error: err.message });
        });

        req.end();
    });
});

ipcMain.handle('updater:startDownload', async (event, downloadUrl, totalBytes) => {
    try {
        // 1. BACKUP DATABASE BEFORE DOWNLOAD
        const desktopPath = app.getPath('desktop');
        const backupFolder = path.join(desktopPath, 'guncelleme oncesi database yedek');
        if (!fs.existsSync(backupFolder)) {
            fs.mkdirSync(backupFolder, { recursive: true });
        }

        const pad = n => n.toString().padStart(2, '0');
        const d = new Date();
        const timestamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
        const backupFile = path.join(backupFolder, `pos_system_backup_${timestamp}.db`);

        const dbPath = path.join(app.getPath('userData'), 'pos_system.db');
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, backupFile);
            console.log('Database backed up for update:', backupFile);
        }

        // 2. DOWNLOAD UPDATE ASSET
        // Use correct extension: .asar for unpacked app updates, .exe for portable installer
        const updateExt = downloadUrl && downloadUrl.toLowerCase().includes('.asar') ? '.asar' : '.exe';
        updateDownloadPath = path.join(app.getPath('temp'), `zuzupetkasa_update_${timestamp}${updateExt}`);
        const file = fs.createWriteStream(updateDownloadPath);

        return new Promise((resolve, reject) => {
            const ghToken = getGitHubToken();
            const headers = {
                'User-Agent': 'zuzupetkasa-updater',
                'Accept': 'application/octet-stream'
            };
            if (ghToken) {
                headers['Authorization'] = `Bearer ${ghToken}`;
            }

            const options = { headers };

            const req = https.get(downloadUrl, options, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    // BUG-31 FIX: Strip Authorization header before following redirect to S3
                    // to prevent 403 Forbidden errors and handle infinite loops.
                    const redirectOpts = { headers: { ...headers } };
                    delete redirectOpts.headers['Authorization'];
                    
                    https.get(res.headers.location, redirectOpts, handleResponse).on('error', reject);
                } else {
                    handleResponse(res);
                }

                function handleResponse(response) {
                    let downloadedBytes = 0;
                    let lastEmittedTime = Date.now();
                    let lastEmittedBytes = 0;

                    response.on('data', (chunk) => {
                        downloadedBytes += chunk.length;
                        const now = Date.now();

                        // Emit progress every ~250ms
                        if (now - lastEmittedTime >= 250 || downloadedBytes === totalBytes) {
                            const timeDiff = (now - lastEmittedTime) / 1000;
                            const bytesDiff = downloadedBytes - lastEmittedBytes;
                            const speedBps = timeDiff > 0 ? bytesDiff / timeDiff : 0;

                            const percent = totalBytes ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
                            const speedFormatted = (speedBps / (1024 * 1024)).toFixed(2) + ' MB/s';
                            const downloadedFormatted = (downloadedBytes / (1024 * 1024)).toFixed(2) + ' MB';
                            const totalFormatted = totalBytes ? (totalBytes / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB';
                            const etaSeconds = speedBps > 0 && totalBytes ? Math.round((totalBytes - downloadedBytes) / speedBps) : 0;

                            event.sender.send('updater:progress', {
                                percent,
                                speedFormatted,
                                downloadedFormatted,
                                totalFormatted,
                                etaSeconds
                            });

                            lastEmittedTime = now;
                            lastEmittedBytes = downloadedBytes;
                        }
                    });

                    response.pipe(file);

                    file.on('finish', () => {
                        file.close(() => {
                            resolve({ success: true, path: updateDownloadPath, backupPath: backupFile });
                        });
                    });
                }
            });

            req.on('error', (err) => {
                fs.unlink(updateDownloadPath, () => { });
                reject(err);
            });
        });
    } catch (err) {
        console.error('Update download error:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('updater:install', () => {
    if (updateDownloadPath && fs.existsSync(updateDownloadPath)) {
        console.log('Installing update from:', updateDownloadPath);

        if (updateDownloadPath.endsWith('.asar')) {
            // UNPACKED APP UPDATE: Replace app.asar via a batch script.
            // Windows locks the running .asar so we can't replace it directly.
            // Strategy: write a .bat that waits 3s for app to close, copies new asar, restarts.
            const asarDest = path.join(process.resourcesPath, 'app.asar');
            const appExe = process.execPath;
            const batchLines = [
                '@echo off',
                'timeout /t 3 /nobreak > NUL',
                `copy /y "${updateDownloadPath}" "${asarDest}"`,
                `start "" "${appExe}"`,
                'del "%~f0"'   // self-delete the batch after running
            ].join('\r\n');
            const batchPath = path.join(app.getPath('temp'), 'zuzupetkasa_update.bat');
            fs.writeFileSync(batchPath, batchLines, 'utf8');
            child_process.spawn('cmd.exe', ['/c', batchPath], {
                detached: true,
                stdio: 'ignore'
            }).unref();
            app.quit();
            return true;
        }

        // Existing behavior: portable .exe installer
        const child = child_process.spawn(updateDownloadPath, [], {
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
        app.quit();
        return true;
    }
    return false;
});
// --- END AUTO UPDATER IPC HANDLERS ---

// POS Terminal Sinyal IPC Handler
ipcMain.handle('pos:sendPaymentSignal', async (event, amountTl) => {
    const posMode = db.getSetting('pos_connection_type', 'ethernet');
    const posIp = db.getSetting('pos_ip_address', '192.168.1.75');
    const posPort = db.getSetting('pos_network_port', '8002');
    const posTimeout = db.getSetting('pos_timeout_sec', '45');

    return await posTerminal.sendPaymentSignal(amountTl, {
        mode: posMode,
        ip: posIp,
        port: posPort,
        timeout: posTimeout
    });
});

ipcMain.handle('pos:pairPosTerminal', async (event, params) => {
    if (params && params.ip) {
        db.setSetting('pc_ip_address', params.ip);
        db.setSetting('pos_network_port', params.port || '59000');
        if (params.serialNo) db.setSetting('pos_serial_no', params.serialNo);
    }
    return await posTerminal.pairPosTerminal(params);
});

ipcMain.handle('pos:testPosTerminal', async (event, params) => {
    return await posTerminal.testPosTerminal(params);
});

// Window Controls
ipcMain.on('app:minimize', () => {
    if (mainWindow) mainWindow.minimize();
});
ipcMain.on('app:maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});
ipcMain.on('app:close', () => {
    if (mainWindow) mainWindow.close();
});

// BUG-25 FIX: Added missing setBadgeCount IPC handler
ipcMain.on('app:setBadgeCount', (event, count) => {
    if (process.platform === 'darwin') {
        app.dock.setBadge(count > 0 ? String(count) : '');
    }
});

// Thermal Printer Silent Print IPC
ipcMain.handle('printer:printThermalReceipt', async (event, htmlContent) => {
    return new Promise((resolve) => {
        try {
            let printWindow = new BrowserWindow({
                show: false,
                webPreferences: { nodeIntegration: false }
            });

            const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        @page { margin: 0; size: auto; }
                        body {
                            font-family: 'Courier New', Courier, monospace;
                            width: 80mm;
                            margin: 0;
                            padding: 5px;
                            color: #000;
                            background: #fff;
                            font-size: 12px;
                        }
                        .center { text-align: center; }
                        .right { text-align: right; }
                        .bold { font-weight: bold; }
                        .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { text-align: left; padding: 2px 0; font-size: 11px; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
                </html>
            `;

            printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`).then(() => {
                // BUG-10 FIX: Read thermal printer name from settings, fallback to default
                const thermalPrinterName = db.getSetting('thermal_printer_name', '').trim();
                printWindow.webContents.print({
                    silent: true,
                    printBackground: true,
                    deviceName: thermalPrinterName || ''
                }, (success, errorType) => {
                    const result = success
                        ? { success: true }
                        : { success: false, error: errorType || 'Print failed' };
                    if (printWindow && !printWindow.isDestroyed()) {
                        printWindow.close();
                    }
                    printWindow = null;
                    resolve(result);
                });
            }).catch((err) => {
                if (printWindow && !printWindow.isDestroyed()) printWindow.close();
                printWindow = null;
                resolve({ success: false, error: err.message });
            });
        } catch (err) {
            console.error('Thermal Print Error:', err);
            resolve({ success: false, error: err.message });
        }
    });
});

// Gemini AI Invoice Scanner IPC
ipcMain.handle('ai:analyzeInvoiceImages', async (event, base64Images, providedApiKey) => {
    try {
        const activeProvider = db.getSetting('active_ai_provider', 'gemini');
        const openrouterApiKey = db.getSetting('openrouter_api_key', '');

        let apiKey = '';
        if (activeProvider === 'openrouter') {
            apiKey = openrouterApiKey;
            if (!apiKey) apiKey = providedApiKey || db.getSetting('gemini_api_key', ''); // fallback to gemini key if they put it there
        } else {
            apiKey = providedApiKey || db.getSetting('gemini_api_key', '');
            if (!apiKey) apiKey = openrouterApiKey; // fallback
        }

        if (!apiKey) {
            return {
                success: false,
                message: 'API Anahtarı bulunamadı. Ayarlar (F7) ekranından geçerli bir API Anahtarı girin.',
                items: [],
                invoice_service_fee: 0,
                total_quantity: 0,
                service_fee_per_unit: 0
            };
        }

        const initialMargins = db.getCategoryMargins();
        const categoryList = Object.keys(initialMargins).join(', ');

        // Read custom rules and prompt text from DB settings
        let customRulesStr = db.getSetting('ai_custom_rules', '');
        let customRules = [];
        try {
            if (customRulesStr) customRules = JSON.parse(customRulesStr);
        } catch (e) { }

        let customPromptText = db.getSetting('ai_custom_prompt_text', '');

        let rulesPromptText = '';
        if (Array.isArray(customRules) && customRules.length > 0) {
            rulesPromptText = '\n        KULLANICIYA ÖZEL KATEGORİ DAĞITIM KURALLARI:\n' +
                customRules.map(r => `        - Ürün veya marka adında "${r.keyword}" geçerse kategorisini KESİNLİKLE "${r.category}" yap.`).join('\n');
        }

        let userPromptAddon = '';
        if (customPromptText && customPromptText.trim()) {
            userPromptAddon = `\n        KULLANICIYA ÖZEL EK TALİMATLAR:\n        ${customPromptText.trim()}\n`;
        }

        const isEnsembleMode = db.getSetting('ai_ensemble_mode', 'false') === 'true';
        const model1Name = db.getSetting('gemini_model_name', '').trim() || 'anthropic/claude-sonnet-5';
        const model2Name = db.getSetting('gemini_model_2', '').trim() || 'anthropic/claude-sonnet-5';
        const model3Name = db.getSetting('gemini_model_3', '').trim() || 'anthropic/claude-sonnet-5';
        const mergerModelName = db.getSetting('gemini_merger_model', '').trim() || 'anthropic/claude-sonnet-5';

        let ai = null;
        if (activeProvider !== 'openrouter') {
            ai = new GoogleGenAI({ apiKey });
        }

        // EFFICIENCY: Only send id+name for product matching. Barcode/price/category
        // are not used by the AI for matching — removing them saves ~3500 tokens on a 500-product store.
        const dbProductsStr = JSON.stringify(db.getAllProducts('', 'Tümü').map(p => ({
            id: p.id,
            n: p.name.substring(0, 40)
        })));

        const prompt = `
        Bu bir petshop ürün stok faturası veya alım fişidir (e-Arşiv / e-Fatura). Gönderilen dosya (PDF veya Görsel) tek bir faturanın parçaları veya BİRDEN FAZLA SAYFASI olabilir.
        ÖNEMLİ DİKKAT: EĞER BU DOSYA BİR PDF İSE LÜTFEN TÜM SAYFALARI (1., 2., 3. vb. SON SAYFAYA KADAR) DİKKATLİCE İNCELE VE TÜM SAYFALARDAKİ ÜRÜNLERİ ÇIKART. ASLA SADECE İLK SAYFAYA BAKIP İŞLEMİ YARIDA KESME!
        Gönderilen belgelerde YÜZLERCE ÜRÜN KALEMİ olabilir. Hiçbir ürünü atlama (DO NOT TRUNCATE).

        ÜRÜN ADI TEMİZLEME KURALI:
        - Ürün adlarındaki gereksiz boşlukları kaldır. Tüm BÜYÜK HARF isimleri Title Case'e çevir.
        - Stok kodu gibi sayısal kodları ürün adından çıkar. Kısaltmaları genişlet ("GR" → "gr", vs).

        HİZMET/KARGO SATIRI TESPİT KURALLARI (IMP-02 - Genişletilmiş):
        Aşağıdaki kelimelerden herhangi birini içeren satırları Hizmet Satırı Mı: TRUE yap:
        - Türkçe: "hizmet", "kargo", "nakliye", "navlun", "işçilik", "kurye", "taşıma ücreti",
          "ambalaj", "sigorta", "komisyon", "iade farkı", "indirim", "iskonto", "masraf"
        - Kısaltmalar: "HB.", "KB.", "NKL.", "NAVL."
        - Negatif tutarlı satırlar (birim fiyat negatif) → kesinlikle TRUE

        KDV ORANI KURALI (IMP-03 - Katı):
        - Faturada KDV oranı görünmüyorsa Türkiye'deki yasal varsayıma göre belirle:
          • Mama / gıda ürünleri: 20 (2024 sonrası)
          • Aksesuar / oyuncak: 10
          • İlaç / sağlık: 10
        - ASLA null döndürme. Belirsizse 20 kullan.
        - KDV oranı kesinlikle tamsayı olmalı: 1, 10, 20 (not 0.10, not "20%")

        ÇOKLU PAKET KURALI (IMP-05):
        - "12x85gr" veya "12*85" gibi formatlar → Adet=faturadaki miktarsa onu bırak, isminde formatı bırak
        - Faturada "Miktar" sütununda 1 yazıyorsa ve isimde "12x" varsa → Adet=1 bırak
        - "195g*12*" formatı → Adet=faturadaki sayı, ismi olduğu gibi bırak

        SÜTUN DÜZENİ VE FORMAT:
        Kesinlikle DÜZ METİN (CSV/TSV) formatında çıktı vereceksin. İlk satıra faturanın genel Hizmet/Kargo Bedelini "SERVICE_FEE=..." formatında yaz.
        Ardından [ITEMS_START] yaz, altına ürünleri "Adı|Adet|Birim Fiyat|KDV|Birim|Kategori|Hizmet Satırı Mı(TRUE/FALSE)|Eşleşen_Urun_ID" şeklinde | ile ayırarak listele, ve en sona [ITEMS_END] yaz.

        HAYATİ KURAL (KESİN UYARI):
        - Çıktında KESİNLİKLE "Item 1", "* Cleaned Name", "Birim Fiyat:" gibi açıklamalar, listeler veya ara adımlar (Chain of Thought) YAZMA!
        - SADECE ve SADECE "| " ile ayrılmış tek bir satır veri yazacaksın. Her bir ürün kalemi SADECE 1 SATIR olmalı.
        - Faturadaki TÜM ürünleri sonuna kadar çıkart. En ufak bir kısaltma (truncation) veya tembellik yapma.
        
        SÜTUN DETAYLARI:
        1. Adı: Faturada yazan tam ad.
        2. Adet: Miktar sayısı (Çoklu paket kuralına bakınız).
        3. Birim Fiyat: KDV HARİÇ birim fiyat (noktalı ondalık, örn 183.27).
        4. KDV: Tamsayı olarak % oranı (KDV kuralına bakınız). Belirsizse 20 kullan.
        5. Birim: Adet, Kg, Kutu vs.
        6. Kategori: Şu aktif kategorilerden birini seç: [${categoryList}].${rulesPromptText}${userPromptAddon}
        7. Hizmet Satırı Mı: Hizmet/Kargo kuralına göre TRUE veya FALSE.
        8. Eşleşen_Urun_ID: Sadece aşağıdaki veritabanı listesinden ürün adı eşleşirse o ürünün "id" değerini yaz. Eşleşmezse "null" bırak.

        VERİTABANINDAKİ MEVCUT ÜRÜNLER LİSTESİ:
        ${dbProductsStr}

        Örnek Çıktı Formatı:
        SERVICE_FEE=0.0
        [ITEMS_START]
        Pro Plan Somonlu Kedi Maması 10kg|2|1500.50|20|Adet|Mama|FALSE|45
        Nakliye Bedeli|1|150.00|20|Adet|Genel|TRUE|null
        [ITEMS_END]
        `;

        // EFFICIENCY: batchSize 5 → fewer API calls → less prompt+DB overhead per invoice
        const batchSize = 5;
        const imageBatches = [];
        for (let i = 0; i < base64Images.length; i += batchSize) {
            imageBatches.push(base64Images.slice(i, i + batchSize));
        }

        let rawItems = [];
        let extractedServiceFee = 0.0;

        const parseCSVResponse = (textStr) => {
            if (!textStr || typeof textStr !== 'string') return null;

            // Remove markdown code blocks if any
            let clean = textStr.trim();
            if (clean.startsWith('```csv')) clean = clean.substring(6);
            if (clean.startsWith('```')) clean = clean.substring(3);
            if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);

            let lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

            let invoice_service_fee_total = 0.0;
            let items = [];
            let inItems = false;

            for (let line of lines) {
                if (line.startsWith('SERVICE_FEE=')) {
                    invoice_service_fee_total = parseFloat(line.split('=')[1]) || 0.0;
                } else if (line === '[ITEMS_START]') {
                    inItems = true;
                } else if (line === '[ITEMS_END]') {
                    inItems = false;
                } else if (inItems) {
                    const parts = line.split('|');
                    if (parts.length >= 7) {
                        items.push({
                            name: parts[0].trim(),
                            quantity: parseFloat(parts[1]) || 1,
                            unit_price_excl_tax: parseFloat(parts[2]) || 0.0,
                            vat_rate: parseFloat(parts[3]) || 20,
                            unit: parts[4].trim(),
                            category: parts[5].trim(),
                            is_service_line: parts[6].trim().toUpperCase() === 'TRUE',
                            matched_product_id: (parts[7] && parts[7].trim().toLowerCase() !== 'null') ? parseInt(parts[7].trim()) : null
                        });
                    }
                }
            }

            return { invoice_service_fee_total, items };
        };

        for (let batchIndex = 0; batchIndex < imageBatches.length; batchIndex++) {
            const batch = imageBatches[batchIndex];

            // Send progress update to frontend (IMP-12)
            try {
                event.sender.send('ai:progress', {
                    currentBatch: batchIndex + 1,
                    totalBatches: imageBatches.length,
                    message: `Batch ${batchIndex + 1} / ${imageBatches.length} işleniyor...`
                });
            } catch (e) { }

            const contents = [];

            // Format request based on provider
            if (activeProvider === 'openrouter') {
                // PDFs are pre-rendered to per-page JPEGs on the frontend.
                // All entries here are always images (jpeg/png/webp/gif).
                for (const fileBase64 of batch) {
                    let mimeType = 'image/jpeg';
                    let cleanData = fileBase64;
                    if (fileBase64.startsWith('data:')) {
                        const parts = fileBase64.split(';');
                        mimeType = parts[0].replace('data:', '').trim();
                        cleanData = parts[1].replace(/^base64,/, '');
                    } else {
                        cleanData = cleanData.replace(/^data:[^;]+;base64,/, '');
                    }
                    contents.push({
                        type: 'image_url',
                        image_url: { url: `data:${mimeType};base64,${cleanData}` }
                    });
                }
                contents.push({ type: 'text', text: prompt });
            } else {
                for (const fileBase64 of batch) {
                    let mimeType = 'image/jpeg';
                    let cleanData = fileBase64;

                    if (fileBase64.startsWith('data:')) {
                        const parts = fileBase64.split(';');
                        if (parts.length >= 2) {
                            mimeType = parts[0].replace('data:', '').trim();
                            cleanData = parts[1].replace(/^base64,/, '');
                        }
                    }

                    cleanData = cleanData.replace(/^data:[^;]+;base64,/, '');

                    try {
                        const imgBuffer = Buffer.from(cleanData, 'base64');
                        let nImage = nativeImage.createFromBuffer(imgBuffer);
                        if (!nImage.isEmpty()) {
                            const size = nImage.getSize();
                            const maxWidth = 1200;
                            if (size.width > maxWidth) {
                                nImage = nImage.resize({ width: maxWidth });
                            }
                            const optimizedBuffer = nImage.toJPEG(80);
                            cleanData = optimizedBuffer.toString('base64');
                            mimeType = 'image/jpeg';
                        }
                    } catch (err) {
                        console.error('[AI Optimization] Failed to optimize image:', err.message);
                    }

                    contents.push({
                        inlineData: {
                            mimeType: mimeType || 'image/jpeg',
                            data: cleanData
                        }
                    });
                }
                contents.push(prompt);
            }

            const retryGenerateContent = async (requestedModel, promptContents, maxRetries = 2) => {
                if (activeProvider === 'openrouter') {
                    for (let i = 0; i <= maxRetries; i++) {
                        try {
                            // OpenRouter requires provider/model format. Latest Claude Sonnet:
                            const openRouterModel = 'anthropic/claude-sonnet-5';
                            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${apiKey}`,
                                    'Content-Type': 'application/json',
                                    'HTTP-Referer': 'http://localhost:3000',
                                    'X-Title': 'Nextjs-Kasa-POS'
                                },
                                body: JSON.stringify({
                                    model: openRouterModel,
                                    messages: [
                                        {
                                            role: 'user',
                                            content: promptContents
                                        }
                                    ],
                                    temperature: 0.1
                                })
                            });

                            const data = await res.json();
                            if (!res.ok || data.error) {
                                console.error(`[OpenRouter DEBUG] HTTP ${res.status}, full response:`, JSON.stringify(data, null, 2));
                                const errMsg = data.error ? (data.error.message || JSON.stringify(data.error)) : `HTTP ${res.status}: ${JSON.stringify(data)}`;
                                throw new Error(errMsg);
                            }
                            if (data.choices && data.choices[0] && data.choices[0].message) {
                                return data.choices[0].message.content;
                            }
                            return null;
                        } catch (err) {
                            console.error(`OpenRouter failed (attempt ${i + 1}/${maxRetries + 1}):`, err.message);
                            if (i === maxRetries) break;
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                    }
                    return null;
                }

                // OpenRouter/Anthropic fallback (BUG-24 FIX)
                const candidates = ['anthropic/claude-sonnet-5'];
                const uniqueCandidates = ['anthropic/claude-sonnet-5'];

                for (const candModel of uniqueCandidates) {
                    for (let i = 0; i <= maxRetries; i++) {
                        try {
                            const res = await ai.models.generateContent({
                                model: candModel,
                                contents: promptContents,
                                config: {
                                    responseMimeType: 'text/plain',
                                    temperature: 0.1,
                                    maxOutputTokens: 8192
                                }
                            });
                            if (res && res.text) return res.text;
                        } catch (err) {
                            console.error(`Model ${candModel} failed (attempt ${i + 1}/${maxRetries + 1}):`, err.message);
                            if (err.message && (err.message.includes('not found') || err.message.includes('404'))) {
                                console.warn(`Model ${candModel} not found, switching to next candidate model.`);
                                break;
                            }
                            if (i === maxRetries) break;
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                    }
                }
                return null;
            };

            let responseText = "";

            if (isEnsembleMode) {
                const results = await Promise.all([
                    retryGenerateContent(model1Name, contents),
                    retryGenerateContent(model2Name, contents),
                    retryGenerateContent(model3Name, contents)
                ]);

                const validResults = [];
                for (const r of results) {
                    if (!r) continue;
                    const parsedObj = parseCSVResponse(r);
                    if (parsedObj && parsedObj.items && parsedObj.items.length > 0) {
                        validResults.push(r);
                    } else {
                        console.warn('Ensemble model returned invalid CSV, skipping.');
                    }
                }

                if (validResults.length === 0) {
                    // BUG-11 FIX: Don't throw — log and continue with next batch
                    console.warn('[AI Ensemble] All models failed for this batch, skipping.');
                    continue;
                }

                if (validResults.length === 1) {
                    responseText = validResults[0];
                } else {
                    // IMP-07: Improved merger prompt with explicit priority rules
                    const mergerPrompt = `Aşağıda ${validResults.length} farklı AI modelinin aynı faturayı okumasından elde edilen CSV/Düz Metin sonuçlar var.

MERGER KURALLARI (Öncelik Sırasıyla):
1. En yüksek ürün satırı sayısını döndüren modeli BASE al.
2. Diğer modellerde FAZLADAN görünen ürünleri BASE'e ekle.
3. Fiyat çelişkilerinde ORTANCA değeri al (medyan).
4. KDV oranı çelişkilerinde çoğunluğun oyunu al.
5. Hizmet Satırı Mı alanı için: herhangi bir modelde TRUE ise kesinlikle TRUE yap.
6. ASLA ürün kalemlerini birleştirme, azaltma veya atlama.
7. SADECE birleştirilmiş nihai veriyi aynı CSV formatında (SERVICE_FEE=... ve [ITEMS_START]...[ITEMS_END] kullanarak) döndür. Ekstra açıklama yazma.

Sonuçlar:
${validResults.map((r, i) => `--- Model ${i + 1} ---\n${r}`).join('\n\n')}`;

                    const mergerRes = await retryGenerateContent(mergerModelName, [mergerPrompt]);
                    if (!mergerRes) {
                        responseText = validResults[0];
                    } else {
                        responseText = mergerRes;
                    }
                }
            } else {
                const res = await retryGenerateContent(model1Name, contents);
                if (!res) {
                    throw new Error("AI Modeli yanıt veremedi. Lütfen API limitlerinizi kontrol edin.");
                }
                responseText = res;
            }

            // --- AI DEBUG LOG ---
            try {
                const fs = require('fs');
                const path = require('path');
                const logPath = path.join(__dirname, '..', 'ai-debug.log');
                const logData = `[${new Date().toISOString()}] Model used: ${model1Name} (or ensemble)\nRAW OUTPUT:\n${responseText}\n\n`;
                fs.appendFileSync(logPath, logData);
            } catch (e) {
                console.error("Failed to write debug log", e);
            }
            // --------------------

            try {
                const parsed = parseCSVResponse(responseText);
                if (parsed) {
                    if (parsed.items && Array.isArray(parsed.items)) {
                        rawItems = rawItems.concat(parsed.items);
                    }
                    if (parsed.invoice_service_fee_total) {
                        extractedServiceFee += parseFloat(parsed.invoice_service_fee_total);
                    }
                } else {
                    console.warn("Batch returned unparseable CSV, skipping batch.");
                }
            } catch (e) {
                console.error("Batch processing error:", e.message);
            }
        }

        // Process service lines vs sellable products
        let serviceLinesFeeTotal = 0.0;
        const productItems = [];

        for (const item of rawItems) {
            const itemName = String(item.name || '').trim();
            const lowerName = itemName.toLowerCase();
            const isService = item.is_service_line === true ||
                lowerName.includes('hizmet bedeli') ||
                lowerName.includes('kargo bedeli') ||
                lowerName.includes('nakliye') ||
                lowerName.includes('navlun');

            const qty = parseFloat(item.quantity || 1);
            const priceExclTax = parseFloat(item.unit_price_excl_tax || item.cost_price || 0.0);
            const vatRate = parseFloat(item.vat_rate !== undefined ? item.vat_rate : 20.0);

            if (isService) {
                const lineTotalWithTax = (priceExclTax * qty) * (1 + vatRate / 100);
                serviceLinesFeeTotal += lineTotalWithTax;
            } else {
                let matchedCategory = String(item.category || 'Genel').trim();

                // Fallback: Check custom keyword category rules
                if (Array.isArray(customRules) && customRules.length > 0) {
                    for (const rule of customRules) {
                        if (rule.keyword && rule.category && lowerName.includes(rule.keyword.toLowerCase())) {
                            matchedCategory = rule.category;
                            break;
                        }
                    }
                }

                productItems.push({
                    name: itemName || 'Bilinmeyen Ürün',
                    category: matchedCategory,
                    barcode: item.barcode || null,
                    matched_product_id: item.matched_product_id || null,
                    quantity: qty,
                    unit_price_excl_tax: priceExclTax,
                    vat_rate: vatRate,
                    unit: String(item.unit || 'Adet').trim()
                });
            }
        }

        const totalInvoiceServiceFee = Math.round((extractedServiceFee + serviceLinesFeeTotal) * 100) / 100;
        const totalProductQuantity = productItems.reduce((acc, i) => acc + i.quantity, 0);
        const serviceFeePerUnit = totalProductQuantity > 0 ? (totalInvoiceServiceFee / totalProductQuantity) : 0;

        const cleanedItems = productItems.map(item => {
            const category = item.category || 'Genel';

            // Automatically persist AI-created category in database
            db.addCategoryIfNotExist(category, 30.0);

            const currentMargins = db.getCategoryMargins();
            const margin = currentMargins[category] !== undefined ? parseFloat(currentMargins[category]) : 30.0;

            // Cost price keeps exact kuruş precision (e.g. 147.43 TL)
            const unitCostWithTax = Math.round(item.unit_price_excl_tax * (1 + item.vat_rate / 100) * 100) / 100;
            const effectiveCost = Math.round((unitCostWithTax + serviceFeePerUnit) * 100) / 100;

            // Sale price rounds to 1 TL integer (e.g. 869.51 -> 870 TL, 869.49 -> 869 TL)
            const rawSalePrice = effectiveCost > 0 ? effectiveCost * (1 + margin / 100) : 0.0;
            const salePrice = Number((rawSalePrice).toFixed(2));

            return {
                name: item.name,
                category: category,
                barcode: item.barcode,
                matched_product_id: item.matched_product_id,
                quantity: item.quantity,
                unit_price_excl_tax: item.unit_price_excl_tax,
                vat_rate: item.vat_rate,
                unit_cost_with_tax: unitCostWithTax,
                effective_cost: effectiveCost,
                cost_price: effectiveCost, // Backward compatibility
                sale_price: salePrice,
                unit: item.unit
            };
        });

        return {
            success: true,
            message: `Başarıyla ${base64Images.length} dosya/görselden ${cleanedItems.length} adet ürün kalemi okundu. (Hizmet Bedeli: ${totalInvoiceServiceFee.toFixed(2)} TL)`,
            invoice_service_fee: totalInvoiceServiceFee,
            total_quantity: totalProductQuantity,
            service_fee_per_unit: Math.round(serviceFeePerUnit * 100) / 100,
            items: cleanedItems
        };
    } catch (err) {
        console.error('Gemini AI Analysis Error:', err);
        return {
            success: false,
            message: `AI Analiz Hatası: ${err.message}`,
            invoice_service_fee: 0,
            total_quantity: 0,
            service_fee_per_unit: 0,
            items: []
        };
    }
});

// Gemini AI Double-Check / Fact-Check IPC
ipcMain.handle('ai:doubleCheckInvoice', async (event, base64Images, providedApiKey) => {
    try {
        const apiKey = providedApiKey || db.getSetting('gemini_api_key', '');
        if (!apiKey) {
            return {
                success: false,
                message: 'Gemini API Anahtarı bulunamadı. Ayarlar (F7) ekranından geçerli bir API Anahtarı girin.',
                report: 'Hata: API anahtarı tanımlanmamış.',
                summary: {},
                items: []
            };
        }

        const selectedModelName = db.getSetting('gemini_model_name', '').trim() || 'gemini-2.5-flash'; // BUG-01 FIX: was 'gemini-3.0-flash' (non-existent model)
        const ai = new GoogleGenAI({ apiKey });

        const contents = [];
        for (const fileBase64 of base64Images) {
            let mimeType = 'image/jpeg';
            let cleanData = fileBase64;

            if (fileBase64.startsWith('data:')) {
                const parts = fileBase64.split(';');
                if (parts.length >= 2) {
                    mimeType = parts[0].replace('data:', '').trim();
                    cleanData = parts[1].replace(/^base64,/, '');
                }
            }

            cleanData = cleanData.replace(/^data:[^;]+;base64,/, '');
            contents.push({
                inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: cleanData
                }
            });
        }

        const prompt = `
        Bu bir petshop ürün stok faturası veya alım fişidir. Gönderilen belge bir PDF veya görsel olabilir. PDF ise LÜTFEN TÜM SAYFALARINDAKİ (1., 2. vb.) ürünleri, görsel ise tüm görsellerdeki ürün kalemlerini okuyup aşağıdaki JSON formatında liste olarak çıkart. Hiçbir ürünü atlama.
        JSON Şeması:
        {
            "items": [
                {
                    "name": "Ürün Adı",
                    "category": "Mama",
                    "barcode": null,
                    "quantity": 1,
                    "unit_price_excl_tax": 183.27,
                    "vat_rate": 20,
                    "unit": "Adet"
                }
            ]
        }
        `;

        contents.push(prompt);

        const response = await ai.models.generateContent({
            model: selectedModelName,
            contents: contents,
            config: {
                responseMimeType: 'application/json',
                temperature: 0.1
            }
        });

        let responseText = response.text.trim();
        if (responseText.startsWith('```json')) responseText = responseText.substring(7);
        if (responseText.startsWith('```')) responseText = responseText.substring(3);
        if (responseText.endsWith('```')) responseText = responseText.substring(0, responseText.length - 3);
        responseText = responseText.trim();

        const parsed = JSON.parse(responseText);
        const invoiceItems = parsed.items || [];

        // BUG-30 FIX: Do not pull all products/sales into memory. Only fetch recent sales 
        // (last 30 days) and only products that are actually matched or all barcodes.
        
        // Fetch only recent sales for soldQty checking
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 30);
        const recentDateStr = recentDate.toISOString().substring(0, 10);
        
        const dbSalesRaw = db.queryAll("SELECT id, status FROM sales WHERE created_at >= ?", [`${recentDateStr} 00:00:00`]);
        const activeSaleIds = new Set(
            dbSalesRaw
                .filter(s => s.status !== db.REFUNDED_STATUS && s.status !== '\u0130ade Edildi' && s.status !== 'Iade Edildi' && s.status !== 'Ä°ade Edildi')
                .map(s => s.id)
        );
        
        // Fetch only sale items for the active recent sales
        let dbSaleItems = [];
        if (activeSaleIds.size > 0) {
            const idsList = Array.from(activeSaleIds).join(',');
            dbSaleItems = db.queryAll(`SELECT product_id, quantity, sale_id FROM sale_items WHERE sale_id IN (${idsList})`);
        }

        // We still need all products for fuzzy matching since AI names might not match perfectly.
        // But we only fetch required columns to save memory.
        const dbProducts = db.queryAll("SELECT id, name, category, barcode, cost_price, stock_quantity FROM products");

        const normalizeName = (str) => {
            return (str || '')
                .toLowerCase()
                .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ğ/g, 'g')
                .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o')
                .replace(/ç/g, 'c').replace(/[^a-z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ').trim();
        };

        let matchedCount = 0;
        let priceChangeCount = 0;
        let newProductCount = 0;
        let soldProductCount = 0;
        const checkDetails = [];

        const extractGrammages = (str) => {
            if (!str) return [];
            const norm = normalizeName(str).replace(/,/g, '.');
            const matches = norm.match(/\b(\d+(?:\.\d+)?)\s*(kg|g|gr|gram|ml|l|lt)\b/g);
            if (!matches) return [];
            return matches.map(m => {
                const valMatch = m.match(/\d+(?:\.\d+)?/);
                const unitMatch = m.match(/[a-z]+/);
                if (!valMatch || !unitMatch) return m;
                const val = parseFloat(valMatch[0]);
                let unit = unitMatch[0];
                if (unit === 'gr' || unit === 'gram') unit = 'g';
                if (unit === 'lt') unit = 'l';
                return `${val}${unit}`;
            });
        };

        const extractFlavors = (str) => {
            if (!str) return [];
            const norm = normalizeName(str);
            const map = {
                tavuk: 'tavuk', tavuklu: 'tavuk',
                somon: 'somon', somonlu: 'somon',
                kuzu: 'kuzu', kuzulu: 'kuzu',
                ordek: 'ordek', ordekli: 'ordek',
                hindi: 'hindi', hindili: 'hindi',
                dana: 'dana', danali: 'dana',
                sigir: 'sigir', sigirli: 'sigir',
                balik: 'balik', balikli: 'balik',
                hamsi: 'hamsi', hamsili: 'hamsi',
                karides: 'karides', karidesli: 'karides'
            };
            const found = [];
            const words = norm.split(/\s+/);
            for (const w of words) {
                if (map[w] && !found.includes(map[w])) found.push(map[w]);
            }
            return found;
        };

        const isValidVariantMatch = (name1, name2) => {
            const grams1 = extractGrammages(name1);
            const grams2 = extractGrammages(name2);
            if (grams1.length > 0 && grams2.length > 0) {
                if (grams1.sort().join(',') !== grams2.sort().join(',')) {
                    return false;
                }
            }
            const flavors1 = extractFlavors(name1);
            const flavors2 = extractFlavors(name2);
            if (flavors1.length > 0 && flavors2.length > 0) {
                if (flavors1.sort().join(',') !== flavors2.sort().join(',')) {
                    return false;
                }
            }
            return true;
        };

        for (const item of invoiceItems) {
            const normInvName = normalizeName(item.name);
            let matchedProd = null;

            if (item.barcode) {
                matchedProd = dbProducts.find(p => p.barcode && p.barcode.trim() === item.barcode.trim());
            }

            if (!matchedProd && normInvName) {
                matchedProd = dbProducts.find(p => normalizeName(p.name) === normInvName);
                if (!matchedProd) {
                    const tokens = normInvName.split(' ').filter(t => t.length > 1);
                    if (tokens.length >= 2) {
                        let best = null;
                        let maxCnt = 0;
                        for (const p of dbProducts) {
                            if (!isValidVariantMatch(item.name, p.name)) continue;
                            const normP = normalizeName(p.name);
                            const pTokens = normP.split(' ').filter(t => t.length > 1);
                            const cnt = tokens.filter(tok => pTokens.includes(tok)).length;
                            if (cnt >= Math.ceil(tokens.length * 0.90) && cnt > maxCnt) {
                                maxCnt = cnt;
                                best = p;
                            }
                        }
                        matchedProd = best;
                    }
                }
            }

            const invCostExcl = parseFloat(item.unit_price_excl_tax || 0);
            const vat = parseFloat(item.vat_rate || 20);
            const invCostWithTax = Math.round(invCostExcl * (1 + vat / 100) * 100) / 100;

            if (matchedProd) {
                matchedCount++;

                const soldQty = dbSaleItems
                    .filter(si => si.product_id === matchedProd.id && activeSaleIds.has(si.sale_id))
                    .reduce((sum, si) => sum + (parseFloat(si.quantity) || 0), 0);

                if (soldQty > 0) soldProductCount++;

                const currentCost = matchedProd.cost_price || 0;
                const costDiff = Math.round((invCostWithTax - currentCost) * 100) / 100;
                const hasPriceChange = currentCost > 0 && Math.abs(costDiff) > 0.05;

                if (hasPriceChange) priceChangeCount++;

                let note = '';
                if (hasPriceChange) {
                    note = `${costDiff > 0 ? '+' : ''}${costDiff.toFixed(2)} TL fark (${currentCost.toFixed(2)} ➔ ${invCostWithTax.toFixed(2)} TL)`;
                } else {
                    note = `Maliyet aynı (${currentCost.toFixed(2)} TL)`;
                }

                checkDetails.push({
                    name: item.name,
                    dbName: matchedProd.name,
                    category: matchedProd.category || item.category || 'Genel',
                    barcode: matchedProd.barcode || null,
                    quantity: parseFloat(item.quantity || 1),
                    status: hasPriceChange ? 'PRICE_CHANGE' : 'MATCHED',
                    statusLabel: hasPriceChange ? 'Fiyat Değişti' : 'Stok Uyumlu',
                    dbStock: matchedProd.stock_quantity,
                    soldQty,
                    currentCost,
                    invCost: invCostWithTax,
                    priceChange: costDiff,
                    note
                });
            } else {
                newProductCount++;
                checkDetails.push({
                    name: item.name,
                    dbName: '-',
                    category: item.category || 'Genel',
                    barcode: null,
                    quantity: parseFloat(item.quantity || 1),
                    status: 'NEW',
                    statusLabel: 'Yeni Ürün',
                    dbStock: 0,
                    soldQty: 0,
                    currentCost: 0,
                    invCost: invCostWithTax,
                    priceChange: 0,
                    note: 'Yeni ürün kaydı'
                });
            }
        }

        let reportLines = [];
        reportLines.push(`=== DOUBLE-CHECK & ÇAPRAZ KONTROL RAPORU ===`);
        reportLines.push(`• Tarih/Saat: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}`);
        reportLines.push(`• Kullanılan AI Modeli: ${selectedModelName}`);
        reportLines.push(`• Toplam Taranan Kalem: ${invoiceItems.length} Adet`);
        reportLines.push(`• Veritabanı Eşleşen: ${matchedCount} | Yeni Ürün: ${newProductCount}`);
        reportLines.push(`• Satışı Yapılmış Ürünler: ${soldProductCount} Adet (POS satışları stok eksiği sayılmamıştır)`);
        reportLines.push(`• Fiyat Değişimi Tespit Edilen: ${priceChangeCount} Adet`);
        reportLines.push(`--------------------------------------------------`);
        reportLines.push(`DETAYLI FACT-CHECK SONUÇLARI:\n`);

        for (const d of checkDetails) {
            if (d.status === 'MATCHED') {
                reportLines.push(`✓ [EŞLEŞTİ] ${d.name}`);
                if (d.name !== d.dbName) {
                    reportLines.push(`   * Veritabanındaki Adı: ${d.dbName} (Elle isim değişikliği tespit edildi, uyumsuzluk sayılmadı)`);
                }
                reportLines.push(`   * ${d.note}\n`);
            } else {
                reportLines.push(`+ [YENİ ÜRÜN] ${d.name} (${d.invCost.toFixed(2)} TL) - Kaydı henüz veritabanında yok.\n`);
            }
        }

        return {
            success: true,
            message: `Double-Check başarıyla tamamlandı. (${matchedCount} eşleşen, ${priceChangeCount} fiyat değişimi)`,
            report: reportLines.join('\n'),
            summary: {
                totalChecked: invoiceItems.length,
                matchedCount,
                newProductCount,
                soldProductCount,
                priceChangeCount
            },
            items: checkDetails
        };
    } catch (err) {
        console.error('Double Check Error:', err);
        return {
            success: false,
            message: `Double-Check Hatası: ${err.message}`,
            report: `Hata: ${err.message}`,
            summary: {},
            items: []
        };
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
