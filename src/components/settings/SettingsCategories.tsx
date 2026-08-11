import React from 'react';
import { Tag, Plus, ArrowsClockwise as RefreshCw, Trash as Trash2 } from '@phosphor-icons/react';

interface SettingsCategoriesProps {
    theme: 'cream' | 'dark';
    categoryMargins: Record<string, { cash: number; card: number }>;
    newCategoryName: string;
    newCategoryCashMargin: string;
    newCategoryCardMargin: string;
    updatingCat: string | null;
    onNewCategoryNameChange: (val: string) => void;
    onNewCategoryCashMarginChange: (val: string) => void;
    onNewCategoryCardMarginChange: (val: string) => void;
    onAddCategory: () => void;
    onMarginChange: (catName: string, type: 'cash' | 'card', valueStr: string) => void;
    onBatchUpdatePrices: (catName: string, cashMargin: number, cardMargin: number) => void;
    onDeleteCategory: (catName: string) => void;
}

export default function SettingsCategories({
    theme, categoryMargins, newCategoryName, newCategoryCashMargin, newCategoryCardMargin, updatingCat,
    onNewCategoryNameChange, onNewCategoryCashMarginChange, onNewCategoryCardMarginChange,
    onAddCategory, onMarginChange, onBatchUpdatePrices, onDeleteCategory
}: SettingsCategoriesProps) {
    const isCream = theme === 'cream';

    return (
        <div className={`border rounded-2xl p-4 space-y-3.5 shadow-sm transition-colors duration-150 ${
            isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
        }`}>
            <div className="flex items-center justify-between pb-2">
                <div className="flex items-center space-x-2">
                    <Tag strokeWidth={2} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className={`font-black text-sm ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                        Petshop Kategori Kar Marjı Ayarları (% Alış Üstü Satış)
                    </h3>
                </div>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                    isCream ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                    Satış = Alış * (1 + Kar %)
                </span>
            </div>

            <p className={`text-xs font-bold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>
                Gemini AI stok analizi yaparken ürünleri bu kategorilere ayırır ve alış fiyatının üstüne belirlenen Nakit ve Kart kar marjını (%) ekleyerek satış fiyatını otomatik hesaplar.
            </p>

            {/* Yeni Kategori Ekleme Formu */}
            <div className={`p-2.5 rounded-xl border flex flex-wrap items-center gap-2.5 ${
                isCream ? 'bg-[#faf8f2] border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
            }`}>
                <input
                    type="text"
                    placeholder="Yeni Kategori Adı (Örn: Kuş Malzemeleri)"
                    value={newCategoryName}
                    onChange={(e) => onNewCategoryNameChange(e.target.value)}
                    className={`flex-1 min-w-[200px] border rounded-xl px-3 py-1.5 text-xs font-bold outline-none ${
                        isCream ? 'bg-white border-[#d8d1c2] text-slate-950 placeholder-slate-500' : 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                    }`}
                />
                <div className="flex items-center space-x-1">
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">Nakit %:</span>
                    <input
                        type="number"
                        placeholder="30"
                        value={newCategoryCashMargin}
                        onChange={(e) => onNewCategoryCashMarginChange(e.target.value)}
                        className={`w-16 border rounded-xl px-2 py-1 text-xs font-black font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none outline-none ${
                            isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-900 border-slate-700 text-white'
                        }`}
                    />
                </div>
                <div className="flex items-center space-x-1">
                    <span className="text-xs font-black text-blue-700 dark:text-blue-400">Kart %:</span>
                    <input
                        type="number"
                        placeholder="35"
                        value={newCategoryCardMargin}
                        onChange={(e) => onNewCategoryCardMarginChange(e.target.value)}
                        className={`w-16 border rounded-xl px-2 py-1 text-xs font-black font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none outline-none ${
                            isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-900 border-slate-700 text-white'
                        }`}
                    />
                </div>
                <button
                    type="button"
                    onClick={onAddCategory}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1 shadow-md transition active:scale-95"
                >
                    <Plus strokeWidth={2.5} className="h-4 w-4" />
                    <span>Kategori Ekle</span>
                </button>
            </div>

            {/* Mevcut Kategoriler ve Marjları */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {Object.entries(categoryMargins).map(([catName, marginObj]) => {
                    const cashM = typeof marginObj === 'object' && marginObj !== null ? (marginObj.cash ?? 30) : (Number(marginObj) || 30);
                    const cardM = typeof marginObj === 'object' && marginObj !== null ? (marginObj.card ?? (cashM + 5)) : (cashM + 5);

                    return (
                        <div
                            key={catName}
                            className={`p-2.5 rounded-xl border flex items-center justify-between space-x-2 transition ${
                                isCream ? 'bg-[#faf8f2] border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                            }`}
                        >
                            <div className="flex items-center space-x-2 min-w-0">
                                <Tag strokeWidth={2} className="h-4 w-4 text-amber-700 flex-shrink-0" />
                                <span className={`font-black text-xs truncate ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>{catName}</span>
                            </div>

                            <div className="flex items-center space-x-2 flex-shrink-0">
                                <div className="flex items-center space-x-1">
                                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">Nakit %</span>
                                    <input
                                        type="number"
                                        value={cashM}
                                        onChange={(e) => onMarginChange(catName, 'cash', e.target.value)}
                                        className={`w-14 border rounded-lg px-1.5 py-0.5 text-xs font-black font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                            isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-900 border-slate-700 text-white'
                                        }`}
                                    />
                                </div>

                                <div className="flex items-center space-x-1">
                                    <span className="text-[10px] font-black text-blue-700 dark:text-blue-400">Kart %</span>
                                    <input
                                        type="number"
                                        value={cardM}
                                        onChange={(e) => onMarginChange(catName, 'card', e.target.value)}
                                        className={`w-14 border rounded-lg px-1.5 py-0.5 text-xs font-black font-mono text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                            isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-900 border-slate-700 text-white'
                                        }`}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => onBatchUpdatePrices(catName, cashM, cardM)}
                                    disabled={updatingCat === catName}
                                    title="Tüm Ürün Fiyatlarını Güncelle"
                                    className={`p-1.5 rounded-lg border transition active:scale-90 ${
                                        isCream ? 'bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-200' : 'bg-slate-800 border-slate-700 text-slate-200'
                                    }`}
                                >
                                    <RefreshCw strokeWidth={2} className={`h-3.5 w-3.5 ${updatingCat === catName ? 'animate-spin' : ''}`} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onDeleteCategory(catName)}
                                    title="Kategoriyi Sil"
                                    className={`p-1.5 rounded-lg border transition active:scale-90 ${
                                        isCream ? 'bg-rose-100 border-rose-300 text-rose-950 hover:bg-rose-200' : 'bg-slate-800 border-slate-700 text-rose-400'
                                    }`}
                                >
                                    <Trash2 strokeWidth={2} className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
