const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Database API
    db: {
        getProducts: (searchQuery, category) => ipcRenderer.invoke('db:getProducts', searchQuery, category),
        getProductByBarcode: (barcode) => ipcRenderer.invoke('db:getProductByBarcode', barcode),
        getProductById: (id) => ipcRenderer.invoke('db:getProductById', id),
        addProduct: (data) => ipcRenderer.invoke('db:addProduct', data),
        updateProduct: (id, data) => ipcRenderer.invoke('db:updateProduct', id, data),
        deleteProduct: (id) => ipcRenderer.invoke('db:deleteProduct', id),
        getCategories: () => ipcRenderer.invoke('db:getCategories'),
        createSale: (saleData) => ipcRenderer.invoke('db:createSale', saleData),
        getSalesList: (dateStart, dateEnd) => ipcRenderer.invoke('db:getSalesList', dateStart, dateEnd),
        getSaleItems: (saleId) => ipcRenderer.invoke('db:getSaleItems', saleId),
        processRefund: (saleId) => ipcRenderer.invoke('db:processRefund', saleId),
        deleteSale: (saleId) => ipcRenderer.invoke('db:deleteSale', saleId),
        deleteSales: (saleIds) => ipcRenderer.invoke('db:deleteSales', saleIds),
        getCriticalStockProducts: () => ipcRenderer.invoke('db:getCriticalStockProducts'),
        getStockLogs: (limit) => ipcRenderer.invoke('db:getStockLogs', limit),
        getDailySummary: (dateStr) => ipcRenderer.invoke('db:getDailySummary', dateStr),
        getEndOfDayReport: (dateStr) => ipcRenderer.invoke('db:getEndOfDayReport', dateStr),
        addOrUpdateStockByBarcode: (barcode, name, addedStock, price, costPrice, unit, category) =>
            ipcRenderer.invoke('db:addOrUpdateStockByBarcode', barcode, name, addedStock, price, costPrice, unit, category),
        getCategoryMargins: () => ipcRenderer.invoke('db:getCategoryMargins'),
        saveCategoryMargins: (margins) => ipcRenderer.invoke('db:saveCategoryMargins', margins),
        updateCategoryProductPrices: (category, marginPercent) => ipcRenderer.invoke('db:updateCategoryProductPrices', category, marginPercent),
        deleteCategory: (category) => ipcRenderer.invoke('db:deleteCategory', category),
        getSetting: (key, defaultValue) => ipcRenderer.invoke('db:getSetting', key, defaultValue),
        setSetting: (key, value) => ipcRenderer.invoke('db:setSetting', key, value),
        getSettings: () => ipcRenderer.invoke('db:getSettings'),
        clearEntireDatabase: (keepSettings) => ipcRenderer.invoke('db:clearEntireDatabase', keepSettings),
        exportBackup: () => ipcRenderer.invoke('db:exportBackup'),
        importBackup: () => ipcRenderer.invoke('db:importBackup')
    },

    // POS Cihazı Sinyal API
    pos: {
        sendPaymentSignal: (amountTl) => ipcRenderer.invoke('pos:sendPaymentSignal', amountTl),
        pairPosTerminal: (params) => ipcRenderer.invoke('pos:pairPosTerminal', params),
        testPosTerminal: (params) => ipcRenderer.invoke('pos:testPosTerminal', params)
    },

    // Thermal Printer API
    printThermalReceipt: (receiptHtml) => ipcRenderer.invoke('printer:printThermalReceipt', receiptHtml),

    // AI Invoice Scanner API
    analyzeInvoiceImages: (imageDataArray, apiKey) => ipcRenderer.invoke('ai:analyzeInvoiceImages', imageDataArray, apiKey),
    doubleCheckInvoice: (imageDataArray, apiKey) => ipcRenderer.invoke('ai:doubleCheckInvoice', imageDataArray, apiKey),

    // App Control
    minimizeWindow: () => ipcRenderer.send('app:minimize'),
    maximizeWindow: () => ipcRenderer.send('app:maximize'),
    closeWindow: () => ipcRenderer.send('app:close'),

    // Auto Updater API
    updater: {
        check: () => ipcRenderer.invoke('updater:check'),
        startDownload: (downloadUrl, assetSize) => ipcRenderer.invoke('updater:startDownload', downloadUrl, assetSize),
        install: () => ipcRenderer.invoke('updater:install'),
        onProgress: (callback) => {
            ipcRenderer.on('updater:progress', (event, data) => callback(data));
            return () => ipcRenderer.removeAllListeners('updater:progress');
        }
    }
});
