import React from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal as Sliders, Tag, FileText, Plus, Trash as Trash2, FloppyDisk as Save, ArrowRight, X } from '@phosphor-icons/react';
import { AICustomRule } from '@/hooks/useAIRules';

interface AIRulesModalProps {
    theme: 'cream' | 'dark';
    show: boolean;
    onClose: () => void;
    customRules: AICustomRule[];
    customPromptText: string;
    newKeyword: string;
    newTargetCategory: string;
    activeRulesTab: 'categories' | 'prompt';
    availableCategories: string[];
    onActiveTabChange: (tab: 'categories' | 'prompt') => void;
    onNewKeywordChange: (val: string) => void;
    onNewTargetCategoryChange: (val: string) => void;
    onAddRule: () => void;
    onRemoveRule: (id: string) => void;
    onCustomPromptTextChange: (val: string) => void;
    onSaveRules: () => void;
}

export default function AIRulesModal({
    theme, show, onClose, customRules, customPromptText, newKeyword, newTargetCategory, activeRulesTab, availableCategories,
    onActiveTabChange, onNewKeywordChange, onNewTargetCategoryChange, onAddRule, onRemoveRule, onCustomPromptTextChange, onSaveRules
}: AIRulesModalProps) {
    if (!show) return null;
    const isCream = theme === 'cream';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`w-full max-w-xl rounded-2xl border shadow-2xl p-4 overflow-hidden flex flex-col space-y-3 max-h-[85vh] ${
                    isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center space-x-2.5">
                        <div className={`p-1.5 rounded-xl border ${
                            isCream ? 'bg-purple-100 text-purple-950 border-purple-300' : 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                        }`}>
                            <Sliders strokeWidth={2} className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black tracking-tight">AI Stok Kuralları & Talimatlar</h3>
                            <p className={`text-[11px] font-bold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>
                                Gemini AI fatura okuma ve kategori dağıtım kuralları
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className={`p-1 rounded-lg transition active:scale-95 ${
                            isCream ? 'text-slate-500 hover:text-slate-950 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        <X strokeWidth={2} className="h-4 w-4" />
                    </button>
                </div>

                {/* Sub Navigation Tabs */}
                <div className="flex space-x-1.5 pb-2">
                    <button
                        onClick={() => onActiveTabChange('categories')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition ${
                            activeRulesTab === 'categories'
                                ? 'bg-purple-700 text-white shadow-sm'
                                : isCream ? 'bg-white border border-[#d8d1c2] text-slate-800 hover:bg-purple-50' : 'bg-slate-800 text-slate-300'
                        }`}
                    >
                        <Tag strokeWidth={2} className="h-3.5 w-3.5" />
                        <span>Kategori Eşleştirme Kuralları ({customRules.length})</span>
                    </button>

                    <button
                        onClick={() => onActiveTabChange('prompt')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition ${
                            activeRulesTab === 'prompt'
                                ? 'bg-purple-700 text-white shadow-sm'
                                : isCream ? 'bg-white border border-[#d8d1c2] text-slate-800 hover:bg-purple-50' : 'bg-slate-800 text-slate-300'
                        }`}
                    >
                        <FileText strokeWidth={2} className="h-3.5 w-3.5" />
                        <span>Özel AI Prompt Talimatı</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {activeRulesTab === 'categories' ? (
                        <div className="space-y-3">
                            <div className={`p-3 rounded-xl border space-y-2.5 ${
                                isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                            }`}>
                                <h4 className="text-xs font-black text-purple-700 dark:text-purple-400">Yeni Kategori Eşleştirme Kuralı Ekle</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                    <div className="sm:col-span-6 space-y-1">
                                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">Marka / Kelime</label>
                                        <input
                                            type="text"
                                            placeholder="Örn: Pro Plan, Whiskas..."
                                            value={newKeyword}
                                            onChange={(e) => onNewKeywordChange(e.target.value)}
                                            className={`w-full px-2.5 py-1 rounded-lg border text-xs font-bold outline-none ${
                                                isCream
                                                    ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950 focus:border-purple-600'
                                                    : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-purple-500'
                                            }`}
                                        />
                                    </div>

                                    <div className="sm:col-span-4 space-y-1">
                                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">Hedef Kategori</label>
                                        <select
                                            value={newTargetCategory}
                                            onChange={(e) => onNewTargetCategoryChange(e.target.value)}
                                            className={`w-full px-2.5 py-1 rounded-lg border text-xs font-bold outline-none ${
                                                isCream
                                                    ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950 focus:border-purple-600'
                                                    : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-purple-500'
                                            }`}
                                        >
                                            {availableCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <button
                                            onClick={onAddRule}
                                            className="w-full py-1 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-black flex items-center justify-center space-x-1 shadow-sm transition active:scale-95"
                                        >
                                            <Plus strokeWidth={2.5} className="h-3.5 w-3.5" />
                                            <span>Ekle</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Rules List */}
                            <div className="space-y-1.5">
                                <h4 className="text-xs font-black text-slate-600 dark:text-slate-400">Aktif Kural Listesi ({customRules.length})</h4>
                                {customRules.length === 0 ? (
                                    <p className="text-xs text-slate-400 font-bold italic py-3 text-center">Henüz özel kural eklenmedi.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {customRules.map((rule) => (
                                            <div
                                                key={rule.id}
                                                className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition ${
                                                    isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-100'
                                                }`}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-950 border border-purple-300 font-black">
                                                        "{rule.keyword}"
                                                    </span>
                                                    <ArrowRight strokeWidth={2} className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="text-emerald-700 dark:text-emerald-400 font-black">
                                                        {rule.category}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => onRemoveRule(rule.id)}
                                                    className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition active:scale-90"
                                                    title="Kuralı Sil"
                                                >
                                                    <Trash2 strokeWidth={2} className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-900 dark:text-slate-200">
                                Gemini AI Özel Fatura Okuma İstem / Talimat Metni
                            </label>
                            <textarea
                                rows={6}
                                placeholder="Örn: Faturada KDV %10 olan kedi mamalarını Yaş Mama grubuna dahil et..."
                                value={customPromptText}
                                onChange={(e) => onCustomPromptTextChange(e.target.value)}
                                className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none ${
                                    isCream
                                        ? 'bg-white border-[#d8d1c2] text-slate-950 focus:border-purple-600'
                                        : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-purple-500'
                                }`}
                            />
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                        onClick={onClose}
                        className={`font-bold px-3 py-1.5 rounded-xl text-xs transition active:scale-95 ${
                            isCream ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                    >
                        İptal
                    </button>
                    <button
                        onClick={onSaveRules}
                        className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-black text-xs shadow transition active:scale-95"
                    >
                        <Save strokeWidth={2} className="h-3.5 w-3.5" />
                        <span>Kuralları Kaydet</span>
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
