import { useState } from 'react';
import { aiIPC, dbIPC } from '@/lib/ipc';
import { soundFX } from '@/lib/sound-effects';

export function useAIDoubleCheck() {
    const [showDoubleCheckModal, setShowDoubleCheckModal] = useState<boolean>(false);
    const [geminiModelName, setGeminiModelName] = useState<string>('gemini-3.5-flash-lite');
    const [isCheckingDoubleCheck, setIsCheckingDoubleCheck] = useState<boolean>(false);
    const [doubleCheckReport, setDoubleCheckReport] = useState<string>('');
    const [doubleCheckSummary, setDoubleCheckSummary] = useState<any>(null);
    const [doubleCheckItems, setDoubleCheckItems] = useState<any[]>([]);
    const [doubleCheckSearch, setDoubleCheckSearch] = useState<string>('');
    const [doubleCheckFilter, setDoubleCheckFilter] = useState<'ALL' | 'PRICE_CHANGE' | 'MATCHED' | 'NEW'>('ALL');

    const loadSettings = async () => {
        const settings = await dbIPC.getSettings();
        if (settings.gemini_model_name) {
            setGeminiModelName(settings.gemini_model_name);
        }
    };

    const handleSaveModelName = async () => {
        if (!geminiModelName.trim()) return;
        soundFX.playSuccess();
        await dbIPC.setSetting('gemini_model_name', geminiModelName.trim());
        alert(`Gemini Model Adı "${geminiModelName.trim()}" olarak başarıyla kaydedildi.`);
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleRunDoubleCheck = async (selectedFiles: File[]) => {
        if (selectedFiles.length === 0) {
            alert('Lütfen öncelikle sol taraftan en az 1 adet fatura/fiş görseli veya PDF dosyası seçin.');
            return;
        }
        soundFX.playClick();
        setIsCheckingDoubleCheck(true);
        try {
            const base64List = await Promise.all(selectedFiles.map(convertFileToBase64));
            const result = await aiIPC.doubleCheckInvoice(base64List);
            if (result.success) {
                soundFX.playSuccess();
                setDoubleCheckReport(result.report);
                setDoubleCheckSummary(result.summary);
                setDoubleCheckItems(result.items || []);
            } else {
                alert('Double-Check Hatası: ' + result.message);
            }
        } catch (err: any) {
            alert('Çapraz kontrol hatası: ' + err.message);
        } finally {
            setIsCheckingDoubleCheck(false);
        }
    };

    return {
        showDoubleCheckModal, setShowDoubleCheckModal,
        geminiModelName, setGeminiModelName,
        isCheckingDoubleCheck, setIsCheckingDoubleCheck,
        doubleCheckReport, setDoubleCheckReport,
        doubleCheckSummary, setDoubleCheckSummary,
        doubleCheckItems, setDoubleCheckItems,
        doubleCheckSearch, setDoubleCheckSearch,
        doubleCheckFilter, setDoubleCheckFilter,
        loadSettings, handleSaveModelName, handleRunDoubleCheck
    };
}
