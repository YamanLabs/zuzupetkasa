export interface Product {
    id: number;
    barcode: string | null;
    name: string;
    category: string;
    cost_price: number;
    sale_price: number;
    card_price?: number;
    vat_rate: number | null;
    stock_quantity: number;
    min_stock_alert: number;
    unit: string;
    created_at?: string;
    _stockLogReason?: string;
}

export interface CategoryMargin {
    cash: number;
    card: number;
}

export interface Sale {
    id: number;
    receipt_no: string;
    total_amount: number;
    discount: number;
    final_amount: number;
    tax_amount: number;
    payment_method: string;
    payment_amount_1: number;
    payment_method_2: string | null;
    payment_amount_2: number;
    pos_auth_code?: string | null;
    status: string;
    created_at: string;
}

export interface SaleItem {
    id: number;
    sale_id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    vat_rate: number;
    tax_amount: number;
}

export interface StockLog {
    id: number;
    product_id: number;
    product_name: string;
    change_quantity: number;
    new_stock: number;
    reason: string;
    created_at: string;
}

export interface DailySummary {
    total_sales_count: number;
    total_turnover: number;
    total_tax: number;
    total_discounts: number;
    cash_turnover: number;
    card_turnover: number;
    total_cost: number;
    net_profit: number;
}

export interface EndOfDayReport {
    total_sales_count: number;
    grand_total: number;
    total_tax: number;
    cash_total: number;
    credit_total: number;
    items_sold: Array<{
        name: string;
        barcode: string | null;
        total_qty: number;
        total_revenue: number;
    }>;
}

// Fallback in-memory storage for web browser preview when not inside Electron
let webInMemoryProducts: Product[] = [];

let webInMemorySales: Sale[] = [];
let webInMemorySaleItems: SaleItem[] = [];
let webInMemoryStockLogs: StockLog[] = [];
let webInMemorySettings: Record<string, string> = {
    company_name: "ZUZU PET",
    company_phone: "0555 555 55 55",
    company_address: "Merkez Mh. Main St. No:1",
    receipt_footer: "BIZ TERCIH ETTIGINIZ ICIN TESEKKUR EDERIZ!",
    tax_rate: "20",
    gemini_api_key: "",
    openrouter_api_key: "",
    active_ai_provider: "gemini",
    currency_symbol: "TL",
    dark_mode: "true"
};

let webInMemoryCategoryMargins: Record<string, number> = {
    "Mama": 30,
    "Oyuncak": 40,
    "Taşıma Çantası": 35,
    "Bakım & Sağlık": 35,
    "Kedi Kumu": 25,
    "Aksesuar": 40,
    "Genel": 30
};

function isElectronAvailable(): boolean {
    return typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
}

export function normalizeSearchText(str: string): string {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .replace(/i̇/g, 'i')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export const dbIPC = {
    async getProducts(searchQuery = '', category = 'Tümü'): Promise<Product[]> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getProducts(searchQuery, category);
        }
        let list = [...webInMemoryProducts];
        if (category && category !== 'Tümü') {
            list = list.filter(p => p.category === category);
        }
        if (searchQuery && searchQuery.trim()) {
            const cleanQuery = normalizeSearchText(searchQuery);
            const tokens = cleanQuery.split(' ').filter(Boolean);
            if (tokens.length > 0) {
                const rawQ = searchQuery.trim().toLowerCase();
                const scored: { prod: Product; score: number }[] = [];

                for (const prod of list) {
                    const normName = normalizeSearchText(prod.name);
                    const normBarcode = (prod.barcode || '').toLowerCase().trim();
                    const normCat = normalizeSearchText(prod.category);
                    const fullTarget = `${normName} ${normBarcode} ${normCat}`;

                    const allMatched = tokens.every(token => fullTarget.includes(token));
                    if (!allMatched) continue;

                    let score = 0;
                    if (normBarcode && normBarcode === rawQ) score += 1000;
                    else if (normBarcode && normBarcode.startsWith(rawQ)) score += 500;
                    else if (normName === cleanQuery) score += 400;
                    else if (normName.startsWith(cleanQuery)) score += 300;
                    else if (normName.includes(cleanQuery)) score += 200;
                    else {
                        score += 100;
                        tokens.forEach(tok => {
                            const pos = normName.indexOf(tok);
                            if (pos === 0) score += 50;
                            else if (pos > 0) score += Math.max(0, 30 - pos);
                        });
                    }
                    scored.push({ prod, score });
                }

                scored.sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return (a.prod.name || '').localeCompare(b.prod.name || '', 'tr');
                });
                return scored.map(s => s.prod);
            }
        }
        return list;
    },

    async getProductByBarcode(barcode: string): Promise<Product | null> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getProductByBarcode(barcode);
        }
        return webInMemoryProducts.find(p => p.barcode === barcode.trim()) || null;
    },

    async getProductById(id: number): Promise<Product | null> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getProductById(id);
        }
        return webInMemoryProducts.find(p => p.id === id) || null;
    },

    async addProduct(data: Omit<Product, 'id'>): Promise<number> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.addProduct(data);
        }
        const newId = Math.max(0, ...webInMemoryProducts.map(p => p.id)) + 1;
        const newProduct: Product = { ...data, id: newId };
        webInMemoryProducts.push(newProduct);
        return newId;
    },

    async updateProduct(id: number, data: Omit<Product, 'id'>): Promise<boolean> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.updateProduct(id, data);
        }
        const idx = webInMemoryProducts.findIndex(p => p.id === id);
        if (idx !== -1) {
            webInMemoryProducts[idx] = { ...data, id };
            return true;
        }
        return false;
    },

    async deleteProduct(id: number): Promise<boolean> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.deleteProduct(id);
        }
        webInMemoryProducts = webInMemoryProducts.filter(p => p.id !== id);
        return true;
    },

    async getCategories(): Promise<string[]> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getCategories();
        }
        const set = new Set(webInMemoryProducts.map(p => p.category));
        set.add("Genel");
        return Array.from(set).sort();
    },

    async createSale(saleData: any): Promise<Sale> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.createSale(saleData);
        }
        const newId = Math.max(0, ...webInMemorySales.map(s => s.id)) + 1;
        const receipt_no = `POS-${new Date().toISOString().substring(0,10).replace(/-/g,'')}-${String(newId).padStart(4, '0')}`;
        let total = 0;
        for (const item of saleData.cart_items) {
            total += item.quantity * item.unit_price;
            const p = webInMemoryProducts.find(prod => prod.id === item.product_id);
            if (p) {
                p.stock_quantity -= Math.round(item.quantity);
            }
        }
        const final_amount = Math.max(0, total - (saleData.discount || 0));
        const sale: Sale = {
            id: newId,
            receipt_no,
            total_amount: total,
            discount: saleData.discount || 0,
            final_amount,
            tax_amount: saleData.tax_amount || (final_amount * 0.18),
            payment_method: saleData.payment_method || 'Nakit',
            payment_amount_1: saleData.payment_amount_1 || final_amount,
            payment_method_2: saleData.payment_method_2 || null,
            payment_amount_2: saleData.payment_amount_2 || 0,
            status: 'Tamamlandı',
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
        webInMemorySales.unshift(sale);
        return sale;
    },

    async getSalesList(dateStart = '', dateEnd = ''): Promise<Sale[]> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getSalesList(dateStart, dateEnd);
        }
        return webInMemorySales;
    },

    async getSaleItems(saleId: number): Promise<SaleItem[]> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getSaleItems(saleId);
        }
        return webInMemorySaleItems.filter(si => si.sale_id === saleId);
    },

    async processRefund(saleId: number): Promise<boolean> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.processRefund(saleId);
        }
        const s = webInMemorySales.find(sale => sale.id === saleId);
        if (s) {
            s.status = 'İade Edildi';
            return true;
        }
        return false;
    },

    async deleteSale(saleId: number): Promise<boolean> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.deleteSale(saleId);
        }
        webInMemorySales = webInMemorySales.filter(s => s.id !== saleId);
        webInMemorySaleItems = webInMemorySaleItems.filter(si => si.sale_id !== saleId);
        return true;
    },

    async deleteSales(saleIds: number[]): Promise<boolean> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.deleteSales(saleIds);
        }
        const set = new Set(saleIds);
        webInMemorySales = webInMemorySales.filter(s => !set.has(s.id));
        webInMemorySaleItems = webInMemorySaleItems.filter(si => !set.has(si.sale_id));
        return true;
    },

    async getCriticalStockProducts(): Promise<Product[]> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getCriticalStockProducts();
        }
        return webInMemoryProducts.filter(p => p.stock_quantity <= p.min_stock_alert);
    },

    async getStockLogs(limit = 100): Promise<StockLog[]> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getStockLogs(limit);
        }
        return webInMemoryStockLogs.slice(0, limit);
    },

    async getDailySummary(dateStr: string | null = null): Promise<DailySummary> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getDailySummary(dateStr);
        }
        const activeSales = webInMemorySales.filter(s => s.status === 'Tamamlandı');
        const turnover = activeSales.reduce((acc, s) => acc + s.final_amount, 0);
        return {
            total_sales_count: activeSales.length,
            total_turnover: turnover,
            total_tax: turnover * 0.18,
            total_discounts: activeSales.reduce((acc, s) => acc + s.discount, 0),
            cash_turnover: activeSales.filter(s => s.payment_method === 'Nakit').reduce((acc, s) => acc + s.final_amount, 0),
            card_turnover: activeSales.filter(s => s.payment_method !== 'Nakit').reduce((acc, s) => acc + s.final_amount, 0),
            total_cost: turnover * 0.7,
            net_profit: turnover * 0.3
        };
    },

    async getEndOfDayReport(dateStr: string | null = null): Promise<EndOfDayReport> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getEndOfDayReport(dateStr);
        }
        const activeSales = webInMemorySales.filter(s => s.status === 'Tamamlandı');
        const turnover = activeSales.reduce((acc, s) => acc + s.final_amount, 0);
        return {
            total_sales_count: activeSales.length,
            grand_total: turnover,
            total_tax: turnover * 0.18,
            cash_total: activeSales.filter(s => s.payment_method === 'Nakit').reduce((acc, s) => acc + s.final_amount, 0),
            credit_total: activeSales.filter(s => s.payment_method !== 'Nakit').reduce((acc, s) => acc + s.final_amount, 0),
            items_sold: []
        };
    },

    async addOrUpdateStockByBarcode(barcode: string | null, name: string, addedStock: number, price = 0, costPrice = 0, unit = 'Adet', category = 'Genel'): Promise<boolean> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.addOrUpdateStockByBarcode(barcode, name, addedStock, price, costPrice, unit, category);
        }
        let prod = barcode ? webInMemoryProducts.find(p => p.barcode === barcode.trim()) : null;
        if (!prod) prod = webInMemoryProducts.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
        if (prod) {
            prod.stock_quantity += addedStock;
            if (price > 0) prod.sale_price = price;
            if (costPrice > 0) prod.cost_price = costPrice;
            if (category) prod.category = category;
        } else {
            const newId = Math.max(0, ...webInMemoryProducts.map(p => p.id)) + 1;
            webInMemoryProducts.push({
                id: newId,
                barcode: barcode ? barcode.trim() : null,
                name: name.trim(),
                category: category || "Genel",
                cost_price: costPrice,
                sale_price: price > 0 ? price : (costPrice > 0 ? costPrice * 1.3 : 0),
                vat_rate: 20,
                stock_quantity: addedStock,
                min_stock_alert: 5,
                unit: unit || "Adet"
            });
        }
        return true;
    },

    async getCategoryMargins(): Promise<Record<string, { cash: number; card: number }>> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getCategoryMargins();
        }
        const res: Record<string, { cash: number; card: number }> = {};
        for (const [k, v] of Object.entries(webInMemoryCategoryMargins)) {
            if (typeof v === 'object' && v !== null) {
                res[k] = v;
            } else {
                res[k] = { cash: Number(v) || 30, card: (Number(v) || 30) + 5 };
            }
        }
        return res;
    },

    async saveCategoryMargins(margins: Record<string, { cash: number; card: number } | any>): Promise<boolean> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.saveCategoryMargins(margins);
        }
        webInMemoryCategoryMargins = { ...margins };
        return true;
    },

    async updateCategoryProductPrices(category: string, cashMargin: number, cardMargin?: number): Promise<{ success: boolean; updatedCount: number }> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.updateCategoryProductPrices(category, cashMargin, cardMargin);
        }
        const cashM = 1 + (cashMargin / 100);
        const cardM = 1 + ((cardMargin ?? (cashMargin + 5)) / 100);
        let count = 0;
        webInMemoryProducts.forEach(p => {
            if (p.category === category && p.cost_price > 0) {
                p.sale_price = Number((p.cost_price * cashM).toFixed(2));
                p.card_price = Number((p.cost_price * cardM).toFixed(2));
                count++;
            }
        });
        return { success: true, updatedCount: count };
    },

    async deleteCategory(category: string): Promise<boolean> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.deleteCategory(category);
        }
        delete webInMemoryCategoryMargins[category];
        return true;
    },

    async getSetting(key: string, defaultValue = ''): Promise<string> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getSetting(key, defaultValue);
        }
        return webInMemorySettings[key] ?? defaultValue;
    },

    async setSetting(key: string, value: string): Promise<boolean> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.setSetting(key, value);
        }
        webInMemorySettings[key] = String(value);
        return true;
    },

    async getSettings(): Promise<Record<string, string>> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.getSettings();
        }
        return webInMemorySettings;
    },

    async clearEntireDatabase(keepSettings = false): Promise<boolean> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.db.clearEntireDatabase(keepSettings);
        }
        webInMemoryProducts = [];
        webInMemorySales = [];
        webInMemorySaleItems = [];
        webInMemoryStockLogs = [];
        webInMemoryCategoryMargins = {
            "Mama": 30,
            "Oyuncak": 40,
            "Taşıma Çantası": 35,
            "Bakım & Sağlık": 35,
            "Kedi Kumu": 25,
            "Aksesuar": 40,
            "Genel": 30
        };
        if (!keepSettings) {
            webInMemorySettings = {};
        }
        return true;
    },

    async exportBackup(): Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }> {
        if (isElectronAvailable() && (window as any).electronAPI?.db?.exportBackup) {
            return await (window as any).electronAPI.db.exportBackup();
        }
        try {
            const data = {
                products: webInMemoryProducts,
                sales: webInMemorySales,
                saleItems: webInMemorySaleItems,
                stockLogs: webInMemoryStockLogs,
                categoryMargins: webInMemoryCategoryMargins,
                settings: webInMemorySettings,
                exportDate: new Date().toISOString()
            };
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kasa_pos_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    },

    async importBackup(): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            return await (window as any).electronAPI.db.importBackup();
        }
        return { success: true };
    },

    async exportBarcodes(): Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }> {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            return await (window as any).electronAPI.db.exportBarcodes();
        }
        return { success: true };
    },

    async importBarcodes(): Promise<{ success: boolean; canceled?: boolean; updatedCount?: number; error?: string }> {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            return await (window as any).electronAPI.db.importBarcodes();
        }
        return { success: true, updatedCount: 0 };
    },

    async performBackupNow(): Promise<{ success: boolean; filePath?: string; error?: string }> {
        if (isElectronAvailable() && (window as any).electronAPI?.db?.performBackupNow) {
            return await (window as any).electronAPI.db.performBackupNow();
        }
        return { success: false, error: "Tarayıcı ortamında yedekleme simülasyonu çalıştırılamıyor." };
    },

    async listBackups(): Promise<Array<{ filename: string; filePath: string; sizeBytes: number; mtime: Date }>> {
        if (isElectronAvailable() && (window as any).electronAPI?.db?.listBackups) {
            return await (window as any).electronAPI.db.listBackups();
        }
        return [];
    },

    async restoreBackupFile(filePath: string): Promise<{ success: boolean; error?: string }> {
        if (isElectronAvailable() && (window as any).electronAPI?.db?.restoreBackupFile) {
            return await (window as any).electronAPI.db.restoreBackupFile(filePath);
        }
        return { success: false, error: "Tarayıcı ortamında veritabanı geri yüklenemez." };
    }
};

export const printerIPC = {
    async printThermalReceipt(receiptHtml: string): Promise<{ success: boolean; error?: string }> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.printThermalReceipt(receiptHtml);
        }
        // Web fallback: window.print()
        const printWin = window.open('', '_blank');
        if (printWin) {
            printWin.document.write(`<html><head><style>body { font-family: monospace; width: 80mm; font-size: 12px; }</style></head><body>${receiptHtml}</body></html>`);
            printWin.document.close();
            printWin.print();
        }
        return { success: true };
    }
};

export const aiIPC = {
    async analyzeInvoiceImages(base64Images: string[], apiKey?: string): Promise<{ success: boolean; message: string; items: any[] }> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.analyzeInvoiceImages(base64Images, apiKey);
        }
        return {
            success: false,
            message: "Browser modunda AI analizi için Electron masaüstü uygulamasını kullanın.",
            items: []
        };
    },

    onAIProgress(callback: (data: { currentBatch: number; totalBatches: number; message: string }) => void) {
        if (isElectronAvailable()) {
            return (window as any).electronAPI.onAIProgress(callback);
        }
        return () => {};
    },

    async doubleCheckInvoice(base64Images: string[], apiKey?: string): Promise<{ success: boolean; message: string; report: string; summary: any; items: any[] }> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.doubleCheckInvoice(base64Images, apiKey);
        }
        return {
            success: false,
            message: "Browser modunda Double-Check için Electron masaüstü uygulamasını kullanın.",
            report: "Hata: Browser modunda desteklenmiyor.",
            summary: {},
            items: []
        };
    }
};

export const posIPC = {
    async sendPaymentSignal(amountTl: number): Promise<{ success: boolean; simulated?: boolean; auth_code?: string; message?: string; error?: string }> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.pos.sendPaymentSignal(amountTl);
        }
        return {
            success: true,
            simulated: true,
            auth_code: `SIM-${Math.floor(100000 + Math.random() * 900000)}`,
            message: 'Web Test Modu: POS Kart Ödemesi Onaylandı'
        };
    },
    async pairPosTerminal(params: { serialNo?: string; appNo?: string; ip?: string; port?: string }): Promise<{ success: boolean; message: string }> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.pos.pairPosTerminal(params);
        }
        return { success: true, message: 'Eşleme başarılı.' };
    },
    async testPosTerminal(params?: any): Promise<{ success: boolean; message?: string }> {
        if (isElectronAvailable()) {
            return await (window as any).electronAPI.pos.testPosTerminal(params);
        }
        return { success: true, message: 'Test sinyali gönderildi.' };
    }
};

export const appControl = {
    minimize() {
        if (isElectronAvailable()) {
            (window as any).electronAPI.minimizeWindow();
        }
    },
    maximize() {
        if (isElectronAvailable()) {
            (window as any).electronAPI.maximizeWindow();
        }
    },
    close() {
        if (isElectronAvailable()) {
            (window as any).electronAPI.closeWindow();
        }
    },
    setBadgeCount(count: number) {
        if (isElectronAvailable()) {
            if ((window as any).electronAPI.setBadgeCount) {
                (window as any).electronAPI.setBadgeCount(count);
            }
        }
    }
};
