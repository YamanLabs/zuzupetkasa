import { useState, useEffect } from 'react';
import { dbIPC } from '@/lib/ipc';
import { soundFX } from '@/lib/sound-effects';

export function useSettings(onThemeChange?: (theme: 'cream' | 'dark') => void) {
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [settings, setSettings] = useState<Record<string, string>>({
        company_name: 'ZUZU PET',
        company_phone: '0555 123 45 67',
        company_address: 'Antalya, Türkiye',
        receipt_footer: 'Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz!',
        tax_rate: '20',
        gemini_api_key: '',
        receipt_template: 'compact_minimal',
        app_theme: 'cream',
        pos_connection_type: 'ethernet',
        pos_ip_address: '192.168.1.75',
        pos_network_port: '59000',
        pos_com_port: 'COM4',
        pos_timeout_sec: '45'
    });
    const [savedNotice, setSavedNotice] = useState<boolean>(false);
    const [showReceiptPreview, setShowReceiptPreview] = useState<boolean>(false);

    // inPOS GMP3 Pairing Modal States
    const [showPairingModal, setShowPairingModal] = useState<boolean>(false);
    const [pairIp, setPairIp] = useState<string>('192.168.1.39');
    const [pairPort, setPairPort] = useState<string>('59000');
    const [pairSerialNo, setPairSerialNo] = useState<string>('SD0024305562');
    const [pairAppNo, setPairAppNo] = useState<string>('1');
    const [pairStatusMsg, setPairStatusMsg] = useState<string>('');

    // Category Margins States
    const [categoryMargins, setCategoryMargins] = useState<Record<string, { cash: number; card: number }>>({});
    const [newCategoryName, setNewCategoryName] = useState<string>('');
    const [newCategoryCashMargin, setNewCategoryCashMargin] = useState<string>('30');
    const [newCategoryCardMargin, setNewCategoryCardMargin] = useState<string>('35');
    const [updatingCat, setUpdatingCat] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'categories' | 'pos' | 'company' | 'ai' | 'system' | 'service'>('categories');

    useEffect(() => {
        loadSettings();
        loadCategoryMargins();
        setSoundEnabled(soundFX.isEnabled());
    }, []);

    const toggleSound = (enabled: boolean) => {
        soundFX.setEnabled(enabled);
        setSoundEnabled(enabled);
        if (enabled) {
            soundFX.playClick();
        }
    };

    const loadSettings = async () => {
        const loaded = await dbIPC.getSettings();
        setSettings(prev => ({ ...prev, ...loaded }));
    };

    const loadCategoryMargins = async () => {
        const margins = await dbIPC.getCategoryMargins();
        setCategoryMargins(margins);
    };

    const handleMarginChange = (catName: string, type: 'cash' | 'card', valueStr: string) => {
        const num = parseFloat(valueStr) || 0;
        setCategoryMargins(prev => ({
            ...prev,
            [catName]: {
                cash: type === 'cash' ? num : (prev[catName]?.cash ?? 30),
                card: type === 'card' ? num : (prev[catName]?.card ?? 35)
            }
        }));
    };

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        const catName = newCategoryName.trim();
        const cashM = parseFloat(newCategoryCashMargin) || 30;
        const cardM = parseFloat(newCategoryCardMargin) || 35;
        const updated = { ...categoryMargins, [catName]: { cash: cashM, card: cardM } };
        setCategoryMargins(updated);
        dbIPC.saveCategoryMargins(updated);
        setNewCategoryName('');
        setNewCategoryCashMargin('30');
        setNewCategoryCardMargin('35');
        soundFX.playClick();
    };

    const handleDeleteCategory = async (catName: string) => {
        if (confirm(`'${catName}' kategorisini veritabanından silmek istediğinize emin misiniz?`)) {
            await dbIPC.deleteCategory(catName);
            const copy = { ...categoryMargins };
            delete copy[catName];
            setCategoryMargins(copy);
            soundFX.playClick();
        }
    };

    const handleBatchUpdatePrices = async (catName: string, cashMargin: number, cardMargin: number) => {
        if (confirm(`'${catName}' kategorisindeki tüm ürünlerin satış fiyatı (Nakit: %${cashMargin}, Kart: %${cardMargin}) yeniden hesaplanacak. Onaylıyor musunuz?`)) {
            setUpdatingCat(catName);
            try {
                const res = await dbIPC.updateCategoryProductPrices(catName, cashMargin, cardMargin);
                soundFX.playSuccess();
                alert(`'${catName}' kategorisindeki ${res.updatedCount} adet ürünün fiyatları başarıyla güncellendi!`);
            } catch (err: any) {
                alert('Güncelleme hatası: ' + err.message);
            } finally {
                setUpdatingCat(null);
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        soundFX.playClick();
        for (const [key, val] of Object.entries(settings)) {
            await dbIPC.setSetting(key, val);
        }
        await dbIPC.saveCategoryMargins(categoryMargins);
        if (onThemeChange && settings.app_theme) {
            onThemeChange(settings.app_theme as 'cream' | 'dark');
        }
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3000);
    };

    const handleThemeSelect = (selectedTheme: 'cream' | 'dark') => {
        soundFX.playClick();
        setSettings(prev => ({ ...prev, app_theme: selectedTheme }));
        if (onThemeChange) {
            onThemeChange(selectedTheme);
        }
    };

    const handleClearDatabase = async () => {
        if (confirm('DİKKAT: Veritabanındaki tüm ürünler, satışlar ve stok kayıtları tamamen silinecektir.\nDevam etmek istediğinize emin misiniz?')) {
            await dbIPC.clearEntireDatabase(true);
            alert('Veritabanı sıfırlandı.');
        }
    };

    const handleExportBackup = async () => {
        soundFX.playClick();
        try {
            const res = await dbIPC.exportBackup();
            if (res?.canceled) return;
            if (res?.success) {
                alert('✓ Veritabanı yedeği başarıyla dışa aktarıldı!');
                soundFX.playSuccess();
            } else {
                alert(`Hata: ${res?.error || 'Yedek oluşturulamadı.'}`);
            }
        } catch (e: any) {
            alert(`Hata: ${e.message}`);
        }
    };

    const handleImportBackup = async () => {
        soundFX.playClick();
        if (!confirm('DİKKAT: Seçtiğiniz yedek veritabanı yüklenecek ve mevcut verilerin üzerine yazılacaktır! Devam etmek istediğinize emin misiniz?')) return;
        try {
            const res = await dbIPC.importBackup();
            if (res?.canceled) return;
            if (res?.success) {
                alert('✓ Veritabanı yedeği başarıyla geri yüklendi! Sayfa yenileniyor...');
                soundFX.playSuccess();
                setTimeout(() => window.location.reload(), 1000);
            } else {
                alert(`Hata: ${res?.error || 'Veritabanı geri yüklenemedi.'}`);
            }
        } catch (e: any) {
            alert(`Hata: ${e.message}`);
        }
    };

    const handleExportBarcodes = async () => {
        soundFX.playClick();
        try {
            const res = await dbIPC.exportBarcodes();
            if (res?.canceled) return;
            if (res?.success) {
                alert('✓ Barkodlar başarıyla dışa aktarıldı!');
                soundFX.playSuccess();
            } else {
                alert(`Hata: ${res?.error || 'Barkodlar dışa aktarılamadı.'}`);
            }
        } catch (e: any) {
            alert(`Hata: ${e.message}`);
        }
    };

    const handleImportBarcodes = async () => {
        soundFX.playClick();
        if (!confirm('DİKKAT: Seçtiğiniz dosyadaki barkodlar isim eşleşmesine göre mevcut ürünlerin üzerine yazılacaktır. İşleme devam edilsin mi?')) return;
        try {
            const res = await dbIPC.importBarcodes();
            if (res?.canceled) return;
            if (res?.success) {
                alert(`✓ ${res?.updatedCount} ürünün barkodu başarıyla güncellendi!`);
                soundFX.playSuccess();
            } else {
                alert(`Hata: ${res?.error || 'Barkodlar içe aktarılamadı.'}`);
            }
        } catch (e: any) {
            alert(`Hata: ${e.message}`);
        }
    };

    return {
        soundEnabled, toggleSound,
        settings, setSettings,
        savedNotice,
        showReceiptPreview, setShowReceiptPreview,
        showPairingModal, setShowPairingModal,
        pairIp, setPairIp,
        pairPort, setPairPort,
        pairSerialNo, setPairSerialNo,
        pairAppNo, setPairAppNo,
        pairStatusMsg, setPairStatusMsg,
        categoryMargins, setCategoryMargins,
        newCategoryName, setNewCategoryName,
        newCategoryCashMargin, setNewCategoryCashMargin,
        newCategoryCardMargin, setNewCategoryCardMargin,
        updatingCat,
        activeTab, setActiveTab,
        handleMarginChange, handleAddCategory, handleDeleteCategory,
        handleBatchUpdatePrices, handleSave, handleThemeSelect,
        handleClearDatabase, handleExportBackup, handleImportBackup,
        handleExportBarcodes, handleImportBarcodes
    };
}
