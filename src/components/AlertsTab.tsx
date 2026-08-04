"use client";

import React, { useState, useEffect } from 'react';
import { dbIPC, Product, StockLog } from '@/lib/ipc';
import { AlertOctagon, PlusCircle, History, PackageCheck, RefreshCw, X, TrendingDown, Minus, TrendingUp } from 'lucide-react';

interface AlertsTabProps {
    theme?: 'cream' | 'dark';
}

type LogFilterType = 'ALL' | 'DECREASING' | 'NEUTRAL' | 'INCREASING_DESC';

export default function AlertsTab({ theme = 'cream' }: AlertsTabProps) {
    const isCream = theme === 'cream';
    const [criticalProducts, setCriticalProducts] = useState<Product[]>([]);
    const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [addQuantity, setAddQuantity] = useState<number>(10);
    const [showReplenishModal, setShowReplenishModal] = useState<boolean>(false);
    const [logFilter, setLogFilter] = useState<LogFilterType>('ALL');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [crits, logs] = await Promise.all([
            dbIPC.getCriticalStockProducts(),
            dbIPC.getStockLogs(100)
        ]);
        setCriticalProducts(crits);
        setStockLogs(logs);
    };

    const handleReplenishStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || addQuantity <= 0) return;

        await dbIPC.updateProduct(selectedProduct.id, {
            ...selectedProduct,
            stock_quantity: selectedProduct.stock_quantity + addQuantity
        });

        setShowReplenishModal(false);
        loadData();
    };

    // Filter and Sort Stock Logs
    const getFilteredLogs = () => {
        if (logFilter === 'DECREASING') {
            // En Çok Eksilenler (Most negative first)
            return [...stockLogs]
                .filter(l => l.change_quantity < 0)
                .sort((a, b) => a.change_quantity - b.change_quantity);
        }
        if (logFilter === 'NEUTRAL') {
            // Nötr Olanlar (Zero change)
            return stockLogs.filter(l => l.change_quantity === 0);
        }
        if (logFilter === 'INCREASING_DESC') {
            // Çoktan Aza Artanlar (Highest positive increase first: +100, +50, +5...)
            return [...stockLogs]
                .filter(l => l.change_quantity > 0)
                .sort((a, b) => b.change_quantity - a.change_quantity);
        }
        return stockLogs;
    };

    const filteredLogs = getFilteredLogs();

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] p-4 space-y-3 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 border rounded-xl ${
                        isCream ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                        <AlertOctagon strokeWidth={2} className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className={`text-lg font-black tracking-tight ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                            Kritik Stok Uyarısı ve Hareketler
                        </h2>
                        <p className={`text-[11px] font-bold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>
                            Stok tükenme uyarıları ve detaylı filtrelemeli stok hareket logları
                        </p>
                    </div>
                </div>

                <button
                    onClick={loadData}
                    className={`text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 border shadow-sm transition active:scale-95 ${
                        isCream
                            ? 'bg-white border-[#d8d1c2] text-slate-900 hover:bg-amber-50'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                >
                    <RefreshCw strokeWidth={2} className="h-3.5 w-3.5" />
                    <span>Yenile</span>
                </button>
            </div>

            {/* Split Content: Left Critical Stock / Right Stock Audit Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
                {/* Critical Stock List */}
                <div className={`border rounded-2xl p-3 flex flex-col space-y-2.5 overflow-hidden shadow-sm transition-colors duration-150 ${
                    isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
                }`}>
                    <div className="flex items-center justify-between">
                        <h3 className={`font-black text-sm flex items-center space-x-2 ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                            <span>Kritik Seviyedeki Ürünler</span>
                        </h3>
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                            isCream ? 'bg-rose-100 text-rose-950 border-rose-300' : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                        }`}>
                            {criticalProducts.length} Ürün Uyarı Veriyor
                        </span>
                    </div>

                    <div className={`flex-1 overflow-y-auto border rounded-xl shadow-sm ${
                        isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                    }`}>
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className={`font-black uppercase tracking-wider sticky top-0 border-b text-[11px] z-10 ${
                                isCream ? 'bg-[#f4f0e6] border-[#d8d1c2] text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}>
                                <tr>
                                    <th className="px-3 py-2">Barkod</th>
                                    <th className="px-3 py-2">Ürün Adı</th>
                                    <th className="px-3 py-2 text-center">Kalan Stok</th>
                                    <th className="px-3 py-2 text-center">Eşik</th>
                                    <th className="px-3 py-2 text-right">Eylem</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y text-xs ${isCream ? 'divide-[#ece6da]' : 'divide-slate-800/80'}`}>
                                {criticalProducts.map(prod => (
                                    <tr key={prod.id} className={`transition-colors duration-75 ${
                                        isCream ? 'hover:bg-amber-500/10 text-slate-900 font-extrabold' : 'hover:bg-slate-800/70 text-slate-100 font-extrabold'
                                    }`}>
                                        <td className="px-3 py-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 font-bold">{prod.barcode || '—'}</td>
                                        <td className={`px-3 py-1.5 font-extrabold ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>{prod.name}</td>
                                        <td className="px-3 py-1.5 text-center font-black text-rose-600 dark:text-rose-400">
                                            {prod.stock_quantity} {prod.unit}
                                        </td>
                                        <td className="px-3 py-1.5 text-center font-bold text-slate-500">{prod.min_stock_alert}</td>
                                        <td className="px-3 py-1.5 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedProduct(prod);
                                                    setAddQuantity(10);
                                                    setShowReplenishModal(true);
                                                }}
                                                className="bg-amber-600 hover:bg-amber-500 text-white font-black px-2.5 py-1 rounded-xl text-[11px] flex items-center space-x-1 ml-auto shadow transition active:scale-95"
                                            >
                                                <PlusCircle strokeWidth={2} className="h-3.5 w-3.5" />
                                                <span>Stok Ekle</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {criticalProducts.length === 0 && (
                            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                                <PackageCheck strokeWidth={1.5} className="h-10 w-10 text-emerald-500 opacity-80" />
                                <p className="font-extrabold text-xs text-slate-600 dark:text-slate-400">Tüm ürün stok seviyeleri emniyetli eşiğin üzerinde.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stock Audit Logs with Categorized Filter Pills */}
                <div className={`border rounded-2xl p-3 flex flex-col space-y-2.5 overflow-hidden shadow-sm transition-colors duration-150 ${
                    isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
                }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className={`font-black text-sm flex items-center space-x-2 ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                            <History strokeWidth={2} className={`h-4 w-4 ${isCream ? 'text-amber-700' : 'text-blue-400'}`} />
                            <span>Stok Hareket Logları</span>
                        </h3>

                        {/* Categorized Filter Pills */}
                        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setLogFilter('ALL')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition active:scale-95 ${
                                    logFilter === 'ALL'
                                        ? isCream ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-900 shadow-sm'
                                        : isCream ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                Tümü ({stockLogs.length})
                            </button>

                            <button
                                onClick={() => setLogFilter('DECREASING')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center space-x-1 transition active:scale-95 ${
                                    logFilter === 'DECREASING'
                                        ? 'bg-rose-600 text-white shadow-sm'
                                        : isCream ? 'bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100' : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
                                }`}
                            >
                                <TrendingDown strokeWidth={2} className="h-3 w-3" />
                                <span>En Çok Eksilenler</span>
                            </button>

                            <button
                                onClick={() => setLogFilter('NEUTRAL')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center space-x-1 transition active:scale-95 ${
                                    logFilter === 'NEUTRAL'
                                        ? 'bg-slate-700 text-white shadow-sm'
                                        : isCream ? 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                <Minus strokeWidth={2} className="h-3 w-3" />
                                <span>Nötr</span>
                            </button>

                            <button
                                onClick={() => setLogFilter('INCREASING_DESC')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center space-x-1 transition active:scale-95 ${
                                    logFilter === 'INCREASING_DESC'
                                        ? 'bg-emerald-700 text-white shadow-sm'
                                        : isCream ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100' : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                                }`}
                            >
                                <TrendingUp strokeWidth={2} className="h-3 w-3" />
                                <span>En Çok Artanlar</span>
                            </button>
                        </div>
                    </div>

                    <div className={`flex-1 overflow-y-auto border rounded-xl shadow-sm ${
                        isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                    }`}>
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className={`font-black uppercase tracking-wider sticky top-0 border-b text-[11px] z-10 ${
                                isCream ? 'bg-[#f4f0e6] border-[#d8d1c2] text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}>
                                <tr>
                                    <th className="px-3 py-2">Tarih</th>
                                    <th className="px-3 py-2">Ürün</th>
                                    <th className="px-3 py-2 text-center">Değişim</th>
                                    <th className="px-3 py-2 text-center">Son Stok</th>
                                    <th className="px-3 py-2">Neden</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y text-xs ${isCream ? 'divide-[#ece6da]' : 'divide-slate-800/80'}`}>
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className={`transition-colors duration-75 ${
                                        isCream ? 'hover:bg-amber-500/10 text-slate-900 font-extrabold' : 'hover:bg-slate-800/70 text-slate-100 font-extrabold'
                                    }`}>
                                        <td className="px-3 py-1.5 text-[11px] font-mono text-slate-500 whitespace-nowrap">{log.created_at}</td>
                                        <td className={`px-3 py-1.5 font-extrabold ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>{log.product_name}</td>
                                        <td className="px-3 py-1.5 text-center font-black">
                                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-black ${
                                                log.change_quantity > 0
                                                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                                    : log.change_quantity < 0
                                                        ? 'bg-rose-100 text-rose-950 border border-rose-300'
                                                        : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {log.change_quantity > 0 ? `+${log.change_quantity}` : log.change_quantity}
                                            </span>
                                        </td>
                                        <td className={`px-3 py-1.5 text-center font-black ${isCream ? 'text-slate-950' : 'text-slate-200'}`}>{log.new_stock}</td>
                                        <td className="px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-bold">{log.reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredLogs.length === 0 && (
                            <div className="py-16 text-center text-slate-400 font-bold text-xs">
                                Seçilen filtre grubuna uygun stok hareketi bulunamadı.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Replenish Stock Modal */}
            {showReplenishModal && selectedProduct && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3">
                    <form onSubmit={handleReplenishStock} className={`rounded-2xl w-full max-w-xs p-4 shadow-2xl space-y-3 border transition-all ${
                        isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}>
                        <div className="flex items-center justify-between pb-2">
                            <h3 className="text-sm font-black tracking-tight">Hızlı Stok Ekle</h3>
                            <button type="button" onClick={() => setShowReplenishModal(false)} className={`p-1 rounded-lg transition active:scale-95 ${
                                isCream ? 'text-slate-400 hover:text-slate-950 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}>
                                <X strokeWidth={2} className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="text-xs space-y-2">
                            <div>
                                <span className={`text-[11px] font-extrabold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>Ürün:</span>
                                <div className={`font-black text-sm mt-0.5 ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>{selectedProduct.name}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-extrabold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>Mevcut Stok:</span>
                                <span className="font-black text-amber-700 dark:text-amber-400">{selectedProduct.stock_quantity} {selectedProduct.unit}</span>
                            </div>

                            <div className="pt-1">
                                <label className={`block text-xs font-black mb-1 ${isCream ? 'text-slate-900' : 'text-slate-200'}`}>Eklenecek Miktar:</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={addQuantity}
                                    onChange={(e) => setAddQuantity(parseInt(e.target.value) || 0)}
                                    className={`w-full border rounded-xl px-3 py-2 text-base font-black text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                        isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-white'
                                    } focus:ring-2 focus:ring-amber-500 focus:outline-none`}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowReplenishModal(false)}
                                className={`font-bold px-3 py-1.5 rounded-xl text-xs transition active:scale-95 ${
                                    isCream ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                className="font-black px-4 py-1.5 rounded-xl text-xs text-white bg-amber-600 hover:bg-amber-500 shadow transition active:scale-95"
                            >
                                Stok Güncelle
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
