# Yaman LABS Kasa POS — Pure Next.js & TypeScript POS System

Modern, ultra-fast POS Satış & Stok Otomasyonu built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, Lucide Icons, and Web Audio API.

## Özellikler

- **Python Bağımlılığı Sıfır:** Tüm veritabanı, AI fatura tarama, yazıcı ve POS cihazı entegrasyonu saf TypeScript/Node.js ile çalışır.
- **Klavye Kısayolları (F1 - F7):**
  - **F1:** Satış Ekranı (Nakit / Kart / Çoklu Ödeme, İndirim, Fiş Yazdırma, Otomatik Barkod Filtreleme)
  - **F2:** Ürün & Stok Yönetimi (Anlık Barkod Atama, Kar Marjı Hesaplama, Stok Takibi)
  - **F3:** AI Fatura Okuma & Stok Girişi (Google Gemini 2.5/3.5 Vision ile Otomatik Ürün Ayrıştırma)
  - **F4:** Kritik Stok Uyarısı & Stok Log Hareketleri
  - **F5:** İadeler & Fiş Geçmişi (Stok Geri Yüklemeli İade)
  - **F6:** Raporlar & Gün Sonu (Z) Raporu Yazdırma
  - **F7:** Mağaza Ayarları, Tema (Sıcak Krem / Karanlık), API Key ve Yedekleme

- **Donanımsal Barkod Okuyucu Desteği:** Klavye zamanlama filtresi (<45ms) ile okutulan tüm barkodlar anında yakalanır.
- **Yazıcı Desteği:** 58mm / 80mm Termal fiş yazıcısı formatında HTML çıktı.
- **inPOS m530 POS Cihazı:** Node.js TCP Server listener (`gmp3-server.js`) ile canlı bağlantı.

## Çalıştırma

### Bağımlılıkları Yükleme
```bash
npm install
```

### Web Geliştirme Sunucusu (Next.js)
```bash
npm run dev
```

### Masaüstü Uygulaması (Electron)
```bash
npm run electron:dev
```

### Üretim Derlemesi ve Taşınabilir (.exe) Oluşturma
```bash
npm run dist
```
