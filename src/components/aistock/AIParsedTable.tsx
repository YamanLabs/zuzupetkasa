import React from 'react';
import { Package as PackagePlus, Sparkle as Sparkles, Receipt, WarningCircle as AlertCircle, Package, X, Barcode, ArrowsClockwise } from '@phosphor-icons/react';
import { AIParsedItem } from '@/hooks/useAIAnalysis';

interface AIParsedTableProps {
    theme: 'cream' | 'dark';
    parsedItems: AIParsedItem[];
    selectedItemIndex: number | null;
    isSaving: boolean;
    availableCategories: string[];
    categoryMargins: Record<string, { cash: number; card: number }>;
    invoiceServiceFee: number;
    totalProductQuantity: number;
    serviceFeePerUnit: number;
    onSelectItem: (index: number) => void;
    onServiceFeeChange: (val: number) => void;
    onCategoryChange: (index: number, newCat: string) => void;
    onItemFieldChange: (index: number, field: keyof AIParsedItem, value: any) => void;
    onCommitStock: () => void;
    onRemoveItem: (index: number) => void;
    onToggleMatchedStatus: (index: number) => void;
    selectedIndices: Set<number>;
    onSelectAll: (selectAll: boolean) => void;
    onToggleSelectIndex: (index: number) => void;
    onBulkCategoryChange: (newCat: string) => void;
    onBulkRemove: () => void;
}

export default function AIParsedTable({
    theme, parsedItems, selectedItemIndex, isSaving, availableCategories, categoryMargins,
    invoiceServiceFee, totalProductQuantity, serviceFeePerUnit,
    onSelectItem, onServiceFeeChange, onCategoryChange, onItemFieldChange, onCommitStock, onRemoveItem, onToggleMatchedStatus,
    selectedIndices, onSelectAll, onToggleSelectIndex, onBulkCategoryChange, onBulkRemove
}: AIParsedTableProps) {
    const isCream = theme === 'cream';

    return (
        <div className={`w-full flex-1 min-h-0 border rounded-2xl p-3 flex flex-col space-y-3 shadow-sm transition-colors duration-200 ${
            isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
        }`}>
            {/* Header Controls & Service Fee Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center space-x-2.5">
                    <h3 className={`font-black text-sm tracking-tight ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                        AI Tarafından Okunan Fatura Kalemleri
                    </h3>
                    <span className={`font-black text-xs px-2.5 py-0.5 rounded-full border ${
                        isCream ? 'bg-purple-100 text-purple-950 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                    }`}>
                        {parsedItems.length} Kalem
                    </span>
                </div>

                {parsedItems.length > 0 && (
                    <div className="flex items-center space-x-3">
                        {/* Service Fee Input */}
                        <div className={`px-3 py-1 rounded-xl border flex items-center space-x-2 text-xs font-bold ${
                            isCream ? 'bg-[#faf8f2] border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                        }`}>
                            <span className={isCream ? 'text-slate-700' : 'text-slate-300'}>Hizmet/Kargo Masrafı:</span>
                            <div className="flex items-center space-x-1">
                                <input
                                    type="number"
                                    value={invoiceServiceFee || ''}
                                    onChange={(e) => onServiceFeeChange(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className={`w-16 border rounded-lg px-1.5 py-0.5 font-black text-right font-mono text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none ${
                                        isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-800 border-slate-700 text-white'
                                    }`}
                                />
                                <span className="font-extrabold text-slate-500">TL</span>
                            </div>
                            <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 pl-1 border-l border-slate-300 dark:border-slate-700">
                                (+{serviceFeePerUnit.toFixed(2)} ₺/Adet)
                            </span>
                        </div>

                        {/* Bulk Actions */}
                        {selectedIndices.size > 0 && (
                            <div className={`px-2 py-1 rounded-xl border flex items-center space-x-2 ${
                                isCream ? 'bg-purple-50 border-purple-200' : 'bg-purple-950/30 border-purple-800/50'
                            }`}>
                                <span className={`text-[11px] font-bold ${isCream ? 'text-purple-700' : 'text-purple-300'}`}>
                                    {selectedIndices.size} Seçili
                                </span>
                                <div className="flex items-center space-x-1 border-l pl-2 ml-2 border-purple-300 dark:border-purple-800/50">
                                    <select
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value) onBulkCategoryChange(e.target.value);
                                        }}
                                        className={`text-xs px-1.5 py-0.5 rounded border outline-none font-bold ${
                                            isCream ? 'bg-white border-purple-200 text-purple-900' : 'bg-slate-900 border-purple-800/50 text-purple-100'
                                        }`}
                                    >
                                        <option value="" disabled>Kategori Değiştir</option>
                                        {availableCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={onBulkRemove}
                                        className={`p-1 rounded-md transition-colors ${
                                            isCream ? 'hover:bg-rose-100 text-rose-600' : 'hover:bg-rose-950/50 text-rose-400'
                                        }`}
                                        title="Seçilenleri Sil"
                                    >
                                        <X weight="bold" className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Commit Stock Action Button */}
                        <button
                            onClick={onCommitStock}
                            disabled={isSaving}
                            className={`font-black px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition active:scale-95 disabled:opacity-50 ${
                                isCream ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                        >
                            <PackagePlus strokeWidth={2} className="h-4 w-4" />
                            <span>{isSaving ? 'Aktarılıyor...' : 'Tümünü Stoğa Aktar'}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* 60 FPS Ultra-Compact Data Table */}
            <div className={`flex-1 min-h-0 overflow-auto rounded-xl border shadow-sm transition-colors duration-150 ${
                isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
            }`}>
                <table className="w-full text-left border-collapse min-w-[920px]">
                    <thead className={`sticky top-0 border-b text-[11px] font-black uppercase tracking-wider z-10 ${
                        isCream 
                            ? 'bg-[#f4f0e6] border-[#d8d1c2] text-slate-700' 
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}>
                        <tr>
                            <th className="py-2 px-2.5 w-8 text-center whitespace-nowrap">
                                <input 
                                    type="checkbox" 
                                    className="cursor-pointer"
                                    checked={parsedItems.length > 0 && selectedIndices.size === parsedItems.length}
                                    onChange={(e) => onSelectAll(e.target.checked)}
                                />
                            </th>
                            <th className="py-2 px-2.5 w-32 whitespace-nowrap">Barkod</th>
                            <th className="py-2 px-2.5 min-w-[200px]">Ürün Adı</th>
                            <th className="py-2 px-2.5 w-32 whitespace-nowrap">Kategori</th>
                            <th className="py-2 px-2.5 w-20 text-center whitespace-nowrap">Miktar</th>
                            <th className="py-2 px-2.5 w-24 text-right whitespace-nowrap">KDV Hariç Fiyat</th>
                            <th className="py-2 px-2.5 w-16 text-center whitespace-nowrap">KDV %</th>
                            <th className="py-2 px-2.5 w-24 text-right whitespace-nowrap text-amber-700 dark:text-amber-400">Efektif Alış</th>
                            <th className="py-2 px-2.5 w-16 text-center whitespace-nowrap">Kar %</th>
                            <th className="py-2 px-2.5 w-24 text-right whitespace-nowrap text-emerald-700 dark:text-emerald-400">Satış Fiyatı</th>
                            <th className="py-2 px-2.5 w-24 text-center whitespace-nowrap">Durum</th>
                            <th className="py-2 px-1 w-10 text-center whitespace-nowrap">Kaldır</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${isCream ? 'divide-[#ece6da]' : 'divide-slate-800/80'}`}>
                        {parsedItems.map((item, idx) => {
                            const isSelected = selectedItemIndex === idx;
                            const hasNoBarcode = !item.barcode;
                            const catOptions = Array.from(new Set([...availableCategories, item.category])).sort();
                            const unitCostWithTax = item.unit_price_excl_tax || 0;
                            const effectiveCost = item.effective_cost || Math.round((unitCostWithTax + serviceFeePerUnit) * 100) / 100;

                            const catObj = categoryMargins[item.category];
                            const currentMargin: number = typeof catObj === 'object' && catObj !== null ? catObj.cash : (Number(catObj) || 30);

                            return (
                                <tr
                                    key={idx}
                                    onClick={() => onSelectItem(idx)}
                                    className={`cursor-pointer transition-colors duration-75 ${
                                        isSelected 
                                            ? isCream
                                                ? 'bg-[#ffeed3] border-l-4 border-l-purple-600 font-extrabold text-slate-950'
                                                : 'bg-purple-600/30 border-l-4 border-l-purple-400 font-extrabold text-white shadow-inner'
                                            : isCream
                                                ? 'hover:bg-purple-500/10 text-slate-900'
                                                : 'hover:bg-slate-800/70 text-slate-100'
                                    }`}
                                >
                                    {/* SEÇİM KUTUSU */}
                                    <td className="py-1.5 px-2.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            className="cursor-pointer"
                                            checked={selectedIndices.has(idx)}
                                            onChange={() => onToggleSelectIndex(idx)}
                                        />
                                    </td>

                                    {/* BARKOD - Düzenlenebilir Input */}
                                    <td className="py-1.5 px-2.5 font-mono text-[11px] whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center space-x-1">
                                            <input
                                                type="text"
                                                placeholder="Barkod gir/okut"
                                                value={item.barcode || ''}
                                                onChange={(e) => onItemFieldChange(idx, 'barcode', e.target.value)}
                                                onClick={(e) => { e.stopPropagation(); onSelectItem(idx); }}
                                                className={`w-28 border rounded px-1.5 py-0.5 font-mono text-[11px] font-bold outline-none transition-all ${
                                                    hasNoBarcode
                                                        ? 'bg-rose-500/10 border-rose-400 text-rose-700 dark:text-rose-300 placeholder-rose-400/70 focus:border-purple-600'
                                                        : isCream
                                                            ? 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                                                            : 'bg-slate-800 border-slate-700 text-slate-100 focus:border-purple-400'
                                                }`}
                                            />
                                        </div>
                                    </td>

                                    {/* ÜRÜN ADI */}
                                    <td className="py-1.5 px-2.5">
                                        <div className="flex items-center space-x-1.5">
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => onItemFieldChange(idx, 'name', e.target.value)}
                                                className={`w-full bg-transparent border-b border-dashed border-transparent hover:border-slate-400 focus:border-purple-600 outline-none font-extrabold ${
                                                    isCream 
                                                        ? isSelected ? 'text-slate-950' : 'text-slate-900' 
                                                        : isSelected ? 'text-white' : 'text-slate-100'
                                                }`}
                                            />
                                            {item.matchedProduct && (
                                                <div title="Bu ürün veritabanında mevcut, stok güncellenecek." className="text-purple-600 dark:text-purple-400 shrink-0 cursor-help">
                                                    <Package strokeWidth={2.5} className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* KATEGORİ */}
                                    <td className="py-1.5 px-2.5">
                                        <select
                                            value={item.category}
                                            onChange={(e) => onCategoryChange(idx, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`border rounded-lg px-1.5 py-0.5 text-[11px] font-extrabold ${
                                                isCream 
                                                    ? 'bg-white border-[#d8d1c2] text-purple-950' 
                                                    : 'bg-slate-800 border-slate-700 text-purple-300'
                                            }`}
                                        >
                                            {catOptions.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </td>

                                    {/* MİKTAR */}
                                    <td className={`py-1.5 px-2.5 text-center font-black ${isCream ? 'text-slate-950' : 'text-white'}`}>
                                        {item.quantity} {item.unit}
                                    </td>
                                    
                                    {/* BİRİM FİYAT */}
                                    <td className="py-1.5 px-2.5 text-right">
                                        <input
                                            type="number"
                                            value={isNaN(item.unit_price_excl_tax) || item.unit_price_excl_tax === undefined || item.unit_price_excl_tax === null ? 0 : item.unit_price_excl_tax}
                                            onChange={(e) => onItemFieldChange(idx, 'unit_price_excl_tax', parseFloat(e.target.value) || 0)}
                                            className={`w-16 text-right font-mono font-extrabold bg-transparent border-b border-dashed border-transparent hover:border-slate-400 focus:border-purple-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                                isCream ? 'text-slate-900' : 'text-slate-200'
                                            }`}
                                        />
                                    </td>

                                    {/* KDV % */}
                                    <td className="py-1.5 px-2.5 text-center font-extrabold text-slate-500">
                                        %{item.vat_rate || 20}
                                    </td>

                                    {/* EFEKTİF MASRAFLI ALIŞ */}
                                    <td className="py-1.5 px-2.5 text-right font-black font-mono text-amber-800 dark:text-amber-400">
                                        {(effectiveCost || 0).toFixed(2)} TL
                                    </td>

                                    {/* KAR % */}
                                    <td className="py-1.5 px-2.5 text-center">
                                        <span className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                                            +%{currentMargin}
                                        </span>
                                    </td>

                                    {/* SATIŞ FİYATI */}
                                    <td className="py-1.5 px-2.5 text-right">
                                        <input
                                            type="number"
                                            value={isNaN(item.sale_price) || item.sale_price === undefined || item.sale_price === null ? 0 : item.sale_price}
                                            onChange={(e) => onItemFieldChange(idx, 'sale_price', parseFloat(e.target.value) || 0)}
                                            className={`w-16 text-right font-black font-mono bg-transparent border-b border-dashed border-transparent hover:border-slate-400 focus:border-purple-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                                isCream ? 'text-emerald-950' : 'text-emerald-400'
                                            }`}
                                        />
                                    </td>

                                    {/* DURUM - Tıklanabilir Değiştirme Butonu */}
                                    <td className="py-1.5 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => onToggleMatchedStatus(idx)}
                                            title={item.matchedProduct ? "Tıkla: Yeni Ürün olarak kaydet" : "Tıkla: Mevcut stok ile güncelle"}
                                            className={`text-[10px] px-2 py-0.5 rounded-md font-black border transition active:scale-95 cursor-pointer inline-flex items-center space-x-1 shadow-sm ${
                                                item.matchedProduct
                                                    ? 'bg-blue-500/20 text-blue-900 dark:text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                                                    : 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                            }`}
                                        >
                                            <span>{item.matchedProduct ? 'Güncelleme' : 'Yeni Ürün'}</span>
                                            <ArrowsClockwise strokeWidth={2.5} className="h-3 w-3 opacity-70 hover:opacity-100" />
                                        </button>
                                    </td>

                                    {/* KALDIR / SİL BUTONU */}
                                    <td className="py-1.5 px-1 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => onRemoveItem(idx)}
                                            title="Bu ürünü faturadan/listeden kaldır"
                                            className={`p-1 rounded-lg transition active:scale-90 ${
                                                isCream
                                                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-100'
                                                    : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/20'
                                            }`}
                                        >
                                            <X strokeWidth={2.5} className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {parsedItems.length === 0 && (
                    <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                        <Sparkles strokeWidth={1.5} className="h-10 w-10 opacity-30 text-purple-600" />
                        <p className="font-extrabold text-xs text-slate-600 dark:text-slate-400">Henüz fatura taranmadı.</p>
                        <p className="text-[11px] opacity-75">Yukarıdaki "Fatura / PDF Ekle" butonunu kullanarak dosya seçin ve taramayı başlatın.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
