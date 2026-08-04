"use client";

import React from 'react';
import { Settings, CheckCircle2, Save, X, Link2 } from 'lucide-react';
import { generateReceiptHTML } from '@/lib/receipt-printer';
import { soundFX } from '@/lib/sound-effects';

import { useSettings } from '@/hooks/useSettings';
import SettingsNavigation from './settings/SettingsNavigation';
import SettingsCategories from './settings/SettingsCategories';
import SettingsPOS from './settings/SettingsPOS';
import SettingsCompany from './settings/SettingsCompany';
import SettingsAI from './settings/SettingsAI';
import SettingsSystem from './settings/SettingsSystem';

interface SettingsTabProps {
    theme?: 'cream' | 'dark';
    onThemeChange?: (theme: 'cream' | 'dark') => void;
}

export default function SettingsTab({ theme = 'cream', onThemeChange }: SettingsTabProps) {
    const isCream = theme === 'cream';
    const s = useSettings(onThemeChange);

    const handleSettingsChange = (key: string, value: string) => {
        s.setSettings(prev => ({ ...prev, [key]: value }));
    };

    const getSampleReceiptData = () => {
        return {
            storeName: s.settings.company_name || 'ZUZU PET',
            storeAddress: s.settings.company_address || 'Antalya, Türkiye',
            storePhone: s.settings.company_phone || '0555 123 45 67',
            receiptNo: 'FS-20260724-001',
            dateStr: new Date().toLocaleString('tr-TR'),
            logoUrl: '/xuxu_logo.png',
            items: [
                { name: 'ENJOY KUZU ETLİ KEDİ MAMASI 400 GR', quantity: 2, unitPrice: 559.92, totalPrice: 1119.84 },
                { name: 'GİMDOG KEDİ KÖPEK FIRÇA', quantity: 1, unitPrice: 433.20, totalPrice: 433.20 },
                { name: 'TIRMAMA TAHTASI 75 CM', quantity: 1, unitPrice: 976.40, totalPrice: 976.40 }
            ],
            subtotal: 2529.44,
            discount: 100.00,
            total: 2429.44,
            taxTotal: 404.90,
            paymentMethod: 'Kredi Kartı (POS)',
            paidAmount: 2429.44,
            changeAmount: 0.00,
            footerMsg: s.settings.receipt_footer || 'Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz!'
        };
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] p-4 space-y-3 overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 border rounded-xl ${
                        isCream ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}>
                        <Settings strokeWidth={2} className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className={`text-lg font-black tracking-tight ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                            Ayarlar Yönetimi
                        </h2>
                        <p className={`text-[11px] font-bold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>
                            Sistem, kategori kar marjları, POS ve mağaza yapılandırmaları
                        </p>
                    </div>
                </div>

                {s.savedNotice && (
                    <div className="bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-black px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-sm animate-bounce">
                        <CheckCircle2 strokeWidth={2} className="h-4 w-4 text-emerald-600" />
                        <span>Ayarlar Kaydedildi!</span>
                    </div>
                )}
            </div>

            <SettingsNavigation theme={theme} activeTab={s.activeTab} onTabSelect={(tab) => { soundFX.playClick(); s.setActiveTab(tab); }} />

            <form onSubmit={s.handleSave} className="flex-1 overflow-y-auto space-y-4 pr-1 pb-16">
                {s.activeTab === 'categories' && (
                    <SettingsCategories 
                        theme={theme}
                        categoryMargins={s.categoryMargins}
                        newCategoryName={s.newCategoryName}
                        newCategoryCashMargin={s.newCategoryCashMargin}
                        newCategoryCardMargin={s.newCategoryCardMargin}
                        updatingCat={s.updatingCat}
                        onNewCategoryNameChange={s.setNewCategoryName}
                        onNewCategoryCashMarginChange={s.setNewCategoryCashMargin}
                        onNewCategoryCardMarginChange={s.setNewCategoryCardMargin}
                        onAddCategory={s.handleAddCategory}
                        onMarginChange={s.handleMarginChange}
                        onBatchUpdatePrices={s.handleBatchUpdatePrices}
                        onDeleteCategory={s.handleDeleteCategory}
                    />
                )}

                {s.activeTab === 'pos' && (
                    <SettingsPOS 
                        theme={theme}
                        settings={s.settings}
                        onSettingsChange={handleSettingsChange}
                        onOpenPairingModal={() => { s.setPairStatusMsg(''); s.setShowPairingModal(true); }}
                    />
                )}

                {s.activeTab === 'company' && (
                    <SettingsCompany 
                        theme={theme}
                        settings={s.settings}
                        onSettingsChange={handleSettingsChange}
                        onPreviewReceipt={() => s.setShowReceiptPreview(true)}
                    />
                )}

                {s.activeTab === 'ai' && (
                    <SettingsAI 
                        theme={theme}
                        settings={s.settings}
                        onSettingsChange={handleSettingsChange}
                    />
                )}

                {s.activeTab === 'system' && (
                    <SettingsSystem 
                        theme={theme}
                        settings={s.settings}
                        soundEnabled={s.soundEnabled}
                        onThemeSelect={s.handleThemeSelect}
                        onToggleSound={s.toggleSound}
                        onClearDatabase={s.handleClearDatabase}
                        onExportBackup={s.handleExportBackup}
                        onImportBackup={s.handleImportBackup}
                    />
                )}

                {/* Fixed Save Button */}
                <div className="fixed bottom-4 right-4 z-20">
                    <button
                        type="submit"
                        className={`font-black py-2.5 px-5 rounded-2xl flex items-center space-x-2 shadow-lg transition active:scale-95 ${
                            isCream ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                    >
                        <Save strokeWidth={2} className="h-4 w-4" />
                        <span>Ayarları Kaydet</span>
                    </button>
                </div>
            </form>

            {/* Receipt Preview Modal */}
            {s.showReceiptPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
                    <div className={`rounded-2xl p-4 max-w-sm w-full shadow-2xl relative max-h-[90vh] flex flex-col space-y-3 border transition-all ${
                        isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}>
                        <div className="flex items-center justify-between pb-2">
                            <h3 className="text-sm font-black tracking-tight">80mm Termal Fiş Önizleme</h3>
                            <button
                                type="button"
                                onClick={() => s.setShowReceiptPreview(false)}
                                className={`p-1 rounded-lg transition active:scale-95 ${
                                    isCream ? 'text-slate-400 hover:text-slate-950 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <X strokeWidth={2} className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-3 rounded-xl flex justify-center shadow-inner">
                            <div 
                                className="bg-white shadow-sm p-4 w-[280px] text-black text-xs font-mono"
                                dangerouslySetInnerHTML={{ __html: generateReceiptHTML(getSampleReceiptData()) }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* inPOS Pairing Modal */}
            {s.showPairingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-sm rounded-2xl border shadow-2xl p-4 flex flex-col space-y-3 relative overflow-hidden transition-all ${
                        isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}>
                        <div className="flex items-center justify-between pb-2">
                            <h3 className="text-sm font-black tracking-tight">inPOS Cihaz Eşleme</h3>
                            <button 
                                type="button"
                                onClick={() => s.setShowPairingModal(false)} 
                                className={`p-1 rounded-lg transition active:scale-95 ${
                                    isCream ? 'text-slate-400 hover:text-slate-950 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <X strokeWidth={2} className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <div className="space-y-3 text-xs">
                            <p className={`text-[11px] font-bold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>
                                Yerel ağdaki inPOS yazar kasa cihazı ile POS yazılımını eşleştirmek için IP adresini girin.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className={`block font-black mb-1 ${isCream ? 'text-slate-950' : 'text-slate-300'}`}>inPOS IP Adresi</label>
                                    <input 
                                        type="text" 
                                        value={s.pairIp} 
                                        onChange={e => s.setPairIp(e.target.value)} 
                                        className={`w-full border rounded-xl px-2.5 py-1.5 font-mono font-bold text-xs ${
                                            isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-white'
                                        } focus:ring-2 focus:ring-blue-500 focus:outline-none`} 
                                    />
                                </div>
                                <div>
                                    <label className={`block font-black mb-1 ${isCream ? 'text-slate-950' : 'text-slate-300'}`}>Port (59000)</label>
                                    <input 
                                        type="text" 
                                        value={s.pairPort} 
                                        onChange={e => s.setPairPort(e.target.value)} 
                                        className={`w-full border rounded-xl px-2.5 py-1.5 font-mono font-bold text-xs ${
                                            isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-white'
                                        } focus:ring-2 focus:ring-blue-500 focus:outline-none`} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
