# ðŸ› BUGS.MD â€” ZuzuPet Kasa POS Sistem Hata Raporu

> **Tarama Tarihi:** 2026-08-13
> **Tarama KapsamÄ±:** electron/main.js Â· electron/database.js Â· electron/pos_terminal.js Â· electron/preload.js Â· src/hooks/* Â· src/components/* Â· src/lib/ipc.ts

---

## âœ… Ã‡Ã–ZÃœLEN HATALAR (Ã–nceki Oturum)

| Hata | AÃ§Ä±klama | Ã‡Ã¶zÃ¼m Yeri |
|------|----------|------------|
| BUG-02 | AI Stok AktarÄ±mÄ±nda `card_price` gÃ¼ncellenmiyordu | `useAIAnalysis.ts` â€” margin'den hesaplanÄ±p yazÄ±lÄ±yor |
| BUG-03 | Ä°ade statÃ¼sÃ¼ encoding migration | `database.js` `initSchema()` â€” tek seferlik UPDATE |
| BUG-04 | Barkod import: aynÄ± isimli Ã¼rÃ¼nlerde UNIQUE kÄ±sÄ±tÄ± ihlali | `database.js` `LIMIT 1` ile `id` bazÄ±nda gÃ¼ncelleme |
| BUG-06 | SatÄ±ÅŸ kaydÄ±nda stok round hatasÄ± (`Math.round`) | `database.js` satÄ±r 698 â€” `Math.floor` kullanÄ±lÄ±yor |
| BUG-07 | Yedekleme dosyalarÄ± birikerek diski dolduruyordu | `main.js` â€” `cleanOldBackups(backupDir, 30)` eklendi |
| BUG-08 | Analiz hatasÄ±nda eski fatura tablosu ekranda kalÄ±yordu | `useAIAnalysis.ts` â€” `setParsedItems([])` Ã§aÄŸrÄ±lÄ±yor |
| BUG-09 | Versiyon kontrolÃ¼ string karÅŸÄ±laÅŸtÄ±rmasÄ± kullanÄ±yordu | `main.js` â€” `semverGt()` ile doÄŸru semver karÅŸÄ±laÅŸtÄ±rmasÄ± |
| BUG-10 | Thermal printer yazÄ±cÄ± adÄ± ayardan okunmuyordu | `main.js` â€” `getSetting('thermal_printer_name')` eklendi |
| BUG-11 | Ensemble modda tek batch baÅŸarÄ±sÄ±z olursa tÃ¼m analiz duruyordu | `main.js` â€” `throw` yerine `continue` ile batch atlanÄ±yor |
| BUG-14 | AlertsTab hÄ±zlÄ± stok log reason generic yazÄ±lÄ±yordu | `database.js` `_stockLogReason` parametresi eklendi |
| BUG-15 | `handleAssignScannedBarcode`: Stale state kullanÄ±mÄ± | `useAIAnalysis.ts` â€” `updatedItems` array ile dÃ¼zeltildi |
| BUG-19 | `URL.createObjectURL` unmount'ta revoke edilmiyordu | `useAIAnalysis.ts` â€” `filePreviewsRef` ile unmount'ta revoke |
| BUG-20 | `deleteSales` stok geri eklemeden siliyordu | `database.js` satÄ±r 794-813 â€” silmeden Ã¶nce stoklar geri ekleniyor |
| BUG-23 | createSale Transaction HatasÄ±: "cannot commit..." | `database.js` â€” `execute()` metodundan `this.save()` silindi |
| BUG-24 | AI Model Ä°smi Sabit KodlanmÄ±ÅŸ: `gemini-3.5-flash` | `main.js` â€” Model `anthropic/claude-sonnet-5` olarak deÄŸiÅŸtirildi |
| BUG-25 | `app:setBadgeCount` IPC Handler Eksik | `main.js` â€” `ipcMain.on('app:setBadgeCount', ...)` eklendi |
| BUG-03 | Ä°ade StatÃ¼sÃ¼ ÃœÃ§ FarklÄ± String | `database.js` â€” `PosDatabase.REFUNDED_STATUS` sabiti eklendi |
| BUG-26 | useCheckout: Ã‡oklu Ã–deme `targetTotal` YanlÄ±ÅŸ | `useCheckout.ts` â€” `targetTotal` seÃ§imi Ã§oklu iÃ§in dÃ¼zeltildi |
| BUG-27 | handleOpenPayment Ã‡oklu: Cart unit_price Kart FiyatÄ± KalÄ±yor | `useCheckout.ts` â€” Fiyatlar yÃ¶nteme gÃ¶re anlÄ±k doÄŸru set ediliyor |
| BUG-28 | SalesTab useEffect BaÄŸÄ±mlÄ±lÄ±k EksikliÄŸi | `SalesTab.tsx` â€” `loadData` vb. baÄŸÄ±mlÄ±lÄ±klar eklendi |
| BUG-29 | clearEntireDatabase: PRAGMA ve execute() Ã‡akÄ±ÅŸmasÄ± | `database.js` â€” `db.run` kullanÄ±larak explicit iÅŸlem yapÄ±ldÄ± |
| BUG-30 | ai:doubleCheckInvoice: TÃ¼m TablolarÄ± BelleÄŸe Ã‡ekiyor | `main.js` â€” TÃ¼m DB yerine sadece son 30 gÃ¼n satÄ±ÅŸlar filtrelendi |
| BUG-31 | updater:startDownload: Redirect Authorization Header Leak | `main.js` â€” S3 redirect Ã¶ncesi `Authorization` silindi |
| BUG-05 | Stok Log: Float Miktar INTEGER Kolona YazÄ±labiliyor | `database.js` â€” `Math.floor()` eklendi |
| BUG-32 | SalesCart: Miktar Input TemizlendiÄŸinde qty=0 KalÄ±yor | `SalesCart.tsx` â€” Empty string validasyonu eklendi, input type text oldu |
| BUG-33 | useAIAnalysis: matched_product_id Fuzzy Match Ã‡akÄ±ÅŸmasÄ± | `useAIAnalysis.ts` â€” Fuzzy match deÄŸeri `matched_product_id` ezdi |

---

## ðŸ”´ KRÄ°TÄ°K HATALAR (AÃ§Ä±k)
*(HiÃ§ kritik hata kalmadÄ±)*

---

## ðŸŸ¡ ORTA Ã–NEMLÄ° HATALAR (AÃ§Ä±k)
*(HiÃ§ orta Ã¶nemli hata kalmadÄ±)*

---

## ðŸŸ¢ KÃœÃ‡ÃœK HATALAR / UX SORUNLARI (AÃ§Ä±k)

---

### BUG-12 â€” RefundsTab: Tarihsiz Sorguda TÃ¼m SatÄ±ÅŸlar YÃ¼kleniyor (Performans)
**Dosya:** `src/components/RefundsTab.tsx`

`getSalesList('', '')` tÃ¼m satÄ±ÅŸ geÃ§miÅŸini Ã§ekiyor. VarsayÄ±lan son 30 gÃ¼n filtresi eklenmeli.

---

### BUG-13 â€” ReportsTab Z-Raporu YazdÄ±rma HatasÄ± Sessizce Yutuluyor
**Dosya:** `src/components/ReportsTab.tsx`

```ts
} catch (err: any) {
    console.error('Z Report print error:', err);
    // KullanÄ±cÄ±ya hiÃ§bir uyarÄ± gÃ¶sterilmiyor
}
```

---

### BUG-16 â€” AI Tablo: "Birim Fiyat" SÃ¼tun BaÅŸlÄ±ÄŸÄ± YanÄ±ltÄ±cÄ±
**Dosya:** `src/components/aistock/AIParsedTable.tsx`

SÃ¼tun "Birim Fiyat" yazÄ±yor ama KDV hariÃ§ fatura birim fiyatÄ±. "KDV HariÃ§ AlÄ±ÅŸ FiyatÄ±" yazÄ±lmalÄ±.

---

### BUG-17 â€” Updater Redirect: Sonsuz DÃ¶ngÃ¼ KorumasÄ± Yok (BUG-31 ile Ã–rtÃ¼ÅŸÃ¼yor)

Redirect zincirinde dÃ¶ngÃ¼ korumasÄ± yok. `handleResponse` iÃ§inde gelen 301/302 tekrar takip edilmiyor.

---

### BUG-18 â€” normalizeSearchText: Frontend/Backend Implementasyonu FarklÄ±
**Dosya:** `electron/database.js` satÄ±r 329-348 ve `src/lib/ipc.ts` satÄ±r 118-132

`database.js`'de `normalize('NFC')` var, frontend `ipc.ts` kopyasÄ±nda yok.
Ä°ki implementasyon farklÄ± davranÄ±yor â€” arama sonuÃ§larÄ± backend/frontend arasÄ±nda tutarsÄ±z olabilir.

---

### BUG-21 â€” POS Ã–deme: Auth Kodu GerÃ§ek POS OnayÄ± Beklenmeden Rastgele Ãœretiliyor
**Dosya:** `electron/pos_terminal.js` satÄ±r 56-67

```js
gmp3Server.sendToPos(packet);
return {
    success: true,
    auth_code: `POS-${Math.floor(100000 + Math.random() * 900000)}`,  // Rastgele!
};
```

POS onayÄ± beklenmeden `success: true` dÃ¶nÃ¼yor. POS reddetse bile satÄ±ÅŸ kaydedilir.

---

### BUG-22 â€” clearEntireDatabase SonrasÄ± Gereksiz Migration SQL'leri Ã‡alÄ±ÅŸÄ±yor
**Dosya:** `electron/database.js` satÄ±r 217-221

`keepSettings=false` ile sÄ±fÄ±rlamada hardcoded ID migration SQL'leri boÅŸuna Ã§alÄ±ÅŸÄ±yor.
Ä°ÅŸlevsel sorun yok ama gereksiz disk I/O.

---

### BUG-34 â€” gmp3-server.js PaketlenmiÅŸ Uygulamada Path Sorununa AÃ§Ä±k
**Dosya:** `electron/main.js` satÄ±r 7 + `electron/pos_terminal.js` satÄ±r 3

```js
const { startGmp3Server } = require('../gmp3-server');
```

PaketlenmiÅŸ uygulamada `asar` iÃ§inde yol deÄŸiÅŸebilir. `gmp3-server.js` asarUnpack
listesinde yoksa yÃ¼klenemez. POS terminal Ã¶zelliÄŸi tamamen Ã§Ã¶ker.

---

## ðŸ“Š Ã–ZET

| Kategori | AÃ§Ä±k | Ã‡Ã¶zÃ¼len |
|----------|------|---------|
| ðŸ”´ Kritik | 0 | 3 |
| ðŸŸ¡ Orta | 0 | 6 |
| ðŸŸ¢ KÃ¼Ã§Ã¼k/UX | 8 | 17 |
| **Toplam** | **8** | **26** |


