import { useState } from 'react';
import { dbIPC } from '@/lib/ipc';
import { soundFX } from '@/lib/sound-effects';

export interface AICustomRule {
    id: string;
    keyword: string;
    category: string;
}

export function useAIRules() {
    const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
    const [customRules, setCustomRules] = useState<AICustomRule[]>([]);
    const [customPromptText, setCustomPromptText] = useState<string>('');
    const [newKeyword, setNewKeyword] = useState<string>('');
    const [newTargetCategory, setNewTargetCategory] = useState<string>('');
    const [activeRulesTab, setActiveRulesTab] = useState<'categories' | 'prompt'>('categories');

    const loadRules = async () => {
        const settings = await dbIPC.getSettings();
        if (settings.ai_custom_rules) {
            try {
                setCustomRules(JSON.parse(settings.ai_custom_rules));
            } catch (e) {}
        }
        if (settings.ai_custom_prompt_text) {
            setCustomPromptText(settings.ai_custom_prompt_text);
        }
    };

    const handleAddRule = () => {
        if (!newKeyword.trim() || !newTargetCategory) return;
        soundFX.playClick();
        const rule: AICustomRule = {
            id: Date.now().toString(),
            keyword: newKeyword.trim(),
            category: newTargetCategory
        };
        setCustomRules(prev => [...prev, rule]);
        setNewKeyword('');
    };

    const handleRemoveRule = (id: string) => {
        soundFX.playClick();
        setCustomRules(prev => prev.filter(r => r.id !== id));
    };

    const handleSaveRules = async () => {
        soundFX.playSuccess();
        await dbIPC.setSetting('ai_custom_rules', JSON.stringify(customRules));
        await dbIPC.setSetting('ai_custom_prompt_text', customPromptText);
        setShowRulesModal(false);
    };

    return {
        showRulesModal, setShowRulesModal,
        customRules, setCustomRules,
        customPromptText, setCustomPromptText,
        newKeyword, setNewKeyword,
        newTargetCategory, setNewTargetCategory,
        activeRulesTab, setActiveRulesTab,
        loadRules, handleAddRule, handleRemoveRule, handleSaveRules
    };
}
