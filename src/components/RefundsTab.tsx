"use client";

import React, { useState, useEffect } from 'react';
import { dbIPC, Sale, SaleItem } from '@/lib/ipc';
import { soundFX } from '@/lib/sound-effects';
import { ArrowUUpLeft as Undo2, MagnifyingGlass as Search, Receipt, Calendar, CheckCircle as CheckCircle2, WarningCircle as AlertCircle, ArrowsClockwise as RefreshCw, X, Trash as Trash2, Funnel as Filter } from '@phosphor-icons/react';

interface RefundsTabProps {
    theme?: 'cream' | 'dark';
}

export default function RefundsTab({ theme = 'cream' }: RefundsTabProps) {
    const isCream = theme === 'cream';
    const [sales, setSales] = useState<Sale[]>([]);
    const [dateStart, setDateStart] = useState<string>('');
    const [dateEnd, setDateEnd] = useState<string>('');
    const [searchReceipt, setSearchReceipt] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'Tümü' | 'İade Edilenler' | 'Tamamlananlar'>('Tümü');
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
    const [selectedSaleIds, setSelectedSaleIds] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    useEffect(() => {
        loadSales();
    }, [dateStart, dateEnd]);

    const loadSales = async () => {
        const list = await dbIPC.getSalesList(dateStart, dateEnd);
        setSales(list);
    };

    const handleSelectSale = async (sale: Sale) => {
        soundFX.playClick();
        setSelectedSale(sale);
        const items = await dbIPC.getSaleItems(sale.id);
        setSaleItems(items);
    };

    const handleExecuteRefund = async () => {
        if (!selectedSale || isProcessing) return;
        soundFX.playClick();
        if (!confirm(`${selectedSale.receipt_no} numaralı satışı İADE etmek istediğinize emin misiniz?\nÜrün stokları veritabanına geri eklenecektir.`)) return;

        setIsProcessing(true);
        try {
            const ok = await dbIPC.processRefund(selectedSale.id);
            if (ok) {
                soundFX.playSuccess();
                alert('Satış başarıyla iade edildi ve stoklar güncellendi.');
                setSelectedSale(null);
                setSaleItems([]);
                loadSales();
            } else {
                alert('Bu satış zaten iade edilmiş veya geçersiz.');
            }
        } catch (err: any) {
            alert('İade işleminde hata: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteSingleSale = async (sale: Sale) => {
        soundFX.playClick();
        if (!confirm(`${sale.receipt_no} numaralı fiş/iade kaydı veritabanından TAMAMEN SİLİNECEKTİR.\n\nSilinen kayıtlar artık listede ve iade loglarında gözükmeyecektir. Emin misiniz?`)) return;

        setIsProcessing(true);
        try {
            await dbIPC.deleteSale(sale.id);
            soundFX.playSuccess();
            if (selectedSale?.id === sale.id) {
                setSelectedSale(null);
                setSaleItems([]);
            }
            setSelectedSaleIds(prev => prev.filter(id => id !== sale.id));
            loadSales();
        } catch (err: any) {
            alert('Silme işleminde hata: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteSelectedSales = async () => {
        if (selectedSaleIds.length === 0 || isProcessing) return;
        soundFX.playClick();
        if (!confirm(`Seçilen ${selectedSaleIds.length} adet fiş/iade kaydı veritabanından KALICI OLARAK SİLİNECEKTİR.\n\nSilinen kayıtlar artık listede ve iade geçmişinde gözükmeyecektir. Emin misiniz?`)) return;

        setIsProcessing(true);
        try {
            await dbIPC.deleteSales(selectedSaleIds);
            soundFX.playSuccess();
            if (selectedSale && selectedSaleIds.includes(selectedSale.id)) {
                setSelectedSale(null);
                setSaleItems([]);
            }
            setSelectedSaleIds([]);
            loadSales();
        } catch (err: any) {
            alert('Toplu silme işleminde hata: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredSales = sales.filter(s => {
        const matchesSearch = !searchReceipt || s.receipt_no.toLowerCase().includes(searchReceipt.toLowerCase());
        const isRefund = s.status === 'İade Edildi' || s.status === 'Iade Edildi';
        if (statusFilter === 'İade Edilenler') return matchesSearch && isRefund;
        if (statusFilter === 'Tamamlananlar') return matchesSearch && !isRefund;
        return matchesSearch;
    });

    const isAllSelected = filteredSales.length > 0 && filteredSales.every(s => selectedSaleIds.includes(s.id));

    const toggleSelectAll = () => {
        soundFX.playClick();
        if (isAllSelected) {
            setSelectedSaleIds([]);
        } else {
            setSelectedSaleIds(filteredSales.map(s => s.id));
        }
    };

    const toggleSelectSaleId = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        soundFX.playClick();
        setSelectedSaleIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] p-4 space-y-3 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 border rounded-xl ${
                        isCream ? 'bg-rose-100 text-rose-950 border-rose-300' : 'bg-rose-600/20 text-rose-300 border-rose-500/30'
                    }`}>
                        <Undo2 strokeWidth={2} className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className={`text-lg font-black tracking-tight ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                            İadeler & Fiş Arama
                        </h2>
                        <p className={`text-[11px] font-bold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>
                            Satış geçmişi, fiş sorgulama ve iade işlemleri yönetimi
                        </p>
                    </div>
                </div>

                {/* Bulk Delete Action Button */}
                {selectedSaleIds.length > 0 && (
                    <button
                        onClick={handleDeleteSelectedSales}
                        disabled={isProcessing}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-xs shadow-md transition active:scale-95"
                    >
                        <Trash2 strokeWidth={2} className="h-4 w-4" />
                        <span>Seçilenleri Sil ({selectedSaleIds.length})</span>
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className={`p-2.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-sm transition-colors duration-150 ${
                isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
            }`}>
                <div className="relative flex-1 min-w-[220px]">
                    <Search strokeWidth={2} className={`absolute left-3 top-2 h-4 w-4 ${isCream ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                        type="text"
                        placeholder="Fiş No ile Ara (Örn: POS-20260723-0001)..."
                        value={searchReceipt}
                        onChange={(e) => setSearchReceipt(e.target.value)}
                        className={`w-full border rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold outline-none ${
                            isCream
                                ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950 placeholder-slate-500 focus:ring-2 focus:ring-rose-500'
                                : 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-rose-500'
                        }`}
                    />
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center space-x-1">
                    {[
                        { id: 'Tümü', label: 'Tüm Satışlar' },
                        { id: 'İade Edilenler', label: 'İade Edilenler' },
                        { id: 'Tamamlananlar', label: 'Tamamlananlar' },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => { soundFX.playClick(); setStatusFilter(f.id as any); }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 ${
                                statusFilter === f.id
                                    ? isCream ? 'bg-rose-700 text-white shadow-sm' : 'bg-rose-600 text-white shadow-sm'
                                    : isCream ? 'bg-[#faf8f2] border border-[#d8d1c2] text-slate-800 hover:bg-rose-50' : 'bg-slate-800 text-slate-300'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Date Inputs */}
                <div className="flex items-center space-x-2 text-xs font-bold">
                    <span className={isCream ? 'text-slate-700' : 'text-slate-300'}>Tarih:</span>
                    <input
                        type="date"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        className={`border rounded-xl px-2.5 py-1 text-xs font-bold ${
                            isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-slate-100'
                        }`}
                    />
                    <span className="text-slate-400">-</span>
                    <input
                        type="date"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        className={`border rounded-xl px-2.5 py-1 text-xs font-bold ${
                            isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-slate-100'
                        }`}
                    />
                </div>
            </div>

            {/* Main Split: Left Sales History Table / Right Selected Sale Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
                {/* Sales History List */}
                <div className={`lg:col-span-2 border rounded-2xl p-3 flex flex-col space-y-2.5 overflow-hidden shadow-sm transition-colors duration-150 ${
                    isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
                }`}>
                    <div className="flex items-center justify-between">
                        <h3 className={`font-black text-sm ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                            Satış Fişi Geçmişi ({filteredSales.length})
                        </h3>
                    </div>

                    <div className={`flex-1 overflow-y-auto border rounded-xl shadow-sm ${
                        isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                    }`}>
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className={`font-black uppercase tracking-wider sticky top-0 border-b text-[11px] z-10 ${
                                isCream ? 'bg-[#f4f0e6] border-[#d8d1c2] text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}>
                                <tr>
                                    <th className="px-3 py-2 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={toggleSelectAll}
                                            className="rounded border-slate-400 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-3 py-2">Fiş No</th>
                                    <th className="px-3 py-2">Tarih</th>
                                    <th className="px-3 py-2">Ödeme Tipi</th>
                                    <th className="px-3 py-2 text-right">Tutar</th>
                                    <th className="px-3 py-2 text-center">Durum</th>
                                    <th className="px-3 py-2 text-center">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y text-xs ${isCream ? 'divide-[#ece6da]' : 'divide-slate-800/80'}`}>
                                {filteredSales.map(sale => {
                                    const isRefunded = sale.status === 'İade Edildi' || sale.status === 'Iade Edildi';
                                    const isSelected = selectedSale?.id === sale.id;
                                    const isChecked = selectedSaleIds.includes(sale.id);

                                    return (
                                        <tr
                                            key={sale.id}
                                            onClick={() => handleSelectSale(sale)}
                                            className={`cursor-pointer transition-colors duration-75 ${
                                                isSelected 
                                                    ? isCream
                                                        ? 'bg-[#ffeed3] border-l-4 border-l-rose-600 font-extrabold text-slate-950'
                                                        : 'bg-rose-600/30 border-l-4 border-l-rose-400 font-extrabold text-white shadow-inner'
                                                    : isCream
                                                        ? 'hover:bg-rose-500/10 text-slate-900 font-extrabold'
                                                        : 'hover:bg-slate-800/70 text-slate-100 font-extrabold'
                                            }`}
                                        >
                                            <td className="px-3 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => toggleSelectSaleId(sale.id, e as any)}
                                                    className="rounded border-slate-400 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className={`px-3 py-1.5 font-mono font-bold ${
                                                isSelected
                                                    ? isCream ? 'text-slate-950 font-black' : 'text-rose-200 font-black'
                                                    : isCream ? 'text-slate-900 font-extrabold' : 'text-slate-100 font-extrabold'
                                            }`}>{sale.receipt_no}</td>
                                            <td className="px-3 py-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{sale.created_at}</td>
                                            <td className="px-3 py-1.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                                    isCream ? 'bg-[#ede7db] text-slate-900 border-[#d0c8b6]' : 'bg-slate-800 text-slate-300 border-slate-700'
                                                }`}>
                                                    {sale.payment_method}
                                                </span>
                                            </td>
                                            <td className={`px-3 py-1.5 text-right font-black font-mono ${isCream ? 'text-emerald-800' : 'text-emerald-400'}`}>
                                                {sale.final_amount.toFixed(2)} TL
                                            </td>
                                            <td className="px-3 py-1.5 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                                    isRefunded 
                                                        ? 'bg-rose-100 text-rose-950 border-rose-300' 
                                                        : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                                }`}>
                                                    {sale.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleDeleteSingleSale(sale)}
                                                    title="Fiş / İade Kaydını Kalıcı Sil"
                                                    className={`p-1 rounded-lg transition active:scale-95 ${
                                                        isCream ? 'hover:bg-slate-200 text-rose-700' : 'hover:bg-slate-700 text-rose-400'
                                                    }`}
                                                >
                                                    <Trash2 strokeWidth={2} className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filteredSales.length === 0 && (
                            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                                <Receipt strokeWidth={1.5} className="h-10 w-10 opacity-30 text-rose-600" />
                                <p className="font-extrabold text-xs text-slate-600 dark:text-slate-400">Kayıtlı satış / iade bulunamadı.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Selected Sale Details Panel */}
                <div className={`border rounded-2xl p-3 flex flex-col space-y-3 overflow-hidden shadow-sm transition-colors duration-150 ${
                    isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
                }`}>
                    <h3 className={`font-black text-sm border-b pb-2 ${
                        isCream ? 'text-slate-950 border-[#d8d1c2]' : 'text-slate-100 border-slate-800'
                    }`}>Fiş Detayı</h3>

                    {selectedSale ? (
                        <div className="flex-1 flex flex-col justify-between space-y-3 overflow-hidden">
                            <div className="space-y-3 text-xs">
                                <div className={`p-3 rounded-xl border space-y-1.5 ${
                                    isCream ? 'bg-[#faf8f2] border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                                }`}>
                                    <div className="flex justify-between">
                                        <span className={`font-extrabold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>Fiş Numarası:</span>
                                        <span className={`font-mono font-black ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>{selectedSale.receipt_no}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={`font-extrabold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>Tarih:</span>
                                        <span className={`font-mono font-bold ${isCream ? 'text-slate-800' : 'text-slate-300'}`}>{selectedSale.created_at}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={`font-extrabold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>Ödeme Yöntemi:</span>
                                        <span className={`font-black ${isCream ? 'text-amber-800' : 'text-blue-400'}`}>{selectedSale.payment_method}</span>
                                    </div>
                                    <div className={`flex justify-between text-sm pt-1.5 border-t ${
                                        isCream ? 'border-[#d8d1c2]' : 'border-slate-800'
                                    }`}>
                                        <span className={`font-black ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>Toplam Tutar:</span>
                                        <span className={`font-black font-mono ${isCream ? 'text-emerald-800' : 'text-emerald-400'}`}>
                                            {selectedSale.final_amount.toFixed(2)} TL
                                        </span>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className={`font-black text-xs ${isCream ? 'text-slate-950' : 'text-slate-200'}`}>
                                    Fişteki Ürünler ({saleItems.length}):
                                </div>
                                <div className={`max-h-48 overflow-y-auto border rounded-xl divide-y ${
                                    isCream ? 'bg-white border-[#d8d1c2] divide-[#ece6da]' : 'bg-slate-950 border-slate-800 divide-slate-800'
                                }`}>
                                    {saleItems.map(item => (
                                        <div key={item.id} className="p-2 flex justify-between items-center text-xs">
                                            <div>
                                                <div className={`font-extrabold ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>{item.product_name}</div>
                                                <div className={`text-[11px] font-bold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>
                                                    {item.quantity} Ad. x {item.unit_price.toFixed(2)} TL
                                                </div>
                                            </div>
                                            <div className={`font-black font-mono text-xs ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                                                {item.total_price.toFixed(2)} TL
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2 pt-2">
                                {selectedSale.status !== 'İade Edildi' && selectedSale.status !== 'Iade Edildi' ? (
                                    <button
                                        onClick={handleExecuteRefund}
                                        disabled={isProcessing}
                                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition active:scale-95"
                                    >
                                        <Undo2 strokeWidth={2} className="h-4 w-4" />
                                        <span>{isProcessing ? 'İade Ediliyor...' : 'Satışı Tamamen İade Et & Stoğa Al'}</span>
                                    </button>
                                ) : (
                                    <div className="p-2 bg-rose-100 border border-rose-300 rounded-xl text-rose-950 text-xs font-black text-center">
                                        Bu fiş önceden iade edilmiştir.
                                    </div>
                                )}

                                <button
                                    onClick={() => handleDeleteSingleSale(selectedSale)}
                                    disabled={isProcessing}
                                    className="w-full bg-rose-700 hover:bg-rose-600 text-white font-black py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition active:scale-95"
                                >
                                    <Trash2 strokeWidth={2} className="h-4 w-4" />
                                    <span>Fiş / İade Kaydını Komple Sil</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-2 my-auto">
                            <Receipt strokeWidth={1.5} className="h-10 w-10 opacity-30 text-rose-600" />
                            <p className="font-extrabold text-xs text-slate-600 dark:text-slate-400">Detay, iade veya silme için soldan bir fiş seçin.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
