const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

class PosDatabase {
    constructor() {
        this.db = null;
        this.dbPath = '';
    }

    async init(customPath = null) {
        if (!customPath) {
            const isPackaged = app && app.isPackaged;
            if (isPackaged) {
                // In production: use userData directory (writable, persistent)
                const userDataPath = app.getPath('userData');
                this.dbPath = path.join(userDataPath, 'pos_system.db');
            } else {
                // In development: use project root
                const parentDb = path.join(__dirname, '..', '..', 'pos_system.db');
                const localDb = path.join(__dirname, '..', 'pos_system.db');
                if (fs.existsSync(parentDb)) {
                    this.dbPath = parentDb;
                } else if (fs.existsSync(localDb)) {
                    this.dbPath = localDb;
                } else {
                    this.dbPath = localDb;
                }
            }
        } else {
            this.dbPath = customPath;
        }

        // Resolve WASM file path — works both inside asar and during dev
        // In production asar builds, asarUnpack puts wasm into app.asar.unpacked/
        let wasmPath;
        if (app && app.isPackaged) {
            wasmPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
        } else {
            wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
        }
        const SQL = await initSqlJs({
            locateFile: () => wasmPath
        });

        if (fs.existsSync(this.dbPath)) {
            const filebuffer = fs.readFileSync(this.dbPath);
            this.db = new SQL.Database(filebuffer);
        } else {
            this.db = new SQL.Database();
        }

        this.initSchema();
        this.save();
    }

    save() {
        if (!this.db || !this.dbPath) return;
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.dbPath, buffer);
        } catch (err) {
            console.error('Error saving database:', err);
        }
    }

    queryAll(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            stmt.bind(params);
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
        } catch (err) {
            console.error('SQL Query Error:', err, sql, params);
            return [];
        }
    }

    queryOne(sql, params = []) {
        const rows = this.queryAll(sql, params);
        return rows.length > 0 ? rows[0] : null;
    }

    execute(sql, params = []) {
        try {
            this.db.run(sql, params);
            const res = this.queryOne("SELECT last_insert_rowid() as id");
            this.save();
            return res ? res.id : 0;
        } catch (err) {
            console.error('SQL Exec Error:', err, sql, params);
            throw err;
        }
    }

    initSchema() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                barcode TEXT UNIQUE,
                name TEXT NOT NULL,
                category TEXT DEFAULT 'Genel',
                cost_price REAL DEFAULT 0.0,
                sale_price REAL NOT NULL,
                vat_rate REAL DEFAULT NULL,
                stock_quantity INTEGER DEFAULT 0,
                min_stock_alert INTEGER DEFAULT 5,
                unit TEXT DEFAULT 'Adet',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_no TEXT UNIQUE NOT NULL,
                total_amount REAL NOT NULL,
                discount REAL DEFAULT 0.0,
                final_amount REAL NOT NULL,
                tax_amount REAL DEFAULT 0.0,
                payment_method TEXT NOT NULL,
                payment_amount_1 REAL DEFAULT 0.0,
                payment_method_2 TEXT DEFAULT NULL,
                payment_amount_2 REAL DEFAULT 0.0,
                pos_auth_code TEXT DEFAULT NULL,
                status TEXT DEFAULT 'Tamamlandı',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                vat_rate REAL DEFAULT 20.0,
                tax_amount REAL DEFAULT 0.0,
                FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS stock_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER,
                product_name TEXT,
                change_quantity INTEGER NOT NULL,
                new_stock INTEGER NOT NULL,
                reason TEXT,
                created_at DATETIME DEFAULT (datetime('now', 'localtime'))
            );
            
            -- BUG-09 FIX: Create indexes for frequently queried columns to improve performance
            CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
            CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
            CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
            CREATE INDEX IF NOT EXISTS idx_stock_logs_product_id ON stock_logs(product_id);

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                margin_percent REAL DEFAULT 30.0,
                card_margin_percent REAL DEFAULT 35.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Migration for card_margin_percent in categories & card_price in products
        try {
            const catCols = this.queryAll("PRAGMA table_info(categories)");
            if (!catCols.some(c => c.name === 'card_margin_percent')) {
                this.execute("ALTER TABLE categories ADD COLUMN card_margin_percent REAL DEFAULT 35.0");
            }
        } catch (e) { }

        try {
            const prodCols = this.queryAll("PRAGMA table_info(products)");
            if (!prodCols.some(c => c.name === 'card_price')) {
                this.execute("ALTER TABLE products ADD COLUMN card_price REAL DEFAULT NULL");
            }
        } catch (e) { }

        // Seed default categories
        const catCountRes = this.queryOne("SELECT COUNT(*) as count FROM categories");
        if (!catCountRes || catCountRes.count === 0) {
            const defaultCats = [
                ["Mama", 30.0, 35.0],
                ["Yaş Mama", 100.0, 100.0],
                ["Oyuncak", 40.0, 45.0],
                ["Taşıma Çantası", 35.0, 40.0],
                ["Bakım & Sağlık", 35.0, 40.0],
                ["Kedi Kumu", 25.0, 30.0],
                ["Aksesuar", 40.0, 45.0],
                ["Genel", 30.0, 35.0],
                ["Mama Kapları", 30.0, 35.0],
                ["Yatak", 35.0, 40.0]
            ];
            for (const [cName, cCash, cCard] of defaultCats) {
                this.execute("INSERT OR IGNORE INTO categories (name, margin_percent, card_margin_percent) VALUES (?, ?, ?)", [cName, cCash, cCard]);
            }
        }

        // Ensure Mama Kapları and Yatak categories exist
        this.addCategoryIfNotExist('Mama Kapları', 30.0, 35.0);
        this.addCategoryIfNotExist('Yatak', 35.0, 40.0);

        // Run wet food migration and stock sync — only once
        const migDone = this.queryOne("SELECT value FROM settings WHERE key = 'wet_food_migration_done'");
        if (!migDone) {
            this.migrateWetFoodAndSyncStock();
        }

        // BUG-03 FIX: One-time migration to fix broken Türkçe encoding in old sales records
        // Old records may have 'Ä°ade Edildi' (mojibake) or 'Iade Edildi' (ASCII fallback)
        const refundEncodingFixed = this.queryOne("SELECT value FROM settings WHERE key = 'refund_encoding_migration_done'");
        if (!refundEncodingFixed) {
            try {
                // Fix mojibake variant
                this.db.run("UPDATE sales SET status = '\u0130ade Edildi' WHERE status = '\u00c4\u00b0ade Edildi'");
                // Fix ASCII fallback variant
                this.db.run("UPDATE sales SET status = '\u0130ade Edildi' WHERE status = 'Iade Edildi'");
                this.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('refund_encoding_migration_done', '1')");
                console.log('[Migration] BUG-03: Refund status encoding fixed.');
            } catch (err) {
                console.error('[Migration] BUG-03 refund encoding fix error:', err);
            }
        }

        // Seed default settings
        const defaultSettings = {
            "company_name": "ZUZU PET",
            "company_phone": "0555 555 55 55",
            "company_address": "Merkez Mh. Main St. No:1",
            "receipt_footer": "BIZ TERCIH ETTIGINIZ ICIN TESEKKUR EDERIZ!",
            "tax_rate": "20",
            "gemini_api_key": "",
            "currency_symbol": "TL",
            "receipt_template": "compact_minimal",
            "dark_mode": "true"
        };

        for (const [k, v] of Object.entries(defaultSettings)) {
            const existing = this.queryOne("SELECT key FROM settings WHERE key = ?", [k]);
            if (!existing) {
                this.execute("INSERT INTO settings (key, value) VALUES (?, ?)", [k, String(v)]);
            }
        }
    }

    migrateWetFoodAndSyncStock() {
        try {
            // A. Ensure Yaş Mama category
            const yasMama = this.queryOne("SELECT id FROM categories WHERE name = 'Yaş Mama'");
            if (!yasMama) {
                this.execute("INSERT INTO categories (name, margin_percent, card_margin_percent) VALUES ('Yaş Mama', 100.0, 100.0)");
            } else {
                this.execute("UPDATE categories SET margin_percent = 100.0, card_margin_percent = 100.0 WHERE name = 'Yaş Mama'");
            }

            // B. Find wet food items and update their category & prices
            const allProducts = this.queryAll("SELECT id, name, category, cost_price, sale_price, card_price, stock_quantity FROM products");

            const wetKeywords = [
                'konserve', 'pouch', 'gravy', 'jelly', 'pate', 'ezme', 'ezmesi', 'soslu',
                'yaş', 'yas', 'wet', '12x85', '24x85', '12x100', 'gourmet gold', 'felix',
                'whiskas', '195g*12*', 'çorba', 'corba', 'krema', 'f.krema', 'kons', 'poşet', 'poset', 'sosis',
                'et parçacıklı', 'et parcacikli', 'kolajen 80 gr', 'ödül', 'odul', 'stick', 'sticks',
                'churu', 'wanpy', 'snacky', 'dreamies', 'bisküvi', 'biskuvi', 'jerky', 'munchy', 'fileto',
                'burgu', 'sandviç', 'sandvic', 'biscrok', 'gimcat', 'paste', 'semi-moist'
            ];

            for (const prod of allProducts) {
                const nameLower = (prod.name || '').toLowerCase();

                // Exclude non-food items
                if (nameLower.includes('suluk') || nameLower.includes('şampuan') || nameLower.includes('tarak') ||
                    nameLower.includes('oyuncak') || nameLower.includes('tuvalet') || nameLower.includes('tasma')) {
                    continue;
                }

                const isWet = wetKeywords.some(kw => nameLower.includes(kw));

                if (isWet) {
                    const cost = parseFloat(prod.cost_price || 0.0);
                    const newPrice = cost > 0 ? Number((cost * 2.0).toFixed(2)) : parseFloat(prod.sale_price || 0.0);
                    this.execute("UPDATE products SET category = 'Yaş Mama', sale_price = ?, card_price = ? WHERE id = ?", [newPrice, newPrice, prod.id]);
                }
            }

            // C. Fix duplicated Shn & duplicate products stock quantity back to 1
            const shnIds = [667, 668, 669, 670, 671, 673, 678, 679, 680, 681, 682, 683];
            for (const sid of shnIds) {
                const p = this.queryOne("SELECT id, stock_quantity FROM products WHERE id = ?", [sid]);
                if (p && p.stock_quantity > 1) {
                    this.execute("UPDATE products SET stock_quantity = 1 WHERE id = ?", [sid]);
                }
            }

            // Fix Babycat South 195G*12* stock back to 12
            const babycat = this.queryOne("SELECT id, stock_quantity FROM products WHERE id = 684");
            if (babycat && babycat.stock_quantity > 12) {
                this.execute("UPDATE products SET stock_quantity = 12 WHERE id = 684");
            }

            // D. Fix misplaced non-food categories
            this.execute("UPDATE products SET category = 'Aksesuar' WHERE id IN (417, 422, 419, 416, 420, 418, 413, 415, 411, 412, 414, 480, 494, 456, 450, 505, 503, 504, 506, 516, 469, 489, 481, 486, 483, 488, 482, 484, 545, 543, 515, 642, 643, 510)");
            this.execute("UPDATE products SET category = 'Oyuncak' WHERE id IN (435)");
            this.execute("UPDATE products SET category = 'Mama' WHERE id IN (562, 555, 558, 537)");

            // Mark migration as done so it never runs again
            this.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('wet_food_migration_done', '1')");

            this.save();
        } catch (err) {
            console.error("Migration error in database.js:", err);
        }
    }

    normalizeSearchText(str) {
        if (!str) return '';
        // BUG-18 FIX: Normalize unicode combining characters before lowercasing
        // 'İ'.normalize('NFD') -> 'I' + combining dot, then toLowerCase -> 'i' + combining dot
        // We handle this by normalizing NFC first, then doing explicit Turkish replacements
        return String(str)
            .normalize('NFC')
            .toLowerCase()
            .replace(/i\u0307/g, 'i')  // i + combining dot above (from İ)
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

    // --- PRODUCTS ---
    getAllProducts(searchQuery = '', category = 'Tümü') {
        let sql = "SELECT * FROM products WHERE 1=1";
        const params = [];

        if (category && category !== 'Tümü') {
            sql += " AND category = ?";
            params.push(category);
        }

        const rawProducts = this.queryAll(sql, params);

        if (!searchQuery || !searchQuery.trim()) {
            return rawProducts.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
        }

        const cleanQuery = this.normalizeSearchText(searchQuery);
        const tokens = cleanQuery.split(' ').filter(Boolean);

        if (tokens.length === 0) return rawProducts;

        const scored = [];
        const rawQ = searchQuery.trim().toLowerCase();

        for (const prod of rawProducts) {
            const normName = this.normalizeSearchText(prod.name);
            const normBarcode = (prod.barcode || '').toLowerCase().trim();
            const normCat = this.normalizeSearchText(prod.category);
            const fullTarget = `${normName} ${normBarcode} ${normCat}`;

            // Check if ALL tokens match somewhere in name, barcode, or category
            const allMatched = tokens.every(token => fullTarget.includes(token));

            if (!allMatched) continue;

            // Calculate relevance score
            let score = 0;

            // 1. Exact barcode match
            if (normBarcode && normBarcode === rawQ) {
                score += 1000;
            }
            // 2. Barcode starts with query
            else if (normBarcode && normBarcode.startsWith(rawQ)) {
                score += 500;
            }
            // 3. Name equals search query
            else if (normName === cleanQuery) {
                score += 400;
            }
            // 4. Name starts with search query
            else if (normName.startsWith(cleanQuery)) {
                score += 300;
            }
            // 5. Name contains full query as a phrase
            else if (normName.includes(cleanQuery)) {
                score += 200;
            }
            // 6. Token positions bonus
            else {
                score += 100;
                tokens.forEach((tok) => {
                    const pos = normName.indexOf(tok);
                    if (pos === 0) score += 50;
                    else if (pos > 0) score += Math.max(0, 30 - pos);
                });
            }

            scored.push({ prod, score });
        }

        // Sort descending by score, then ascending by name
        scored.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (a.prod.name || '').localeCompare(b.prod.name || '', 'tr');
        });

        return scored.map(item => item.prod);
    }

    getProductByBarcode(barcode) {
        if (!barcode) return null;
        return this.queryOne("SELECT * FROM products WHERE barcode = ?", [barcode.trim()]);
    }

    getProductById(id) {
        return this.queryOne("SELECT * FROM products WHERE id = ?", [id]);
    }

    addProduct(data) {
        const barcodeVal = data.barcode && data.barcode.trim() ? data.barcode.trim() : null;
        const id = this.execute(
            `INSERT INTO products (barcode, name, category, cost_price, sale_price, card_price, vat_rate, stock_quantity, min_stock_alert, unit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                barcodeVal,
                data.name,
                data.category || 'Genel',
                data.cost_price || 0.0,
                data.sale_price || 0.0,
                data.card_price !== undefined ? data.card_price : (data.sale_price ? Number((data.sale_price * 1.05).toFixed(2)) : 0.0),
                data.vat_rate !== undefined ? data.vat_rate : null,
                data.stock_quantity || 0,
                data.min_stock_alert || 5,
                data.unit || 'Adet'
            ]
        );

        this.execute(
            `INSERT INTO stock_logs (product_id, product_name, change_quantity, new_stock, reason)
             VALUES (?, ?, ?, ?, ?)`,
            [id, data.name, data.stock_quantity || 0, data.stock_quantity || 0, "Yeni Ürün Kaydı"]
        );

        return id;
    }

    updateProduct(id, data) {
        const oldRow = this.getProductById(id);
        const oldStock = oldRow ? oldRow.stock_quantity : 0;
        const barcodeVal = data.barcode && data.barcode.trim() ? data.barcode.trim() : null;

        this.execute(
            `UPDATE products
             SET barcode = ?, name = ?, category = ?, cost_price = ?, sale_price = ?, card_price = ?, vat_rate = ?, stock_quantity = ?, min_stock_alert = ?, unit = ?
             WHERE id = ?`,
            [
                barcodeVal,
                data.name,
                data.category || 'Genel',
                data.cost_price || 0.0,
                data.sale_price || 0.0,
                data.card_price !== undefined ? data.card_price : (data.sale_price ? Number((data.sale_price * 1.05).toFixed(2)) : 0.0),
                data.vat_rate !== undefined ? data.vat_rate : null,
                data.stock_quantity || 0,
                data.min_stock_alert || 5,
                data.unit || 'Adet',
                id
            ]
        );

        const newStock = data.stock_quantity || 0;
        if (oldStock !== newStock) {
            const diff = newStock - oldStock;
            // BUG-14 FIX: Allow callers to provide a custom reason via _stockLogReason
            const logReason = data._stockLogReason || "Manuel Stok Düzenleme";
            this.execute(
                `INSERT INTO stock_logs (product_id, product_name, change_quantity, new_stock, reason)
                 VALUES (?, ?, ?, ?, ?)`,
                [id, data.name, diff, newStock, logReason]
            );
        }

        return true;
    }

    deleteProduct(id) {
        this.execute("DELETE FROM products WHERE id = ?", [id]);
        return true;
    }

    getCategories() {
        const rows = this.queryAll("SELECT name FROM categories ORDER BY name ASC");
        let cats = rows.map(r => r.name);
        if (!cats.includes("Genel")) {
            cats.push("Genel");
            this.addCategoryIfNotExist("Genel", 30.0);
        }
        cats.sort();
        return cats;
    }

    getCategoryMargins() {
        this.getCategories();
        const rows = this.queryAll("SELECT name, margin_percent, card_margin_percent FROM categories");
        const margins = {};
        for (const r of rows) {
            const cashMargin = parseFloat(r.margin_percent || 30.0);
            const cardMargin = parseFloat(r.card_margin_percent !== null && r.card_margin_percent !== undefined ? r.card_margin_percent : (cashMargin + 5.0));
            margins[r.name] = {
                cash: cashMargin,
                card: cardMargin
            };
        }
        return margins;
    }

    addCategoryIfNotExist(categoryName, defaultCash = 30.0, defaultCard = 35.0) {
        if (!categoryName || !categoryName.trim()) return false;
        const nameVal = categoryName.trim();
        const existing = this.queryOne("SELECT id FROM categories WHERE name = ?", [nameVal]);
        if (!existing) {
            this.execute("INSERT INTO categories (name, margin_percent, card_margin_percent) VALUES (?, ?, ?)", [nameVal, parseFloat(defaultCash) || 30.0, parseFloat(defaultCard) || 35.0]);
            return true;
        }
        return false;
    }

    deleteCategory(categoryName) {
        if (!categoryName || categoryName.trim() === 'Genel') return false;
        const nameVal = categoryName.trim();
        this.execute("DELETE FROM categories WHERE name = ?", [nameVal]);
        this.execute("UPDATE products SET category = 'Genel' WHERE category = ?", [nameVal]);
        return true;
    }

    saveCategoryMargins(marginsObj) {
        for (const [name, marginData] of Object.entries(marginsObj)) {
            const nameVal = name.trim();
            let cashVal = 30.0;
            let cardVal = 35.0;

            if (typeof marginData === 'object' && marginData !== null) {
                cashVal = parseFloat(marginData.cash !== undefined ? marginData.cash : marginData.margin_percent) || 30.0;
                cardVal = parseFloat(marginData.card !== undefined ? marginData.card : marginData.card_margin_percent) || (cashVal + 5.0);
            } else {
                cashVal = parseFloat(marginData) || 30.0;
                cardVal = cashVal + 5.0;
            }

            const existing = this.queryOne("SELECT id FROM categories WHERE name = ?", [nameVal]);
            if (existing) {
                this.execute("UPDATE categories SET margin_percent = ?, card_margin_percent = ? WHERE id = ?", [cashVal, cardVal, existing.id]);
            } else {
                this.execute("INSERT INTO categories (name, margin_percent, card_margin_percent) VALUES (?, ?, ?)", [nameVal, cashVal, cardVal]);
            }
            this.updateCategoryProductPrices(nameVal, cashVal, cardVal);
        }
        return true;
    }

    updateCategoryProductPrices(categoryName, cashMargin, cardMargin) {
        const cashM = parseFloat(cashMargin);
        const cardM = parseFloat(cardMargin !== undefined ? cardMargin : (cashM + 5.0));
        if (isNaN(cashM)) return { success: false, updatedCount: 0 };

        const cashMult = 1.0 + (cashM / 100.0);
        const cardMult = 1.0 + (cardM / 100.0);

        const products = this.queryAll("SELECT id, cost_price FROM products WHERE category = ?", [categoryName]);
        let count = 0;
        for (const p of products) {
            if (p.cost_price && p.cost_price > 0) {
                const newSalePrice = Number((p.cost_price * cashMult).toFixed(2));
                const newCardPrice = Number((p.cost_price * cardMult).toFixed(2));
                this.execute("UPDATE products SET sale_price = ?, card_price = ? WHERE id = ?", [newSalePrice, newCardPrice, p.id]);
                count++;
            }
        }
        return { success: true, updatedCount: count };
    }

    // --- SALES ---
    generateReceiptNo() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const datePrefix = `POS-${yyyy}${mm}${dd}-`;

        const row = this.queryOne("SELECT receipt_no FROM sales WHERE receipt_no LIKE ? ORDER BY id DESC LIMIT 1", [`${datePrefix}%`]);
        let newSeq = 1;
        if (row && row.receipt_no) {
            const parts = row.receipt_no.split('-');
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) newSeq = lastSeq + 1;
        }
        return `${datePrefix}${String(newSeq).padStart(4, '0')}`;
    }

    createSale(saleData) {
        const {
            cart_items,
            discount = 0.0,
            payment_method,
            tax_amount: providedTax,
            payment_amount_1,
            payment_method_2 = null,
            payment_amount_2 = 0.0,
            pos_auth_code = null
        } = saleData;

        if (!cart_items || cart_items.length === 0) {
            throw new Error("Sepet boş olamaz.");
        }

        let total_amount = 0;
        let calculated_tax = 0;

        // BUG-08 FIX: Use transaction to ensure data integrity during sale creation
        this.execute('BEGIN TRANSACTION');
        try {
            for (const item of cart_items) {
                const qty = parseFloat(item.quantity);
                const price = parseFloat(item.unit_price);
                const itemTotal = qty * price;
                total_amount += itemTotal;
                const vatRate = parseFloat(item.vat_rate || 20.0);
                const itemTax = item.tax_amount !== undefined ? parseFloat(item.tax_amount) : itemTotal - (itemTotal / (1.0 + (vatRate / 100.0)));
                calculated_tax += itemTax;
            }

        const final_amount = Math.max(0.0, total_amount - parseFloat(discount));
        const tax_amount = providedTax !== undefined ? parseFloat(providedTax) : calculated_tax;
        const pay1 = payment_amount_1 !== undefined ? parseFloat(payment_amount_1) : final_amount;
        const receipt_no = this.generateReceiptNo();

        const saleId = this.execute(
            `INSERT INTO sales (
                receipt_no, total_amount, discount, final_amount, tax_amount,
                payment_method, payment_amount_1, payment_method_2, payment_amount_2,
                pos_auth_code, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                receipt_no, total_amount, discount, final_amount, tax_amount,
                payment_method, pay1, payment_method_2, payment_amount_2,
                pos_auth_code, "Tamamlandı"
            ]
        );

        for (const item of cart_items) {
            const pid = item.product_id;
            const qty = parseFloat(item.quantity);
            const unit_price = parseFloat(item.unit_price);
            const item_total = qty * unit_price;
            const vat_rate = parseFloat(item.vat_rate || 20.0);
            const item_tax = item.tax_amount !== undefined ? parseFloat(item.tax_amount) : item_total - (item_total / (1.0 + (vat_rate / 100.0)));

            this.execute(
                `INSERT INTO sale_items (
                    sale_id, product_id, product_name, quantity, unit_price,
                    total_price, vat_rate, tax_amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [saleId, pid, item.product_name, qty, unit_price, item_total, vat_rate, item_tax]
            );

            // Update product stock
            // BUG-06 FIX: Use Math.floor instead of Math.round to avoid over-deducting stock
            // BUG-05 FIX: Ensure qty is integer for stock_logs (INTEGER column)
            const prod = this.getProductById(pid);
            if (prod) {
                const deductQty = Math.floor(parseFloat(qty));
                const newStock = prod.stock_quantity - deductQty;
                this.execute("UPDATE products SET stock_quantity = ? WHERE id = ?", [newStock, pid]);
                this.execute(
                    `INSERT INTO stock_logs (product_id, product_name, change_quantity, new_stock, reason)
                     VALUES (?, ?, ?, ?, ?)`,
                    [pid, item.product_name, -deductQty, newStock, `Satış (${receipt_no})`]
                );
            }
            }

            this.execute('COMMIT');

            const dateNow = new Date().toISOString().replace('T', ' ').substring(0, 19);
            return {
                sale_id: saleId,
                receipt_no,
                total_amount,
                discount,
                final_amount,
                tax_amount,
                payment_method,
                payment_amount_1: pay1,
                payment_method_2,
                payment_amount_2,
                pos_auth_code,
                created_at: dateNow
            };
        } catch (err) {
            this.execute('ROLLBACK');
            throw err;
        }
    }

    getSalesList(dateStart = '', dateEnd = '') {
        let sql = "SELECT * FROM sales WHERE 1=1";
        const params = [];
        if (dateStart) {
            sql += " AND created_at >= ?";
            params.push(`${dateStart} 00:00:00`);
        }
        if (dateEnd) {
            sql += " AND created_at <= ?";
            params.push(`${dateEnd} 23:59:59`);
        }
        sql += " ORDER BY id DESC";
        return this.queryAll(sql, params);
    }

    getSaleItems(saleId) {
        return this.queryAll("SELECT * FROM sale_items WHERE sale_id = ?", [saleId]);
    }

    processRefund(saleId) {
        const sale = this.queryOne("SELECT * FROM sales WHERE id = ?", [saleId]);
        // BUG-03 FIX: Use consistent refund status check covering all encoding variants
        const isRefunded = sale && (sale.status === 'İade Edildi' || sale.status === 'Iade Edildi' || sale.status === 'Ä°ade Edildi');
        if (!sale || isRefunded) {
            return false;
        }

        const items = this.getSaleItems(saleId);
        for (const item of items) {
            const pid = item.product_id;
            const qty = Math.round(parseFloat(item.quantity));
            const prod = this.getProductById(pid);
            if (prod) {
                const newStock = prod.stock_quantity + qty;
                this.execute("UPDATE products SET stock_quantity = ? WHERE id = ?", [newStock, pid]);
                this.execute(
                    `INSERT INTO stock_logs (product_id, product_name, change_quantity, new_stock, reason)
                     VALUES (?, ?, ?, ?, ?)`,
                    [pid, item.product_name, qty, newStock, `İade (${sale.receipt_no})`]
                );
            }
        }

        // BUG-03 FIX: Always write the canonical refund status string
        this.execute("UPDATE sales SET status = ? WHERE id = ?", ['İade Edildi', saleId]);
        return true;
    }

    deleteSale(saleId) {
        this.execute("DELETE FROM sale_items WHERE sale_id = ?", [saleId]);
        this.execute("DELETE FROM sales WHERE id = ?", [saleId]);
        return true;
    }

    deleteSales(saleIds) {
        if (!Array.isArray(saleIds) || saleIds.length === 0) return true;
        // BUG-20 FIX: Restore stock before deleting non-refunded sales
        for (const saleId of saleIds) {
            const sale = this.queryOne("SELECT * FROM sales WHERE id = ?", [saleId]);
            if (!sale) continue;
            const isRefunded = (sale.status === 'İade Edildi' || sale.status === 'Iade Edildi' || sale.status === 'Ä°ade Edildi');
            if (!isRefunded) {
                // Restore stock for items in this non-refunded sale
                const items = this.getSaleItems(saleId);
                for (const item of items) {
                    const prod = this.getProductById(item.product_id);
                    if (prod) {
                        const restoreQty = Math.floor(parseFloat(item.quantity));
                        const newStock = prod.stock_quantity + restoreQty;
                        this.execute("UPDATE products SET stock_quantity = ? WHERE id = ?", [newStock, item.product_id]);
                        this.execute(
                            `INSERT INTO stock_logs (product_id, product_name, change_quantity, new_stock, reason)
                             VALUES (?, ?, ?, ?, ?)`,
                            [item.product_id, item.product_name, restoreQty, newStock, `Kayıt Silme (${sale.receipt_no})`]
                        );
                    }
                }
            }
        }
        const placeholders = saleIds.map(() => '?').join(',');
        this.execute(`DELETE FROM sale_items WHERE sale_id IN (${placeholders})`, saleIds);
        this.execute(`DELETE FROM sales WHERE id IN (${placeholders})`, saleIds);
        return true;
    }

    // --- ALERTS & LOGS ---
    getCriticalStockProducts() {
        return this.queryAll("SELECT * FROM products WHERE stock_quantity <= min_stock_alert ORDER BY stock_quantity ASC");
    }

    getStockLogs(limit = 100) {
        return this.queryAll("SELECT * FROM stock_logs ORDER BY id DESC LIMIT ?", [limit]);
    }

    // --- REPORTS ---
    getDailySummary(dateStr = null) {
        if (!dateStr) {
            dateStr = new Date().toISOString().substring(0, 10);
        }

        // BUG-03 FIX: Use all encoding variants to ensure refunded sales are excluded
        const activeFilter = "status NOT IN ('İade Edildi', 'Iade Edildi', 'Ä°ade Edildi')";
        const summary = this.queryOne(`
            SELECT
                COUNT(*) as total_sales_count,
                COALESCE(SUM(final_amount), 0.0) as total_turnover,
                COALESCE(SUM(tax_amount), 0.0) as total_tax,
                COALESCE(SUM(discount), 0.0) as total_discounts,
                COALESCE(SUM(CASE WHEN payment_method = 'Nakit' THEN payment_amount_1 ELSE 0 END), 0.0) +
                COALESCE(SUM(CASE WHEN payment_method_2 = 'Nakit' THEN payment_amount_2 ELSE 0 END), 0.0) as cash_turnover,
                COALESCE(SUM(CASE WHEN payment_method = 'Kredi Kart\u0131' THEN payment_amount_1 ELSE 0 END), 0.0) +
                COALESCE(SUM(CASE WHEN payment_method_2 = 'Kredi Kart\u0131' THEN payment_amount_2 ELSE 0 END), 0.0) as card_turnover
            FROM sales
            WHERE DATE(created_at) = DATE(?) AND ${activeFilter}
        `, [dateStr]) || {};

        const costRow = this.queryOne(`
            SELECT COALESCE(SUM(si.quantity * p.cost_price), 0.0) as total_cost
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE DATE(s.created_at) = DATE(?) AND ${activeFilter}
        `, [dateStr]);

        const total_cost = costRow ? costRow.total_cost : 0.0;
        summary.total_cost = total_cost;
        summary.net_profit = (summary.total_turnover || 0.0) - total_cost;

        return summary;
    }

    getEndOfDayReport(dateStr = null) {
        if (!dateStr) {
            dateStr = new Date().toISOString().substring(0, 10);
        }

        // BUG-03 FIX: Use all encoding variants to ensure refunded sales are excluded
        const activeFilter = "status NOT IN ('İade Edildi', 'Iade Edildi', 'Ä°ade Edildi')";
        const summary = this.queryOne(`
            SELECT
                COUNT(*) as total_sales_count,
                COALESCE(SUM(final_amount), 0.0) as grand_total,
                COALESCE(SUM(tax_amount), 0.0) as total_tax,
                COALESCE(SUM(CASE WHEN payment_method = 'Nakit' THEN payment_amount_1 ELSE 0 END), 0.0) +
                COALESCE(SUM(CASE WHEN payment_method_2 = 'Nakit' THEN payment_amount_2 ELSE 0 END), 0.0) as cash_total,
                COALESCE(SUM(CASE WHEN payment_method = 'Kredi Kart\u0131' THEN payment_amount_1 ELSE 0 END), 0.0) +
                COALESCE(SUM(CASE WHEN payment_method_2 = 'Kredi Kart\u0131' THEN payment_amount_2 ELSE 0 END), 0.0) as credit_total
            FROM sales
            WHERE DATE(created_at) = DATE(?) AND ${activeFilter}
        `, [dateStr]) || {};

        const itemsSold = this.queryAll(`
            SELECT
                p.name,
                p.barcode,
                SUM(si.quantity) as total_qty,
                SUM(si.total_price) as total_revenue
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE DATE(s.created_at) = DATE(?) AND ${activeFilter}
            GROUP BY p.id, p.name, p.barcode
            ORDER BY total_qty DESC, total_revenue DESC
        `, [dateStr]);

        summary.items_sold = itemsSold;
        return summary;
    }

    extractGrammages(str) {
        if (!str) return [];
        const norm = this.normalizeSearchText(str).replace(/,/g, '.');
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
    }

    extractFlavors(str) {
        if (!str) return [];
        const norm = this.normalizeSearchText(str);
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
    }

    isValidVariantMatch(name1, name2) {
        const grams1 = this.extractGrammages(name1);
        const grams2 = this.extractGrammages(name2);
        if (grams1.length > 0 && grams2.length > 0) {
            if (grams1.sort().join(',') !== grams2.sort().join(',')) {
                return false;
            }
        }
        const flavors1 = this.extractFlavors(name1);
        const flavors2 = this.extractFlavors(name2);
        if (flavors1.length > 0 && flavors2.length > 0) {
            if (flavors1.sort().join(',') !== flavors2.sort().join(',')) {
                return false;
            }
        }
        return true;
    }

    // BUG-11 FIX: Externalize category mapping rules to avoid hardcoded mappings
    getCategoryMappingRules() {
        let rulesStr = this.getSetting('ai_custom_rules', '');
        let rules = [];
        if (rulesStr) {
            try {
                rules = JSON.parse(rulesStr);
            } catch (e) {}
        }
        // Default built-in rules if none defined in settings
        if (rules.length === 0) {
            rules = [
                { keyword: 'kedi kumu', category: 'Kedi Kumu' },
                { keyword: 'kum', category: 'Kedi Kumu' },
                { keyword: 'köpek maması', category: 'Mama' },
                { keyword: 'kedi maması', category: 'Mama' },
                { keyword: 'tasma', category: 'Aksesuar' },
                { keyword: 'oyuncak', category: 'Oyuncak' },
                { keyword: 'şampuan', category: 'Bakım & Sağlık' },
                { keyword: 'damla', category: 'Bakım & Sağlık' },
                { keyword: 'vitamin', category: 'Bakım & Sağlık' }
            ];
        }
        return rules;
    }

    addOrUpdateStockByBarcode(barcode, name, addedStock, price = 0.0, costPrice = 0.0, unit = 'Adet', category = 'Genel') {
        const barcodeVal = barcode && barcode.trim() ? barcode.trim() : null;
        const nameVal = name ? name.trim() : '';

        if (!nameVal || addedStock <= 0) return false;

        let row = null;
        if (barcodeVal) {
            row = this.queryOne("SELECT * FROM products WHERE barcode = ?", [barcodeVal]);
        }
        if (!row) {
            row = this.queryOne("SELECT * FROM products WHERE LOWER(name) = LOWER(?)", [nameVal]);
        }
        if (!row) {
            const normName = this.normalizeSearchText(nameVal);
            const tokens = normName.split(' ').filter(t => t.length > 1);
            if (tokens.length >= 2) {
                const allProds = this.queryAll("SELECT * FROM products");
                let bestMatch = null;
                let maxCount = 0;
                for (const p of allProds) {
                    if (!this.isValidVariantMatch(nameVal, p.name)) continue;
                    const normP = this.normalizeSearchText(p.name);
                    const pTokens = normP.split(' ').filter(t => t.length > 1);
                    const count = tokens.filter(t => pTokens.includes(t)).length;
                    if (count >= Math.ceil(tokens.length * 0.90) && count > maxCount) {
                        maxCount = count;
                        bestMatch = p;
                    }
                }
                if (bestMatch) {
                    row = bestMatch;
                }
            }
        }

        // Strictly map category to official petshop categories to prevent creating extra categories
        let catVal = 'Mama';
        const rawCat = ((category || '') + ' ' + nameVal).toLowerCase();
        if (rawCat.includes('yaş') || rawCat.includes('yas') || rawCat.includes('konserve') || rawCat.includes('pouch') || rawCat.includes('çorba') || rawCat.includes('corba') || rawCat.includes('krema') || rawCat.includes('ödül') || rawCat.includes('odul') || rawCat.includes('stick') || rawCat.includes('sosis') || rawCat.includes('ezme')) {
            catVal = 'Yaş Mama';
        } else if (rawCat.includes('oyuncak') || rawCat.includes('top') || rawCat.includes('tırmalama')) {
            catVal = 'Oyuncak';
        } else if (rawCat.includes('kum') || rawCat.includes('bentonit')) {
            catVal = 'Kedi Kumu';
        } else if (rawCat.includes('kap') || rawCat.includes('suluk')) {
            catVal = 'Mama Kapları';
        } else if (rawCat.includes('tasma') || rawCat.includes('tarak') || rawCat.includes('şampuan') || rawCat.includes('ped')) {
            catVal = 'Aksesuar';
        } else if (rawCat.includes('çanta') || rawCat.includes('canta') || rawCat.includes('taşıma')) {
            catVal = 'Taşıma Çantası';
        } else if (rawCat.includes('yatak')) {
            catVal = 'Yatak';
        } else if (row) {
            catVal = row.category;
        } else if (category && category.trim()) {
            catVal = category.trim();
        }

        // Fetch category margins for dynamic price calculation
        const catRow = this.queryOne("SELECT margin_percent, card_margin_percent FROM categories WHERE name = ?", [catVal]);
        const cashMargin = catRow ? parseFloat(catRow.margin_percent || 30.0) : 30.0;
        const cardMargin = catRow ? parseFloat(catRow.card_margin_percent !== null && catRow.card_margin_percent !== undefined ? catRow.card_margin_percent : (cashMargin + 5.0)) : (cashMargin + 5.0);
        const cashMultiplier = 1.0 + (cashMargin / 100.0);
        const cardMultiplier = 1.0 + (cardMargin / 100.0);

        if (row) {
            const newStock = row.stock_quantity + parseInt(addedStock, 10);
            const newCost = costPrice > 0 ? costPrice : row.cost_price;
            const computedSale = Number((newCost * cashMultiplier).toFixed(2));
            const computedCard = Number((newCost * cardMultiplier).toFixed(2));
            const newSale = price > 0 ? price : (computedSale > 0 ? computedSale : row.sale_price);
            const newCard = computedCard > 0 ? computedCard : (row.card_price || Number((newSale * 1.05).toFixed(2)));

            this.execute(
                `UPDATE products
                 SET barcode = COALESCE(?, barcode), category = ?, stock_quantity = ?, sale_price = ?, card_price = ?, cost_price = ?, unit = ?
                 WHERE id = ?`,
                [barcodeVal, catVal, newStock, newSale, newCard, newCost, unit || row.unit, row.id]
            );
            this.execute(
                `INSERT INTO stock_logs (product_id, product_name, change_quantity, new_stock, reason)
                 VALUES (?, ?, ?, ?, ?)`,
                [row.id, row.name, parseInt(addedStock, 10), newStock, "AI Stok Aktarimi"]
            );
        } else {
            const computedSale = Number((costPrice * cashMultiplier).toFixed(2));
            const computedCard = Number((costPrice * cardMultiplier).toFixed(2));
            const salePrice = price > 0 ? price : (computedSale > 0 ? computedSale : 0.0);
            const cardPrice = computedCard > 0 ? computedCard : (salePrice ? Number((salePrice * 1.05).toFixed(2)) : 0.0);

            const pid = this.execute(
                `INSERT INTO products (barcode, name, category, cost_price, sale_price, card_price, stock_quantity, min_stock_alert, unit)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [barcodeVal, nameVal, catVal, costPrice, salePrice, cardPrice, parseInt(addedStock, 10), 5, unit || "Adet"]
            );
            this.execute(
                `INSERT INTO stock_logs (product_id, product_name, change_quantity, new_stock, reason)
                 VALUES (?, ?, ?, ?, ?)`,
                [pid, nameVal, parseInt(addedStock, 10), parseInt(addedStock, 10), "AI Stok Aktarimi"]
            );
        }

        return true;
    }

    // --- SETTINGS ---
    getSetting(key, defaultValue = '') {
        const row = this.queryOne("SELECT value FROM settings WHERE key = ?", [key]);
        if (row && row.value !== null) {
            if (key === 'gemini_api_key' && safeStorage.isEncryptionAvailable()) {
                try {
                    const enc = Buffer.from(row.value, 'base64');
                    return safeStorage.decryptString(enc);
                } catch (e) {
                    console.error("Failed to decrypt API key:", e);
                    return row.value; // Fallback to plaintext if decryption fails (e.g., legacy data)
                }
            }
            return row.value;
        }
        return defaultValue;
    }

    setSetting(key, value) {
        let storeValue = String(value);
        if (key === 'gemini_api_key' && safeStorage.isEncryptionAvailable()) {
            try {
                storeValue = safeStorage.encryptString(storeValue).toString('base64');
            } catch (e) {
                console.error("Failed to encrypt API key:", e);
            }
        }
        this.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, storeValue]);
        return true;
    }

    getSettings() {
        const rows = this.queryAll("SELECT key, value FROM settings");
        const settings = {};
        for (const r of rows) {
            if (r.key === 'gemini_api_key' && safeStorage.isEncryptionAvailable()) {
                try {
                    const enc = Buffer.from(r.value, 'base64');
                    settings[r.key] = safeStorage.decryptString(enc);
                } catch (e) {
                    settings[r.key] = r.value;
                }
            } else {
                settings[r.key] = r.value;
            }
        }
        return settings;
    }

    clearEntireDatabase(keepSettings = false) {
        this.db.run("PRAGMA foreign_keys = OFF;");
        this.execute("DELETE FROM sale_items");
        this.execute("DELETE FROM sales");
        this.execute("DELETE FROM stock_logs");
        this.execute("DELETE FROM products");
        this.execute("DELETE FROM categories");

        // Re-seed default categories on reset (including card_margin_percent)
        const defaultCats = [
            ["Mama", 30.0, 35.0],
            ["Ya\u015f Mama", 100.0, 100.0],
            ["Oyuncak", 40.0, 45.0],
            ["Ta\u015f\u0131ma \u00c7antas\u0131", 35.0, 40.0],
            ["Bak\u0131m & Sa\u011fl\u0131k", 35.0, 40.0],
            ["Kedi Kumu", 25.0, 30.0],
            ["Aksesuar", 40.0, 45.0],
            ["Genel", 30.0, 35.0],
            ["Mama Kaplar\u0131", 30.0, 35.0],
            ["Yatak", 35.0, 40.0]
        ];
        for (const [cName, cCash, cCard] of defaultCats) {
            this.execute("INSERT OR IGNORE INTO categories (name, margin_percent, card_margin_percent) VALUES (?, ?, ?)", [cName, cCash, cCard]);
        }

        if (!keepSettings) {
            this.execute("DELETE FROM settings");
            this.initSchema();
        }

        this.db.run("PRAGMA foreign_keys = ON;");
        this.save();
        return true;
    }

    exportBackup(targetPath) {
        try {
            // Flush in-memory DB to disk before copying
            this.save();
            if (this.db) {
                try { this.db.run("PRAGMA wal_checkpoint(FULL);"); } catch (e) { }
            }
            fs.copyFileSync(this.dbPath, targetPath);
            return { success: true, filePath: targetPath };
        } catch (err) {
            console.error('Export backup error:', err);
            return { success: false, error: err.message };
        }
    }

    async importBackup(sourcePath) {
        try {
            if (!fs.existsSync(sourcePath)) {
                return { success: false, error: 'Yedek dosyası bulunamadı.' };
            }
            if (this.db) {
                try { this.db.close(); } catch (e) { }
                this.db = null;
            }
            fs.copyFileSync(sourcePath, this.dbPath);
            await this.init();
            return { success: true };
        } catch (err) {
            console.error('Import backup error:', err);
            try { await this.init(); } catch (e) { }
            return { success: false, error: err.message };
        }
    }

    exportBarcodes(filePath) {
        try {
            // Use queryAll wrapper (sql.js doesn't support better-sqlite3's .all() API)
            const products = this.queryAll(`SELECT name, barcode FROM products WHERE barcode IS NOT NULL AND barcode != ''`);
            const data = JSON.stringify(products, null, 2);
            fs.writeFileSync(filePath, data, 'utf-8');
            return { success: true };
        } catch (err) {
            console.error('Export barcodes error:', err);
            return { success: false, error: err.message };
        }
    }

    importBarcodes(sourcePath) {
        try {
            if (!fs.existsSync(sourcePath)) {
                return { success: false, error: 'JSON dosyası bulunamadı.' };
            }
            const data = fs.readFileSync(sourcePath, 'utf-8');
            const items = JSON.parse(data);
            if (!Array.isArray(items)) {
                return { success: false, error: 'Geçersiz JSON formatı.' };
            }

            // Use execute() wrapper — sql.js doesn't support better-sqlite3's .prepare().run() / .transaction() API
            let updatedCount = 0;
            for (const item of items) {
                if (item.name && item.barcode) {
                    // BUG-04 FIX: Use LIMIT 1 to avoid updating multiple products with same name
                    // and triggering UNIQUE constraint violations on barcode column
                    const existing = this.queryOne('SELECT id, barcode FROM products WHERE name = ? LIMIT 1', [item.name]);
                    if (existing) {
                        this.execute(`UPDATE products SET barcode = ? WHERE id = ?`, [item.barcode, existing.id]);
                        updatedCount++;
                    }
                }
            }

            return { success: true, updatedCount };
        } catch (err) {
            console.error('Import barcodes error:', err);
            return { success: false, error: err.message };
        }
    }
}

module.exports = new PosDatabase();
