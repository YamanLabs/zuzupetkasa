import { useState } from 'react';
import { dbIPC } from '@/lib/ipc';
import { soundFX } from '@/lib/sound-effects';

export function useAISettings() {
    const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
    const [ensembleMode, setEnsembleMode] = useState<boolean>(false);
    const [geminiModel1, setGeminiModel1] = useState<string>('gemini-2.5-flash');
    const [geminiModel2, setGeminiModel2] = useState<string>('gemini-2.0-flash-lite');
    const [geminiModel3, setGeminiModel3] = useState<string>('gemini-2.5-pro');
    const [geminiMergerModel, setGeminiMergerModel] = useState<string>('gemini-2.5-flash');
    const [overwriteInvoicePrices, setOverwriteInvoicePrices] = useState<boolean>(true);

    const loadSettings = async () => {
        const settings = await dbIPC.getSettings();
        if (settings.ai_ensemble_mode) setEnsembleMode(settings.ai_ensemble_mode === 'true');
        if (settings.gemini_model_name) setGeminiModel1(settings.gemini_model_name); // Re-use the existing model as Model 1
        if (settings.gemini_model_2) setGeminiModel2(settings.gemini_model_2);
        if (settings.gemini_model_3) setGeminiModel3(settings.gemini_model_3);
        if (settings.gemini_merger_model) setGeminiMergerModel(settings.gemini_merger_model);
        if (settings.ai_overwrite_invoice_prices) setOverwriteInvoicePrices(settings.ai_overwrite_invoice_prices === 'true');
    };

    const handleSaveSettings = async () => {
        soundFX.playSuccess();
        await dbIPC.setSetting('ai_ensemble_mode', ensembleMode ? 'true' : 'false');
        await dbIPC.setSetting('gemini_model_name', geminiModel1.trim() || 'gemini-2.5-flash');
        await dbIPC.setSetting('gemini_model_2', geminiModel2.trim() || 'gemini-2.0-flash-lite');
        await dbIPC.setSetting('gemini_model_3', geminiModel3.trim() || 'gemini-2.5-pro');
        await dbIPC.setSetting('gemini_merger_model', geminiMergerModel.trim() || 'gemini-2.5-flash');
        await dbIPC.setSetting('ai_overwrite_invoice_prices', overwriteInvoicePrices ? 'true' : 'false');
        
        setShowSettingsModal(false);
    };

    return {
        showSettingsModal, setShowSettingsModal,
        ensembleMode, setEnsembleMode,
        geminiModel1, setGeminiModel1,
        geminiModel2, setGeminiModel2,
        geminiModel3, setGeminiModel3,
        geminiMergerModel, setGeminiMergerModel,
        overwriteInvoicePrices, setOverwriteInvoicePrices,
        loadSettings, handleSaveSettings
    };
}
