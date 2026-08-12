# 🐛 BUGS.MD — ZuzuPet Kasa POS Sistem Hata Raporu

> **Tarama Tarihi:** 2026-08-12 (Güncellenme: 2026-08-12)
> **Tarama Kapsamı:** electron/main.js, electron/database.js, electron/pos_terminal.js, src/hooks/*, src/components/*

---

## ✅ ÇÖZÜLEN HATALAR

| Hata | Açıklama | Çözüm Yeri |
|------|----------|------------|
| BUG-02 | AI Stok Aktarımında `card_price` güncellenmiyordu | `useAIAnalysis.ts` satır 514–524 — margin'den hesaplanıp yazılıyor |
| BUG-03 | İade statüsü encoding migration | `database.js` `initSchema()` — tek seferlik UPDATE ile eski kayıtlar canonical'a çeviriliyor |
| BUG-04 | Barkod import: aynı isimli ürünlerde UNIQUE kısıtı ihlali | `database.js` satır 1216 — `LIMIT 1` ile `id` bazında güncelleme |
| BUG-07 | Yedekleme dosyaları birikerek diski dolduruyordu | `main.js` satır 109–127 — `cleanOldBackups(backupDir, 30)` eklendi |
| BUG-08 | Analiz hatasında eski fatura tablosu ekranda kalıyordu | `useAIAnalysis.ts` satır 301 — `setParsedItems([])` çağrılıyor |
| BUG-09 | Versiyon kontrolü string karşılaştırması kullanıyordu | `main.js` satır 278 — `semverGt()` ile doğru semver karşılaştırması |
| BUG-11 | Ensemble modda tek batch başarısız olursa tüm analiz duruyordu | `main.js` satır 896–900 — `throw` yerine `continue` ile batch atlanıyor |
| BUG-15 | `handleAssignScannedBarcode` stale state kullanıyordu | `useAIAnalysis.ts` — `updatedItems` array ile next index hesabı |
| BUG-19 | `URL.createObjectURL` unmount'ta revoke edilmiyordu | `useAIAnalysis.ts` satır 55–65 — `filePreviewsRef` ile unmount'ta revoke |
| BUG-20 | `deleteSales` stok geri eklemeden direkt siliyordu | `database.js` satır 765–780 — silmeden önce stoklar geri ekleniyor |

---

## 🔴 KRİTİK HATALAR

*(Açık kritik hata bulunmuyor)*

---

## 🟡 ORTA ÖNEMLİ HATALAR

---

### BUG-03 — İade Statüsü Türkçe Karakter Uyumsuzluğu (Kısmen Giderildi)
**Dosya:** `electron/database.js` satır 731, 769, 810 ve `electron/main.js` satır 1161

```js
// database.js — okuma (3 encoding hâlâ kontrol ediliyor):
const isRefunded = sale.status === 'İade Edildi' || sale.status === 'Iade Edildi' || sale.status === 'Ä°ade Edildi';

// database.js — yazma (doğru, canonical):
this.execute("UPDATE sales SET status = ? WHERE id = ?", ['İade Edildi', saleId]);
```

**Sorun:** Yazma artık canonical kullanıyor (kısmi fix), ancak okuma tarafında hâlâ 3 encoding kontrol ediliyor. Eski bozuk kayıtlar DB'de kalabilir.

**Çözüm:** DB migration ile eski kayıtları canonical stringe dönüştür, ardından okuma tarafını tek karşılaştırmaya indir.

---

### BUG-05 — Stok Log: Float Miktar INTEGER Kolona Yazılabiliyor
**Dosya:** `electron/database.js` satır 152

```sql
change_quantity INTEGER NOT NULL,
```

`useAIAnalysis.ts` tarafından `item.quantity` doğrudan gönderiliyor ve bu değer faturada `12.5` gibi float olabilir. `addOrUpdateStockByBarcode` içinde `parseInt(addedStock, 10)` yapılıyor ama `updateProduct` path'inde bu dönüşüm yok.

---

### BUG-06 — Satış Kaydında Stok Round Hatası
**Dosya:** `electron/database.js` satır 658

```js
const newStock = prod.stock_quantity - Math.round(qty);
```

`Math.round(1.5) = 2` — 1.5 adet satıldığında 2 adet düşülebilir. `Math.ceil` veya `parseInt` daha güvenli.

---

### BUG-10 — Thermal Printer: Yazıcı Adı Ayardan Okunmuyor
**Dosya:** `electron/main.js` satır 484

```js
deviceName: ''  // Her zaman OS default yazıcısını kullanır
```

Kullanıcı ayarlardan özel termal yazıcı adı girebilmeli.

---

## 🟢 KÜÇÜK HATALAR / UX SORUNLARI

---

### BUG-12 — RefundsTab: Tarihsiz Sorguda Tüm Satışlar Yükleniyor (Performans)
**Dosya:** `src/components/RefundsTab.tsx` satır 24–26

Tarih alanları boşken `getSalesList('', '')` tüm satış geçmişini çekiyor. Binlerce kayıt olabilir. Varsayılan olarak son 30 gün filtresi eklenmeli.

---

### BUG-13 — ReportsTab Z-Raporu Yazdırma Hatası Sessizce Yutuluyor
**Dosya:** `src/components/ReportsTab.tsx` satır 84–87

```ts
} catch (err: any) {
    console.error('Z Report print error:', err);
    // Kullanıcıya hiçbir uyarı gösterilmiyor
}
```

---

### BUG-14 — AlertsTab Hızlı Stok Ekle: `reason` Generic "Manuel Stok Düzenleme" Yazılıyor
**Dosya:** `src/components/AlertsTab.tsx` satır 39–42

Stock log'da "Manuel Stok Düzenleme" yerine "Kritik Stok Tamamlama" yazılmalı — filtreleme ve audit için.

---

### BUG-15 — `handleAssignScannedBarcode`: Stale State Kullanımı
**Dosya:** `src/hooks/useAIAnalysis.ts` satır 497

```ts
// setParsedItems async'tir. Hemen ardından eski parsedItems üzerinden findIndex çalışıyor:
const nextNoBarcodeIndex = parsedItems.findIndex((item, idx) => ...);
```

Barkod atamasından sonra bir sonraki seçim yanlış indekste olabilir.

---

### BUG-16 — AI Prompt Birim Fiyat Sütunu Başlığı Yanıltıcı
**Dosya:** `src/components/aistock/AIParsedTable.tsx`

Sütun başlığı "Birim Fiyat" ama bu KDV hariç fatura birim fiyatı. "Efektif Alış" ile karıştırılıyor. "KDV Hariç Birim Fiyat" yazılmalı.

---

### BUG-17 — Updater: 301/302 Zincirli Redirect Takibi Eksik
**Dosya:** `electron/main.js` satır 368

Sadece tek redirect takip ediliyor. İkinci yönlendirme varsa (`https.get(location, ...)` içinde) handle edilmiyor.

---

### BUG-18 — `normalizeSearchText`: `İ` Büyük Harf Dönüşümü Edge Case
**Dosya:** `electron/database.js` satır 312

`'İPEK'.toLowerCase()` → `'i̇pek'` (combining dot above). `replace(/i̇/g, 'i')` yakalıyor ama `String.prototype.normalize('NFD')` ile daha güvenilir yapılabilir.

---

### BUG-21 — POS Ödeme: Gerçek POS Auth Kodu Yerine Fallback Rastgele Üretiliyor
**Dosya:** `electron/main.js` satır 100

```js
posAuthCode = posRes.auth_code || `POS-OK-${Math.floor(100000 + Math.random() * 900000)}`;
```

POS'tan gerçek auth kodu gelmediğinde rastgele fallback üretiliyor ve satış onaylı sayılıyor.

---

### BUG-22 — `clearEntireDatabase` Sonrası `wet_food_migration_done` Koşulu
**Dosya:** `electron/database.js` satır 1010–1038

`keepSettings=false` ile silme yapıldığında `initSchema()` çalışıyor, migration tekrar devreye giriyor ancak ürünler silinmiş olduğu için hardcoded ID güncelleme SQL'leri boşa çalışıyor. Sorun değil ama gereksiz I/O.

---

*Toplam: 14 açık hata (0 kritik, 4 orta, 10 küçük/UX) | ✅ 8 hata giderildi*

---

## 🔴 KRİTİK HATALAR

---



---

### BUG-02 — AI Stok Aktarımında Kart Fiyatı Güncellenmemiyor (Matched Product)
**Dosya:** `src/hooks/useAIAnalysis.ts` satır 414–422

```ts
await dbIPC.updateProduct(item.matchedProduct.id, {
    ...item.matchedProduct,
    cost_price: item.cost_price,
    sale_price: item.sale_price > 0 ? item.sale_price : item.matchedProduct.sale_price
    // BUG: card_price hiç güncellenmemiyor! Eski değer kalıyor.
});
```

**Sorun:** Mevcut (matched) ürünler için stok aktarımında `card_price` güncellenmeden eski değer kalıyor. Fatura maliyeti değiştiğinde kart fiyatı eskide kalır.

**Çözüm:** `card_price` alanını yeni maliyet üzerinden hesaplayıp updateProduct'a ekle.

---

### BUG-03 — İade Statüsü Türkçe Karakter Uyumsuzluğu (3 Farklı Encoding)
**Dosya:** `electron/database.js` satır 706, 759 ve `electron/main.js` satır 1052

```js
// database.js 706:
sale.status === 'İade Edildi' || sale.status === 'Iade Edildi'

// database.js 759 (unicode escape):
"status NOT IN ('Iade Edildi', '\u0130ade Edildi')"

// main.js 1052:
!['İade Edildi', 'Iade Edildi', 'Ä°ade Edildi'].includes(s.status)
```

**Sorun:** `'Ä°ade Edildi'` encoding bozukluğu! 3 farklı yerde 3 farklı string kullanılıyor. Bazı ortamlarda iade edilmiş satışlar hâlâ aktif sayılabilir ve raporlara dahil edilebilir.

**Çözüm:** Tek bir sabit tanımla: `const REFUNDED_STATUS = 'İade Edildi'`, her yerde bunu kullan.

---

### BUG-04 — Barkod Import: Aynı İsimde Birden Fazla Ürün Varsa UNIQUE Kısıtı İhlali
**Dosya:** `electron/database.js` satır 1109

```js
this.execute(`UPDATE products SET barcode = ? WHERE name = ?`, [item.barcode, item.name]);
```

**Sorun:** `name = ?` koşuluyla tüm aynı isimli ürünler güncelleniyor. Veritabanında aynı isimde birden fazla ürün varsa hepsine aynı barkod yazılır. `barcode UNIQUE` kısıtı ihlal edilir ve SQL hatasına neden olabilir. (İlk satır için unique ihlali oluşmaz, ikinci güncelleme patlar.)

**Çözüm:** `WHERE name = ? LIMIT 1` ekle veya `id` bazında güncelle.

---

## 🟡 ORTA ÖNEMLİ HATALAR

---

### BUG-05 — Stok Log: Float Miktar INTEGER Kolona Yazılabiliyor
**Dosya:** `electron/database.js` satır 152

```sql
change_quantity INTEGER NOT NULL,
```

`useAIAnalysis.ts` tarafından `item.quantity` doğrudan gönderiliyor ve bu değer faturada `12.5` gibi float olabilir. `addOrUpdateStockByBarcode` içinde `parseInt(addedStock, 10)` yapılıyor ama `updateProduct` path'inde bu dönüşüm yok.

---

### BUG-06 — Satış Kaydında Stok Round Hatası
**Dosya:** `electron/database.js` satır 658

```js
const newStock = prod.stock_quantity - Math.round(qty);
```

`Math.round(1.5) = 2` — 1.5 adet satıldığında 2 adet düşülebilir. `Math.ceil` veya `parseInt` daha güvenli.

---

### BUG-07 — Yedekleme Dosyaları Temizlenmez: Disk Dolumu
**Dosya:** `electron/main.js` satır 121–146

`setupDailyBackupScheduler()` her gün yeni `.db` dosyası oluşturuyor fakat eski yedekleri silen hiçbir mantık yok. Uzun sürede `ZuzuKasa_Yedekler` klasörü şişer.

**Çözüm:** Son 30 yedek tutulup eskiler silinmeli.

---

### BUG-08 — Fatura Analizi Hatalı Olduğunda Eski Tablo Ekranda Kalıyor
**Dosya:** `src/hooks/useAIAnalysis.ts` satır 272–277

```ts
} else {
    alert('AI Fatura Analiz Hatası: ' + result.message);
    // BUG: parsedItems temizlenmiyor, eski fatura tablosu ekranda kalır
}
```

---

### BUG-09 — Versiyon Kontrolü String Karşılaştırması (Semantic Versioning Yok)
**Dosya:** `electron/main.js` satır 262

```js
if (latestVersion && latestVersion !== currentVersion) {
```

`'1.10.0' > '1.9.0'` → string karşılaştırmasında `'1' < '1'` sonra `'.' == '.'` sonra `'1' < '9'` → YANLIŞ sonuç. Proper semver karşılaştırması yapılmalı.

---

### BUG-10 — Thermal Printer: Yazıcı Adı Ayardan Okunmuyor
**Dosya:** `electron/main.js` satır 484

```js
deviceName: ''  // Her zaman OS default yazıcısını kullanır
```

Kullanıcı ayarlardan özel termal yazıcı adı girebilmeli.

---

### BUG-11 — Ensemble Modda Tek Batch Başarısız Olursa Tüm Analiz Duruyor
**Dosya:** `electron/main.js` satır 805–807

```js
if (validResults.length === 0) {
    throw new Error("Tüm ensemble modelleri başarısız oldu...");
}
```

Bu `throw`, `for...of` batch döngüsü içinde. Bir batch başarısız → tüm analiz durur. Başarısız batch loglanıp atlanmalı, diğerleri işlenmeli.

---

## 🟢 KÜÇÜK HATALAR / UX SORUNLARI

---

### BUG-12 — RefundsTab: Tarihsiz Sorguda Tüm Satışlar Yükleniyor (Performans)
**Dosya:** `src/components/RefundsTab.tsx` satır 24–26

Tarih alanları boşken `getSalesList('', '')` tüm satış geçmişini çekiyor. Binlerce kayıt olabilir. Varsayılan olarak son 30 gün filtresi eklenmeli.

---

### BUG-13 — ReportsTab Z-Raporu Yazdırma Hatası Sessizce Yutuluyor
**Dosya:** `src/components/ReportsTab.tsx` satır 84–87

```ts
} catch (err: any) {
    console.error('Z Report print error:', err);
    // Kullanıcıya hiçbir uyarı gösterilmiyor
}
```

---

### BUG-14 — AlertsTab Hızlı Stok Ekle: `reason` Generic "Manuel Stok Düzenleme" Yazılıyor
**Dosya:** `src/components/AlertsTab.tsx` satır 39–42

Stock log'da "Manuel Stok Düzenleme" yerine "Kritik Stok Tamamlama" yazılmalı — filtreleme ve audit için.

---

### BUG-15 — `handleAssignScannedBarcode`: Stale State Kullanımı
**Dosya:** `src/hooks/useAIAnalysis.ts` satır 397–404

`setParsedItems` async. Hemen ardından eski `parsedItems` üzerinden `findIndex` çalışıyor. Barkod atamasından sonra bir sonraki seçim yanlış indekste olabilir.

---

### BUG-16 — AI Prompt Birim Fiyat Sütunu Başlığı Yanıltıcı
**Dosya:** `src/components/aistock/AIParsedTable.tsx`

Sütun başlığı "Birim Fiyat" ama bu KDV hariç fatura birim fiyatı. "Efektif Alış" ile karıştırılıyor. "KDV Hariç Birim Fiyat" yazılmalı.

---

### BUG-17 — Updater: 301/302 Zincirli Redirect Takibi Eksik
**Dosya:** `electron/main.js` satır 318–325

Sadece tek redirect takip ediliyor. İkinci yönlendirme varsa (`https.get(location, ...)` içinde) handle edilmiyor.

---

### BUG-18 — `normalizeSearchText`: `İ` Büyük Harf Dönüşümü Edge Case
**Dosya:** `electron/database.js` satır 312

`'İPEK'.toLowerCase()` → `'i̇pek'` (combining dot above). `replace(/i̇/g, 'i')` yakalıyor ama `String.prototype.normalize('NFD')` ile daha güvenilir yapılabilir.

---

### BUG-19 — AI Image Upload: URL.createObjectURL Leak (Sadece Remove'da Revoke)
**Dosya:** `src/hooks/useAIAnalysis.ts` satır 52–53

```ts
const previews = files.map(file => URL.createObjectURL(file));
```

Yeni analiz yapıldığında veya dosya listesi değiştirildiğinde eski `objectURL`'ler revoke edilmiyor — sadece `handleRemoveFile`'da revoke yapılıyor. Component unmount'ta tüm preview URL'leri revoke edilmeli.

---

### BUG-20 — `deleteSales` Batch Delete: Stok Geri Eklenmeden Siliniyor
**Dosya:** `electron/database.js` satır 736–742

```js
deleteSales(saleIds) {
    this.execute(`DELETE FROM sale_items WHERE sale_id IN (...)`, saleIds);
    this.execute(`DELETE FROM sales WHERE id IN (...)`, saleIds);
    // BUG: İade edilmemiş satışlar silindiğinde stok geri EKLENMİYOR
}
```

İade işlemi (processRefund) stokları geri ekliyor, ama direkt delete etmek stokları geri eklemeden kaydı siliyor.

---

### BUG-21 — POS Ödeme: Auth Code Rastgele Üretiliyor, Gerçek POS Onayı Yok
**Dosya:** `electron/pos_terminal.js` satır 64

```js
auth_code: `POS-${Math.floor(100000 + Math.random() * 900000)}`,
```

Active socket üzerinden gönderim yapıldıktan sonra POS'tan gerçek auth kodu beklenmeden rastgele kod üretiliyor ve satış onaylı sayılıyor. POS'tan ACK beklenmiyor.

---

### BUG-22 — `clearEntireDatabase` Sonrası `wet_food_migration_done` Koşulu
**Dosya:** `electron/database.js` satır 1010–1038

`keepSettings=false` ile silme yapıldığında `initSchema()` çalışıyor, migration tekrar devreye giriyor ancak ürünler silinmiş olduğu için hardcoded ID güncelleme SQL'leri boşa çalışıyor. Sorun değil ama gereksiz I/O.

---

*Toplam: 22 hata (4 kritik, 7 orta, 11 küçük/UX)*
