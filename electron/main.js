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

async function performDailyBackup() {
    try {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
        const fileName = `pos_system_${dateStr}_${timeStr}.db`;
        
        const backupDir = getLocalBackupDir();
        const targetPath = path.join(backupDir, fileName);
        
        // BUG-05: Flush in-memory DB to disk before copying
        db.save();
        const res = db.exportBackup(targetPath);
        if (res.success) {
            console.log(`[Backup] Daily backup saved to local: ${targetPath}`);
            db.setSetting('last_daily_backup_date', dateStr);
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

ipcMain.handle('updater:check', () => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.github.com',
            path: '/repos/YamanLabs/zuzupetkasa/releases/latest',
            method: 'GET',
            headers: {
                'User-Agent': 'zuzupetkasa-updater'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const release = JSON.parse(data);
                    const currentVersion = app.getVersion() || '2.0.0';
                    const latestVersion = release.tag_name ? release.tag_name.replace('v', '') : null;
                    
                    if (latestVersion && latestVersion !== currentVersion) {
                        const asset = release.assets && release.assets.find(a => a.name.endsWith('.exe'));
                        
                        resolve({
                            hasUpdate: true,
                            currentVersion,
                            latestVersion,
                            releaseNotes: release.body,
                            releaseDate: release.published_at,
                            downloadUrl: asset ? asset.browser_download_url : null,
                            assetSize: asset ? asset.size : 0
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
        const timestamp = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
        const backupFile = path.join(backupFolder, `pos_system_backup_${timestamp}.db`);
        
        const dbPath = path.join(app.getPath('userData'), 'pos_system.db');
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, backupFile);
            console.log('Database backed up for update:', backupFile);
        }

        // 2. DOWNLOAD UPDATE ASSET
        updateDownloadPath = path.join(app.getPath('temp'), `zuzupetkasa_update_${timestamp}.exe`);
        const file = fs.createWriteStream(updateDownloadPath);

        return new Promise((resolve, reject) => {
            const req = https.get(downloadUrl, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    // Follow redirect (GitHub releases redirect to AWS S3)
                    https.get(res.headers.location, handleResponse).on('error', reject);
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
                fs.unlink(updateDownloadPath, () => {});
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
                printWindow.webContents.print({
                    silent: true,
                    printBackground: true,
                    deviceName: ''
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
        const apiKey = providedApiKey || db.getSetting('gemini_api_key', '');
        if (!apiKey) {
            return {
                success: false,
                message: 'Gemini API Anahtarı bulunamadı. Ayarlar (F7) ekranından geçerli bir API Anahtarı girin.',
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
        } catch (e) {}

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
        const model1Name = db.getSetting('gemini_model_name', '').trim() || 'gemini-2.5-flash';
        const model2Name = db.getSetting('gemini_model_2', '').trim() || 'gemini-2.0-flash-lite';
        const model3Name = db.getSetting('gemini_model_3', '').trim() || 'gemini-2.5-pro';
        const mergerModelName = db.getSetting('gemini_merger_model', '').trim() || 'gemini-2.5-flash';

        const ai = new GoogleGenAI({ apiKey });
        
        const allProducts = db.getAllProducts('', 'Tümü').map(p => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode || ''
        }));
        const dbProductsStr = JSON.stringify(allProducts);

        const prompt = `
        Bu bir petshop ürün stok faturası veya alım fişidir (e-Arşiv / e-Fatura). Gönderilen görseller tek bir fatura/fişin parçaları veya ardışık sayfaları olabilir.
        DİKKAT: Gönderilen belgelerde YÜZLERCE ÜRÜN KALEMİ olabilir. Faturadaki her bir satırı (aynı ürün alt alta yazılmış olsa bile) ASLA BİRLEŞTİRME. Gördüğün her satırı, faturada yazdığı tam ismiyle ayrı ayrı, hiçbir kalemi atlamadan ve TEMBELLİK YAPMADAN JSON olarak çıkartmalısın. (DO NOT TRUNCATE)

        FATURA SÜTUNLARI:
        - "name": Ürünün veya Hizmetin Adı ("Mal Hizmet" sütunundan).
        - "quantity": Adet veya Miktar sayısı.
        - "unit_price_excl_tax": Faturadaki KDV HARİÇ birim fiyat ("Birim Fiyat" sütunundan sayısal değer, Örn: 183.27).
        - "vat_rate": KDV Yüzde Oranı ("KDV Oranı" sütunundan sayısal değer, Örn: %20 için 20, %10 için 10, %1 için 1). Faturada yazan KDV oranını tam tespit et.
        - "unit": Birim ('Adet', 'Kg', 'Paket', 'Kutu' vb.).

        HİZMET BEDELİ (KARGO / MASRAF) KURALI:
        - Eğer satır adı "Hizmet Bedeli", "Kargo Bedeli", "Nakliye", "İşçilik", "Kurye" gibi genel fatura masrafı ise "is_service_line": true yap. Normal ürün ise false yap.
        - Varsa fatura altındaki genel Hizmet/Kargo Bedeli toplamını (KDV dahil) "invoice_service_fee_total" alanına yaz. Yoksa 0.0 yaz.

        KATEGORİ KURALI:
        - Veritabanındaki aktif kategoriler: [${categoryList}]
        - Her ürün için öncelikle veritabanındaki kategorilerden birini seç veya ürüne en uygun Türkçe kategoriyi tespit et.${rulesPromptText}${userPromptAddon}

        VERİTABANINDAKİ MEVCUT ÜRÜNLER LİSTESİ:
        ${dbProductsStr}

        EŞLEŞTİRME VE BARKOD KURALI (KESİN UYARI):
        - Faturadaki "Stok Kodu", "Ürün Kodu" sütunlarındaki sayıları veya kodları ASLA "barcode" alanına YAZMA (gerçek bir 13 haneli barkoda %100 benzese bile KESİNLİKLE YAZMA).
        - "barcode" alanını faturadaki görüntülerden okumaya çalışma! Daima null bırak. 
        - SADECE "VERİTABANINDAKİ MEVCUT ÜRÜNLER LİSTESİ" içinde faturadaki ürünün adıyla eşleşen bir ürün bulursan, O ÜRÜNÜN (veritabanındaki) barkodunu yazabilirsin. Eğer veritabanında yoksa kesinlikle null bırak.
        - Okuduğun faturadaki her normal ürün kalemi için "VERİTABANINDAKİ MEVCUT ÜRÜNLER LİSTESİ" içinde mantıksal bir isim eşleşmesi ara. Eşleşirse o ürünün id'sini "matched_product_id" alanına ekle. Eşleşmezse null ver.

        Sadece geçerli bir JSON yanıtı döndür. Başka açıklama veya markdown ekleme.

        JSON Şeması:
        {
            "invoice_service_fee_total": 0.0,
            "items": [
                {
                    "name": "Ürün Adı",
                    "category": "Mama",
                    "barcode": null,
                    "matched_product_id": 123,
                    "quantity": 1,
                    "unit_price_excl_tax": 183.27,
                    "vat_rate": 20,
                    "unit": "Adet",
                    "is_service_line": false
                }
            ]
        }
        `;

        const invoiceResponseSchema = {
            type: "OBJECT",
            properties: {
                invoice_service_fee_total: { type: "NUMBER" },
                items: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            name: { type: "STRING" },
                            category: { type: "STRING" },
                            barcode: { type: "STRING", nullable: true },
                            matched_product_id: { type: "INTEGER", nullable: true },
                            quantity: { type: "NUMBER" },
                            unit_price_excl_tax: { type: "NUMBER" },
                            vat_rate: { type: "NUMBER" },
                            unit: { type: "STRING" },
                            is_service_line: { type: "BOOLEAN" }
                        },
                        required: ["name", "quantity", "unit_price_excl_tax", "vat_rate", "is_service_line"]
                    }
                }
            },
            required: ["invoice_service_fee_total", "items"]
        };

        const batchSize = 3;
        const imageBatches = [];
        for (let i = 0; i < base64Images.length; i += batchSize) {
            imageBatches.push(base64Images.slice(i, i + batchSize));
        }

        let rawItems = [];
        let extractedServiceFee = 0.0;

        const repairAndParseJSON = (jsonStr) => {
            if (!jsonStr || typeof jsonStr !== 'string') return null;
            
            let clean = jsonStr.trim();
            if (clean.startsWith('```json')) clean = clean.substring(7);
            if (clean.startsWith('```')) clean = clean.substring(3);
            if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
            clean = clean.trim();

            try {
                return JSON.parse(clean);
            } catch (e) {}

            clean = clean.replace(/,\s*([\}\]])/g, '$1');
            clean = clean.replace(/[\u0000-\u001F]+/g, ' ');

            try {
                return JSON.parse(clean);
            } catch (e) {}

            let inString = false;
            let isEscaped = false;
            let stack = [];
            let repaired = '';

            for (let i = 0; i < clean.length; i++) {
                const char = clean[i];
                if (isEscaped) {
                    repaired += char;
                    isEscaped = false;
                    continue;
                }
                if (char === '\\') {
                    repaired += char;
                    isEscaped = true;
                    continue;
                }
                if (char === '"') {
                    inString = !inString;
                    repaired += char;
                    continue;
                }
                if (!inString) {
                    if (char === '{' || char === '[') {
                        stack.push(char);
                    } else if (char === '}' || char === ']') {
                        stack.pop();
                    }
                }
                repaired += char;
            }

            if (inString) repaired += '"';
            while (stack.length > 0) {
                const open = stack.pop();
                repaired += (open === '{' ? '}' : ']');
            }

            try {
                return JSON.parse(repaired);
            } catch (e) {}

            try {
                const itemsMatch = clean.match(/"items"\s*:\s*\[([\s\S]*)/);
                if (itemsMatch) {
                    const itemObjects = [];
                    const objectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
                    let match;
                    while ((match = objectRegex.exec(itemsMatch[1])) !== null) {
                        try {
                            itemObjects.push(JSON.parse(match[0]));
                        } catch (err) {}
                    }
                    if (itemObjects.length > 0) {
                        return { invoice_service_fee_total: 0.0, items: itemObjects };
                    }
                }
            } catch (e) {}

            return null;
        };

        for (const batch of imageBatches) {
            const contents = [];
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

                contents.push({
                    inlineData: {
                        mimeType: mimeType || 'image/jpeg',
                        data: cleanData
                    }
                });
            }

            contents.push(prompt);

            const retryGenerateContent = async (requestedModel, promptContents, maxRetries = 2) => {
                const candidates = [requestedModel, 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-2.5-pro'];
                const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));

                for (const candModel of uniqueCandidates) {
                    for (let i = 0; i <= maxRetries; i++) {
                        try {
                            const res = await ai.models.generateContent({
                                model: candModel,
                                contents: promptContents,
                                config: {
                                    responseMimeType: 'application/json',
                                    responseSchema: invoiceResponseSchema,
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
                    const parsedObj = repairAndParseJSON(r);
                    if (parsedObj) {
                        validResults.push(JSON.stringify(parsedObj));
                    } else {
                        console.warn('Ensemble model returned invalid/unrepairable JSON, skipping.');
                    }
                }

                if (validResults.length === 0) {
                    throw new Error("Tüm ensemble (garanti modu) modelleri başarısız oldu veya geçersiz veri döndürdü.");
                }

                if (validResults.length === 1) {
                    responseText = validResults[0];
                } else {
                    const mergerPrompt = `Aşağıda aynı faturanın farklı AI modelleri tarafından okunmuş ${validResults.length} farklı JSON sonucu bulunmaktadır.
Lütfen bu sonuçları karşılaştır, ürün miktarlarını, birim fiyatlarını ve KDV oranlarını çapraz doğrula ve en mantıklı/doğru olan nihai veriyi tek bir JSON olarak oluştur. 
Sonuçlarda yer alan ürün kalemlerini ASLA birbiriyle birleştirme. Faturadaki her satırın ayrı ayrı listelendiğinden emin ol. Hiçbir ürünü atlama (DO NOT TRUNCATE). Aynı JSON yapısına sadık kal.
                    
Sonuçlar:
${validResults.map((r, i) => `--- Model ${i+1} ---\n${r}`).join('\n\n')}`;
                    
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

            try {
                const parsed = repairAndParseJSON(responseText);
                if (parsed) {
                    if (parsed.items && Array.isArray(parsed.items)) {
                        rawItems = rawItems.concat(parsed.items);
                    }
                    if (parsed.invoice_service_fee_total) {
                        extractedServiceFee += parseFloat(parsed.invoice_service_fee_total);
                    }
                } else {
                    console.warn("Batch returned unparseable JSON, skipping batch.");
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
            message: `Başarıyla ${base64Images.length} görsellerden ${cleanedItems.length} adet ürün kalemi okundu. (Hizmet Bedeli: ${totalInvoiceServiceFee.toFixed(2)} TL)`,
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

        const selectedModelName = db.getSetting('gemini_model_name', '').trim() || 'gemini-3.0-flash';
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
        Bu bir petshop ürün stok faturası veya alım fişidir. Gönderilen görsellerdeki tüm ürün kalemlerini okuyup aşağıdaki JSON formatında liste olarak çıkart.
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

        // Fetch DB data for cross-checking
        const dbProducts = db.queryAll("SELECT * FROM products");
        const dbSales = db.queryAll("SELECT * FROM sales");
        const dbSaleItems = db.queryAll("SELECT * FROM sale_items");

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

        const activeSaleIds = new Set(dbSales.filter(s => !['İade Edildi', 'Iade Edildi', 'Ä°ade Edildi'].includes(s.status)).map(s => s.id));

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
