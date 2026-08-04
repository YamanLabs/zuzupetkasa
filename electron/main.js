const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const serve = require('electron-serve');
const electronServe = serve.default || serve;
const db = require('./database');
const posTerminal = require('./pos_terminal');
const { startGmp3Server } = require('../gmp3-server');
const { GoogleGenAI } = require('@google/genai');

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
ipcMain.handle('db:updateCategoryProductPrices', (event, cat, margin) => db.updateCategoryProductPrices(cat, margin));
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

        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);
        
        printWindow.webContents.print({
            silent: true,
            printBackground: true,
            deviceName: ''
        }, (success, errorType) => {
            printWindow.close();
            printWindow = null;
        });

        return { success: true };
    } catch (err) {
        console.error('Thermal Print Error:', err);
        return { success: false, error: err.message };
    }
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

        const selectedModelName = db.getSetting('gemini_model_name', '').trim() || 'gemini-3.0-flash';

        const ai = new GoogleGenAI({ apiKey });
        
        const contents = [];
        for (const fileBase64 of base64Images) {
            let mimeType = 'image/jpeg';
            let cleanData = fileBase64;

            if (fileBase64.startsWith('data:')) {
                const parts = fileBase64.split(';');
                if (parts.length >= 2) {
                    mimeType = parts[0].replace('data:', '').trim(); // e.g. 'application/pdf', 'image/png', 'image/jpeg'
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

        const allProducts = db.getAllProducts('', 'Tümü').map(p => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode || ''
        }));
        const dbProductsStr = JSON.stringify(allProducts);

        const prompt = `
        Bu bir petshop ürün stok faturası veya alım fişidir (e-Arşiv / e-Fatura). Gönderilen görseller tek bir fatura/fişin parçaları veya ardışık sayfaları olabilir.
        Tüm görsellerdeki ürün kalemlerini okuyup birleştirerek aşağıdaki JSON formatında tam liste olarak çıkart.
        Tekrarlanan veya devam eden satırları mükerrer eklemeden, tüm parçalardaki ürünlerin eksiksiz listesini oluştur.

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

        EŞLEŞTİRME VE BARKOD KURALI:
        - Okuduğun faturadaki her normal ürün kalemi için "VERİTABANINDAKİ MEVCUT ÜRÜNLER LİSTESİ" içinde mantıksal bir eşleşme ara (isim benzerliği veya barkod eşleşmesi).
        - Eğer faturadaki ürün ile veritabanındaki bir ürün aynıysa, o ürünün id'sini "matched_product_id" alanına ekle. Eğer hiç eşleşen yoksa null ver.
        - Faturada barkod varsa veya veritabanında eşleşen ürünün barkodu varsa, onu "barcode" alanına yaz. Yoksa null yap.

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
        const rawItems = parsed.items || [];
        let extractedServiceFee = parseFloat(parsed.invoice_service_fee_total || 0.0);

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
            const salePrice = Math.round(rawSalePrice);

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
                            const normP = normalizeName(p.name);
                            const cnt = tokens.filter(tok => normP.includes(tok)).length;
                            if (cnt >= Math.ceil(tokens.length * 0.75) && cnt > maxCnt) {
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
