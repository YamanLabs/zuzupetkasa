# 🐛 Bugs & Issues Report — nextjs-kasa POS
# ✅ TÜM BUGLAR DÜZELTİLDİ

> Fix Tarihi: 2026-08-05 | TypeScript compile: ✅ 0 hata

| # | Önem | Durum |
|---|------|-------|
| BUG-01 | 🔴 Kritik | ✅ SettingsService import — dosya mevcut, derleme başarılı |
| BUG-02 | 🔴 Kritik | ✅ importBackup async yapıldı, await this.init() eklendi |
| BUG-03 | 🔴 Kritik | ✅ exportBarcodes this.queryAll() kullanıyor |
| BUG-04 | 🔴 Kritik | ✅ importBarcodes execute() + döngü kullanıyor |
| BUG-05 | 🔴 Kritik | ✅ performDailyBackup db.save() çağrısı eklendi |
| BUG-06 | 🔴 Kritik | ✅ main.js + preload.js cardMargin parametresi eklendi |
| BUG-07 | 🟠 Yüksek | ✅ Hardcoded API key temizlendi (ipc.ts + database.js) |
| BUG-08 | 🟠 Yüksek | ✅ Stale closure düzeltildi — local margins değişkeni kullanılıyor |
| BUG-09 | 🟠 Yüksek | ✅ cardSubtotal prop eklendi, kart ödemede doğru indirim |
| BUG-10 | 🟠 Yüksek | ✅ useEffect dependency array güncellendi |
| BUG-11 | 🟠 Yüksek | ✅ SQL UTF-8 encoding bozukluğu düzeltildi |
| BUG-12 | 🟠 Yüksek | ✅ clearEntireDatabase card_margin_percent + yeni kategoriler eklendi |
| BUG-13 | 🟡 Orta | ✅ Thermal print Promise'e sarmalandı, hata IPC'ye yansıtılıyor |
| BUG-14 | 🟡 Orta | ✅ unit_price_excl_tax artık KDV hariç değer tutuyor |
| BUG-15 | 🟡 Orta | ✅ In-memory sale ID Math.max ile hesaplanıyor |
| BUG-16 | 🟡 Orta | ✅ Migration flag eklendi, sadece bir kez çalışıyor |
| BUG-17 | 🟡 Orta | ✅ handleTabChange useCallback ile memoize edildi |
| BUG-18 | 🟢 Düşük | ✅ Pairing modal'a çalışan Eşle butonu + status mesajı eklendi |
| BUG-19 | 🟢 Düşük | ✅ paidAmount=0 null check ile düzeltildi |
| BUG-20 | 🟢 Düşük | ✅ Gereksiz .replace(i,i) kaldırıldı |
| BUG-21 | 🟢 Düşük | ✅ URL.revokeObjectURL() eklendi |
| BUG-22 | 🟢 Düşük | ✅ Mama Kapları + Yatak kategori seed'e eklendi |
