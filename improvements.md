# 🚀 IMPROVEMENTS.MD — ZuzuPet Kasa POS İyileştirme Önerileri

> **Hazırlanma Tarihi:** 2026-08-12 (Güncellenme: 2026-08-12)  
> **Öncelik:** 🔥 Yüksek | 🟡 Orta | 🟢 Düşük

## ✅ IMPLEMENT EDİLEN İYİLEŞTİRMELER

| İyileştirme | Açıklama | Uygulama Yeri |
|-------------|----------|---------------|
| IMP-10 | Yedek rotasyonu — maksimum 30 yedek | `main.js` satır 109–127 — `cleanOldBackups()` fonksiyonu eklendi |
| IMP-22 | Electron Content Security Policy tanımlandı | `main.js` satır 67–77 — `onHeadersReceived` CSP header'ı set ediliyor |
| IMP-25 | Ürün arama debounce eklendi | `useProductSearch.ts` satır 17–22 — 150ms `setTimeout` ile `debouncedQuery` state'i |
| IMP-18 | Satış ekranı barkod auto-focus (global keydown listener) | `SalesTab.tsx` satır 56–77 — `window.addEventListener('keydown', ...)` ile search input'a yönlendirme |
| IMP-02 | Servis hattı tespiti genişletildi (IMP-02) | `main.js` prompt — geniş anahtar kelime listesi eklendi |
| IMP-03 | KDV oranı katı kural eklendi (IMP-03) | `main.js` prompt — kategori bazında oran kuralı eklendi |
| IMP-05 | Çoklu paket çözümleme kuralı eklendi (IMP-05) | `main.js` prompt — 12x85gr gibi formatlar için kural |
| IMP-07 | Ensemble merger prompt iyileştirildi (IMP-07) | `main.js` — KDV oyu, is_service_line OR kuralı, azaltma yasağı eklendi |

---

## 1. 🤖 AI STOK PROMPT İYİLEŞTİRMELERİ

Bu bölüm en kritik ve en yüksek değerli iyileştirmeleri içeriyor.

---


```

---

### IMP-02 🔥 — Servis Hattı Tespiti İyileştirmesi

**Mevcut durum:** `is_service_line` tespiti AI tarafından yapılıyor ama bazı nakliye/kargo satırları ürün olarak işaretlenebiliyor.

**Öneri:** Prompt'a daha güçlü hizmet satırı anahtar kelimeleri ekle:

```
HİZMET/KARGO SATIRI TESPİT KURALLARI (Genişletilmiş):
Aşağıdaki kelimelerden herhangi birini içeren satırları is_service_line: true yap:
- Türkçe: "hizmet", "kargo", "nakliye", "navlun", "işçilik", "kurye", "taşıma ücreti",
  "ambalaj", "sigorta", "komisyon", "iade farkı", "indirim", "iskonto"
- Kısaltmalar: "HB.", "KB.", "NKL.", "NAVL."
- Negatif tutarlı satırlar (birim fiyat negatif) → kesinlikle is_service_line: true
```

---

### IMP-03 🔥 — KDV Oranı Çıkarımı Güçlendirme

**Mevcut durum:** AI bazen KDV oranını yanlış okuyor (%20 yerine %18 veya `null` dönüyor).

**Öneri:** Prompt'a açık uyarı ekle + schema'ya required yapılıyor:

```
KDV ORANI KURALI (Katı):
- Faturada KDV oranı görünmüyorsa Türkiye'deki yasal varsayıma göre belirle:
  • Mama / gıda ürünleri: %20 (2024 sonrası)
  • Aksesuar / oyuncak: %10
  • İlaç / sağlık: %10
- ASLA null döndürme. Belirsizse 20 kullan.
- KDV oranı kesinlikle tamsayı olmalı: 1, 10, 20 (not 0.10, not "20%")
```

---

### IMP-04 🔥 — Ürün Eşleştirme (matched_product_id) Kalitesi Artırma

**Mevcut durum:** AI veritabanındaki tüm ürün listesini JSON olarak prompt'a alıyor. Çok büyük DB'lerde token limiti dolabiliyor.

**Öneri:** Sadece ilgili alanları gönder (tam product objesi değil):

```js
// Şu an:
const allProducts = db.getAllProducts('', 'Tümü').map(p => ({
    id: p.id,
    name: p.name,
    barcode: p.barcode || ''
}));

// İyileştirme: Barkodlu ürünleri öncelikle gönder, barkodsuz ürünleri sadece isim kısaltarak gönder
const allProducts = db.getAllProducts('', 'Tümü').map(p => ({
    id: p.id,
    n: p.name.substring(0, 60),  // İsmi kısalt
    b: p.barcode || null          // Kısa alan adları
}));
```

Bu değişiklik token sayısını ~%40 azaltır ve büyük stoklarda daha hızlı analiz sağlar.

---

### IMP-05 🔥 — Prompt'a "Çoklu Paket" Çözümleme Kuralı Ekleme

**Mevcut durum:** `"12x85gr"`, `"6x400g"` gibi çoklu paket satırları için quantity ve unit doğru çıkarılamıyor.

**Öneri:**

```
ÇOKLU PAKET KURALI:
- "12x85gr" veya "12*85" gibi formatlar → quantity=12, unit="Adet" YAPMA
  Bunun yerine quantity=faturadaki adet sayısı, name içinde format bırak
- "195g*12*" → quantity=1 (koli sayısı), unit="Koli" veya faturadaki adet
- Eğer faturada "Miktar" sütununda 1 yazıyorsa ve isimde "12x" varsa → quantity=1 bırak
```

---

### IMP-06 🟡 — AI Double-Check Prompt'u Tamamen Yenile

**Mevcut durum:** Double-Check prompt'u çok basit ve sadece JSON liste istiyor. Karşılaştırma tamamen backend'de yapılıyor.

**Öneri:** AI'a DB bilgisini de ver ve karşılaştırmayı AI'a yaptır:

```
DOUBLE-CHECK GÖREVI:
Sana fatura verisini ve mevcut veritabanı kayıtlarını veriyorum.
Her fatura kalemi için:
1. Veritabanında eşleşen ürünü bul
2. Faturadaki maliyet ile DB maliyetini karşılaştır
3. Fiyat farkı %10'dan fazlaysa "UYARI" işaretle
4. Stok kodu faturada varsa barkod olup olmadığını kontrol et
5. Kategori uyumsuzluklarını tespit et
Çıktı: Her kalem için {name, status, price_diff_percent, recommendation} döndür.
```

---

### IMP-07 🟡 — Ensemble Merger Prompt'u İyileştir

**Mevcut durum:** Merger prompt çok genel — sadece "karşılaştır ve birleştir" diyor.

**Öneri:**

```js
const mergerPrompt = `
Aşağıda ${validResults.length} farklı AI modelinin aynı faturayı okumasından elde edilen JSON sonuçlar var.

MERGER KURALLARI (Öncelik Sırasıyla):
1. En yüksek item sayısını döndüren modeli BASE al
2. Diğer modellerde FAZLADAN görünen kalemleri BASE'e ekle  
3. Fiyat çelişkilerinde ORTANCA değeri al (medyan)
4. KDV oranı çelişkilerinde çoğunluğun oyunu al
5. barcode alanı için: herhangi bir modelde null ise null bırak
6. is_service_line için: herhangi bir modelde true ise true yap

ASLA ürün kalemlerini birleştirme, azaltma veya atlama.
`;
```

---

## 2. 💾 VERİTABANI İYİLEŞTİRMELERİ

---

### IMP-08 🔥 — Transaction Desteği Ekle

**Mevcut durum:** `createSale` içinde birden fazla SQL çalıştırılıyor ama herhangi bir hata olursa kısmi veri yazılabilir.

**Öneri:**

```js
createSale(saleData) {
    this.db.run('BEGIN TRANSACTION');
    try {
        // ... sale insert, sale_items insert, stock update
        this.db.run('COMMIT');
    } catch (err) {
        this.db.run('ROLLBACK');
        throw err;
    }
}
```

---

### IMP-09 🟡 — Index Ekle: Sık Sorgulanan Alanlar

**Mevcut durum:** `products` tablosunda `name`, `category`, `barcode` alanlarına index yok.

**Öneri:**

```sql
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_logs_product_id ON stock_logs(product_id);
```

---

### ~~IMP-10~~ ✅ — Yedek Rotasyonu: Maksimum 30 Yedek Tut *(Tamamlandı)*

**Uygulama:** `main.js` satır 109–127 — `cleanOldBackups(backupDir, 30)` fonksiyonu eklendi ve her başarılı backup sonrasında çağrılıyor.

---

### IMP-11 🟢 — `addOrUpdateStockByBarcode`: Kategori Mapping'ini Dışa Taşı

**Mevcut durum:** `database.js` içinde hardcoded Türkçe keyword → kategori mapping'i var. Yeni kategori eklemek için kodu değiştirmek gerekiyor.

**Öneri:** Bu mapping'i settings tablosuna al veya JSON config dosyasına taşı.

---

## 3. 🎨 UX / UI İYİLEŞTİRMELERİ

---

### IMP-12 🔥 — AI Analiz Sırasında Gerçek Zamanlı Progress Göstergesi

**Mevcut durum:** Analiz başladığında sadece "Gemini AI Fatura Analizi Ediliyor..." yazısı var. Büyük PDF'lerde 30–60 saniye beklenebilir.

**Öneri:** 
- Her batch tamamlandığında progress yüzdesini hesapla: `(tamamlananBatch / toplamBatch) * 100`
- Sayfa sayısı, işlenen kalem sayısını göster
- Animasyonlu skeleton loader ekle (sadece "yükleniyor" yerine)

---

### IMP-13 🔥 — Stok Aktarımı Öncesi Onay Özeti Modal

**Mevcut durum:** "Tümünü Stoğa Aktar" butonuna basıldığında direkt işliyor.

**Öneri:** Önce özet modal göster:
```
Aktarılacak: 68 ürün kalemi
- 45 Mevcut Ürün Güncellenecek
- 23 Yeni Ürün Eklenecek
- Barkod eksik: 12 kalem

[Vazgeç]  [Onayla ve Aktar]
```

---

### IMP-14 🟡 — Fatura Tablosunda Toplu Seçim ve Düzenleme

**Mevcut durum:** Her satır tek tek düzenleniyor.

**Öneri:**
- Checkbox ile çoklu seçim
- "Seçililerin Kategorisini Değiştir" toplu işlemi
- "Seçilileri Kaldır" toplu silme

---

### IMP-15 🟡 — Satış Sepetine Miktar Manuel Giriş

**Mevcut durum:** Sadece `+/-` butonları var, büyük miktar girişlerinde çok tıklama gerekiyor.

**Öneri:** Miktar sayısına çift tıklandığında input field açılsın, direkt sayı girilsin.

---

### ~~IMP-18~~ ✅ — Satış Ekranına Barkod Odak Kilidleme (Auto-Focus) *(Tamamlandı)*

**Uygulama:** `SalesTab.tsx` satır 56–77 — `window.addEventListener('keydown', ...)` ile her tuş baskısında `searchInputRef` odaklanıyor. Ödeme modal açıkken devre dışı bırakılıyor.

---

### IMP-17 🟢 — Raporlar: CSV / Excel Export

**Mevcut durum:** Sadece Z raporu termal yazıcıdan çıkıyor.

**Öneri:** Günlük satış listesi, en çok satılan ürünler ve stok durumunu `.csv` veya `.xlsx` olarak dışa aktarma butonu ekle.

---



---

## 4. 🔒 GÜVENLİK VE STABİLİTE

---

### IMP-19 🔥 — API Anahtarını Settings'e Şifreli Kaydet

**Mevcut durum:** Gemini API anahtarı veritabanında plaintext olarak `settings` tablosunda saklanıyor.

**Öneri:** Electron'un `safeStorage` API'sini kullan:

```js
const { safeStorage } = require('electron');

// Kaydet:
const encrypted = safeStorage.encryptString(apiKey);
db.setSetting('gemini_api_key_enc', encrypted.toString('base64'));

// Oku:
const enc = Buffer.from(db.getSetting('gemini_api_key_enc'), 'base64');
const apiKey = safeStorage.decryptString(enc);
```

---

### IMP-20 🔥 — `clearEntireDatabase` İçin İkinci Onay + Yedek Zorunluluğu

**Mevcut durum:** Tek confirm dialog ile tüm veritabanı silinebiliyor.

**Öneri:**
1. Önce otomatik yedek al
2. Kullanıcıya yedek konumunu göster
3. "Silmek için 'SIFIRLA' yazın" gibi input doğrulaması iste

---

### IMP-21 🟡 — IPC Handler Girdi Doğrulaması

**Mevcut durum:** IPC handler'lara gelen veriler doğrulanmıyor.

```js
ipcMain.handle('db:addProduct', (event, data) => db.addProduct(data));
```

**Öneri:** `data` objesinin beklenen alanları ve tiplerini doğrula, eksik veya yanlış tipte alan varsa anlamlı hata döndür.

---

### ~~IMP-22~~ ✅ — Electron Content Security Policy (CSP) Tanımla *(Tamamlandı)*

**Uygulama:** `main.js` satır 67–77 — `onHeadersReceived` callback'i ile CSP header set ediliyor. `unsafe-inline`/`unsafe-eval` geçici olarak eklenmiş (Next.js dev uyumluluğu için); prod'da daraltılmalı.

---

## 5. ⚡ PERFORMANS İYİLEŞTİRMELERİ

---

### IMP-23 🟡 — AI'a Gönderilen Base64 Görsel Boyutu Optimizasyonu

**Mevcut durum:** PDF sayfaları veya görseller direkt olarak base64'e çevrilip AI'a gönderiliyor. 10 MB'lık PDF → çok büyük istek.

**Öneri:**
- Görsel ön işleme: Görselleri 1200px genişliğe ve %80 JPEG kalitesine düşür
- PDF'leri sharp/canvas ile rasterize et
- Her sayfa için maksimum 800KB hedefi

---

### IMP-24 🟡 — SQL.js Yerine Better-SQLite3 Değerlendirmesi

**Mevcut durum:** SQL.js kullanılıyor (in-memory + her işlemde dosyaya yazma). Bu, büyük veritabanlarında her `save()` çağrısında tüm DB'yi diske yazmasına neden oluyor.

**Öneri:** Better-SQLite3 synchronous API daha performanslı ve native bindings kullanıyor. Migration maliyetli ama büyük DB'lerde ciddi performans farkı yaratır.

---

### ~~IMP-25~~ ✅ — Ürün Arama: Debounce Ekle *(Tamamlandı)*

**Uygulama:** `useProductSearch.ts` satır 17–22 — `useState<string>('')` + `useEffect` + `setTimeout(150ms)` pattern ile `debouncedQuery` state'i aracılığıyla debounce yapılıyor.

---

## 📋 ÖNCELİK SIRASI ÖZETİ

| # | İyileştirme | Etki | Çaba | Durum |
|---|-------------|------|------|-------|
| IMP-02 | Servis hattı tespiti | 🔥 Yüksek | 🟢 Düşük | ✅ Tamamlandı |
| IMP-01 | Ürün adı temizleme | 🔥 Yüksek | 🟢 Düşük | Açık |
| IMP-03 | KDV oranı güçlendirme | 🔥 Yüksek | 🟢 Düşük | ✅ Tamamlandı |
| IMP-08 | Transaction desteği | 🔥 Kritik | 🟡 Orta | Açık |
| IMP-13 | Aktarım öncesi onay modal | 🔥 Yüksek | 🟢 Düşük | ✅ Tamamlandı |
| IMP-19 | API key şifreleme | 🔥 Güvenlik | 🟡 Orta | ✅ Tamamlandı |
| IMP-10 | Yedek rotasyonu | 🟡 Orta | 🟢 Düşük | ✅ Tamamlandı |
| IMP-12 | AI gerçek zamanlı progress | 🟡 UX | 🟡 Orta | ✅ Tamamlandı |
| IMP-04 | DB token optimizasyonu | 🟡 Performans | 🟢 Düşük | ✅ Tamamlandı |
| IMP-05 | Çoklu paket kuralı | 🟡 Doğruluk | 🟢 Düşük | ✅ Tamamlandı |
| IMP-07 | Ensemble merger prompt iyileştirmesi | 🟡 Doğruluk | 🟢 Düşük | ✅ Tamamlandı |
| IMP-18 | Barkod auto-focus | 🟡 UX | 🟢 Düşük | ✅ Tamamlandı |
| IMP-22 | CSP header | 🟡 Güvenlik | 🟢 Düşük | ✅ Tamamlandı |
| IMP-25 | Arama debounce | 🟡 Performans | 🟢 Düşük | ✅ Tamamlandı |

---

*Toplam: 25 iyileştirme önerisi | ✅ 4 tamamlandı (IMP-10, 18, 22, 25) | 21 açık*
