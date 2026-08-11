import React from 'react';
import { motion } from 'framer-motion';
import { X, Cpu, FloppyDisk as Save, SlidersHorizontal, ShieldCheck } from '@phosphor-icons/react';

interface AISettingsModalProps {
    theme: 'cream' | 'dark';
    show: boolean;
    onClose: () => void;
    ensembleMode: boolean;
    geminiModel1: string;
    geminiModel2: string;
    geminiModel3: string;
    geminiMergerModel: string;
    overwriteInvoicePrices: boolean;
    onEnsembleModeChange: (val: boolean) => void;
    onGeminiModel1Change: (val: string) => void;
    onGeminiModel2Change: (val: string) => void;
    onGeminiModel3Change: (val: string) => void;
    onGeminiMergerModelChange: (val: string) => void;
    onOverwriteInvoicePricesChange: (val: boolean) => void;
    onSaveSettings: () => void;
}

export default function AISettingsModal({
    theme, show, onClose, 
    ensembleMode, geminiModel1, geminiModel2, geminiModel3, geminiMergerModel, overwriteInvoicePrices,
    onEnsembleModeChange, onGeminiModel1Change, onGeminiModel2Change, onGeminiModel3Change, onGeminiMergerModelChange, onOverwriteInvoicePricesChange, onSaveSettings
}: AISettingsModalProps) {
    if (!show) return null;
    const isCream = theme === 'cream';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className={`w-full max-w-lg rounded-2xl border shadow-2xl p-5 flex flex-col space-y-4 ${
                    isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center space-x-2.5">
                        <div className={`p-1.5 rounded-xl border ${
                            isCream ? 'bg-indigo-100 text-indigo-950 border-indigo-300' : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30'
                        }`}>
                            <SlidersHorizontal strokeWidth={2} className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black tracking-tight">AI Ayarları & Garanti Modu</h3>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className={`p-1 rounded-lg transition active:scale-95 ${
                            isCream ? 'text-slate-500 hover:text-slate-950 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        <X strokeWidth={2} className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="space-y-4">
                    {/* Ensemble Mode Toggle */}
                    <div className={`p-3 rounded-xl border flex items-center justify-between shadow-sm transition-colors ${
                        ensembleMode 
                            ? isCream ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-900/20 border-indigo-800/50'
                            : isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                    }`}>
                        <div className="flex items-start space-x-2.5">
                            <ShieldCheck strokeWidth={2} className={`h-5 w-5 mt-0.5 ${ensembleMode ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                            <div className="flex flex-col">
                                <span className="text-sm font-black tracking-tight">Garanti Modu (3 Model Ensemble)</span>
                                <span className={`text-[10px] font-bold leading-tight mt-0.5 ${isCream ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Faturayı 3 farklı modele eşzamanlı okutup, hakem model ile nihai hatasız sonucu çıkarır. (Daha maliyetlidir).
                                </span>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={ensembleMode}
                                onChange={(e) => onEnsembleModeChange(e.target.checked)}
                            />
                            <div className={`w-11 h-6 rounded-full peer-focus:outline-none transition-colors ${
                                ensembleMode 
                                    ? 'bg-indigo-600' 
                                    : isCream ? 'bg-slate-300' : 'bg-slate-700'
                            }`}>
                                <div className={`absolute top-[2px] left-[2px] bg-white border-slate-300 border rounded-full h-5 w-5 transition-transform ${
                                    ensembleMode ? 'translate-x-full border-white' : ''
                                }`}></div>
                            </div>
                        </label>
                    </div>

                    <div className="space-y-3">
                        <div className="flex flex-col space-y-1">
                            <label className="text-xs font-black ml-1 text-slate-500 dark:text-slate-400">
                                {ensembleMode ? 'Ana Model (Model 1)' : 'Gemini Model Adı'}
                            </label>
                            <input
                                type="text"
                                value={geminiModel1}
                                onChange={(e) => onGeminiModel1Change(e.target.value)}
                                placeholder="gemini-3.0-flash"
                                className={`px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none w-full shadow-sm ${
                                    isCream
                                        ? 'bg-white border-[#d8d1c2] text-slate-950 focus:border-indigo-500'
                                        : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500'
                                }`}
                            />
                        </div>

                        {ensembleMode && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3"
                            >
                                <div className="flex flex-col space-y-1">
                                    <label className="text-xs font-black ml-1 text-slate-500 dark:text-slate-400">Model 2</label>
                                    <input
                                        type="text"
                                        value={geminiModel2}
                                        onChange={(e) => onGeminiModel2Change(e.target.value)}
                                        placeholder="gemini-3.5-flash-lite"
                                        className={`px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none w-full shadow-sm ${
                                            isCream
                                                ? 'bg-white border-[#d8d1c2] text-slate-950 focus:border-indigo-500'
                                                : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500'
                                        }`}
                                    />
                                </div>
                                
                                <div className="flex flex-col space-y-1">
                                    <label className="text-xs font-black ml-1 text-slate-500 dark:text-slate-400">Model 3</label>
                                    <input
                                        type="text"
                                        value={geminiModel3}
                                        onChange={(e) => onGeminiModel3Change(e.target.value)}
                                        placeholder="gemini-3.0-pro"
                                        className={`px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none w-full shadow-sm ${
                                            isCream
                                                ? 'bg-white border-[#d8d1c2] text-slate-950 focus:border-indigo-500'
                                                : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500'
                                        }`}
                                    />
                                </div>

                                <div className={`mt-2 p-2 rounded-xl border-2 border-dashed ${isCream ? 'border-indigo-200 bg-indigo-50/50' : 'border-indigo-800/50 bg-indigo-900/10'}`}>
                                    <div className="flex flex-col space-y-1">
                                        <label className="text-xs font-black ml-1 text-indigo-700 dark:text-indigo-400">Hakem / Birleştirici Model (Merger)</label>
                                        <input
                                            type="text"
                                            value={geminiMergerModel}
                                            onChange={(e) => onGeminiMergerModelChange(e.target.value)}
                                            placeholder="gemini-3.0-pro"
                                            className={`px-3 py-2 rounded-xl border text-sm font-mono font-bold outline-none w-full shadow-sm ${
                                                isCream
                                                    ? 'bg-white border-indigo-300 text-slate-950 focus:border-indigo-600'
                                                    : 'bg-slate-950 border-indigo-700 text-slate-100 focus:border-indigo-500'
                                            }`}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                <div className={`p-3 rounded-xl border ${isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-950 border-slate-700'}`}>
                    <label className="flex items-center cursor-pointer justify-between">
                        <div className="flex flex-col">
                            <span className={`text-sm font-black ${isCream ? 'text-slate-900' : 'text-slate-100'}`}>Fatura Fiyatlarını Overwrite Et</span>
                            <span className="text-[11px] font-bold text-slate-500">Açıkken faturadaki birim maliyet/satış fiyatları mevcut ürünün fiyatını ezer.</span>
                        </div>
                        <div className="relative inline-flex items-center ml-4">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={overwriteInvoicePrices}
                                onChange={(e) => onOverwriteInvoicePricesChange(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                        </div>
                    </label>
                </div>

                <div className="pt-2">
                    <button
                        onClick={onSaveSettings}
                        className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black flex items-center justify-center space-x-2 shadow-md transition active:scale-95"
                    >
                        <Save strokeWidth={2} className="h-5 w-5" />
                        <span>Ayarları Kaydet</span>
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
