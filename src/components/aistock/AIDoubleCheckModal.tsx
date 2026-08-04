import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, X, Cpu, Save, RefreshCw, Search, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AIDoubleCheckModalProps {
    theme: 'cream' | 'dark';
    show: boolean;
    onClose: () => void;
    geminiModelName: string;
    isCheckingDoubleCheck: boolean;
    doubleCheckItems: any[];
    doubleCheckSearch: string;
    doubleCheckFilter: 'ALL' | 'PRICE_CHANGE' | 'MATCHED' | 'NEW';
    onGeminiModelNameChange: (val: string) => void;
    onSaveModelName: () => void;
    onRunDoubleCheck: () => void;
    onSearchChange: (val: string) => void;
    onFilterChange: (filter: 'ALL' | 'PRICE_CHANGE' | 'MATCHED' | 'NEW') => void;
}

export default function AIDoubleCheckModal({
    theme, show, onClose, geminiModelName, isCheckingDoubleCheck, doubleCheckItems, doubleCheckSearch, doubleCheckFilter,
    onGeminiModelNameChange, onSaveModelName, onRunDoubleCheck, onSearchChange, onFilterChange
}: AIDoubleCheckModalProps) {
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
                className={`w-full max-w-6xl rounded-2xl border shadow-2xl p-4 overflow-hidden flex flex-col space-y-3 max-h-[88vh] ${
                    isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5">
                    <div className="flex items-center space-x-2.5">
                        <div className={`p-1.5 rounded-xl border ${
                            isCream ? 'bg-purple-100 text-purple-950 border-purple-300' : 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                        }`}>
                            <ShieldCheck strokeWidth={2} className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black tracking-tight">AI Double-Check & Çapraz Stok Doğrulama</h3>
                            <p className={`text-[11px] font-bold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>
                                Faturadaki ürünler ile veritabanındaki stok kayıtlarının otomatik eşleştirilmesi ve fiyat değişimi analizi
                            </p>
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

                {/* Model Settings & Control Strip */}
                <div className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 shadow-sm ${
                    isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                }`}>
                    <div className="flex items-center space-x-2">
                        <Cpu strokeWidth={2} className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span className="text-xs font-black whitespace-nowrap">Gemini Model:</span>
                        <input
                            type="text"
                            placeholder="Örn: gemini-2.0-flash"
                            value={geminiModelName}
                            onChange={(e) => onGeminiModelNameChange(e.target.value)}
                            className={`px-3 py-1 rounded-lg border text-xs font-mono font-bold outline-none w-52 ${
                                isCream
                                    ? 'bg-slate-50 border-[#d8d1c2] text-slate-950 focus:border-purple-600'
                                    : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-purple-500'
                            }`}
                        />
                        <button
                            onClick={onSaveModelName}
                            className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-black flex items-center space-x-1 shadow-sm transition active:scale-95 shrink-0"
                        >
                            <Save strokeWidth={2} className="h-3.5 w-3.5" />
                            <span>Kaydet</span>
                        </button>
                    </div>

                    <button
                        onClick={onRunDoubleCheck}
                        disabled={isCheckingDoubleCheck}
                        className="flex items-center space-x-2 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition active:scale-95 shrink-0"
                    >
                        <RefreshCw strokeWidth={2} className={`h-4 w-4 ${isCheckingDoubleCheck ? 'animate-spin' : ''}`} />
                        <span>{isCheckingDoubleCheck ? 'Çapraz Kontrol Ediliyor...' : 'Faturayı Çapraz Kontrol Et (Double-Check)'}</span>
                    </button>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search strokeWidth={2} className={`absolute left-3 top-2 h-3.5 w-3.5 ${isCream ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            placeholder="Ürün adı veya veritabanı ismiyle süzün..."
                            value={doubleCheckSearch}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className={`w-full pl-8 pr-3 py-1 rounded-xl border text-xs font-bold outline-none ${
                                isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-800 text-slate-100'
                            }`}
                        />
                    </div>

                    <div className="flex items-center space-x-1.5">
                        {[
                            { id: 'ALL', label: 'Tümü' },
                            { id: 'PRICE_CHANGE', label: 'Fiyat Değişenler' },
                            { id: 'MATCHED', label: 'Eşleşenler' },
                            { id: 'NEW', label: 'Yeni Ürünler' },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => onFilterChange(f.id as any)}
                                className={`px-3 py-1 rounded-lg text-xs font-black transition active:scale-95 ${
                                    doubleCheckFilter === f.id
                                        ? isCream ? 'bg-purple-700 text-white shadow-sm' : 'bg-purple-600 text-white shadow-sm'
                                        : isCream ? 'bg-white border border-[#d8d1c2] text-slate-800 hover:bg-purple-50' : 'bg-slate-800 text-slate-300'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Detailed Side-by-Side Comparison Grid */}
                <div className={`flex-1 overflow-auto border rounded-xl shadow-sm transition-colors duration-150 ${
                    isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                }`}>
                    {doubleCheckItems.length > 0 ? (
                        <table className="w-full text-left border-collapse min-w-[850px]">
                            <thead className={`sticky top-0 border-b text-[11px] font-black uppercase tracking-wider z-10 ${
                                isCream 
                                    ? 'bg-[#f4f0e6] border-[#d8d1c2] text-slate-700' 
                                    : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}>
                                <tr>
                                    <th className="py-2 px-3">Fatura Ürün Adı</th>
                                    <th className="py-2 px-3">Veritabanı Eşleşen Ürün</th>
                                    <th className="py-2 px-3 text-right">Eski Alış</th>
                                    <th className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400">Yeni Alış</th>
                                    <th className="py-2 px-3 text-right">Fiyat Değişimi</th>
                                    <th className="py-2 px-3 text-center">Eşleşme Oranı</th>
                                    <th className="py-2 px-3 text-center">Durum</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y text-xs ${isCream ? 'divide-[#ece6da]' : 'divide-slate-800/80'}`}>
                                {doubleCheckItems.map((item, idx) => {
                                    const diff = (item.newPrice || 0) - (item.oldPrice || 0);
                                    const hasPriceChange = item.oldPrice && Math.abs(diff) > 0.01;

                                    return (
                                        <tr 
                                            key={idx} 
                                            className={`transition-colors duration-75 ${
                                                isCream 
                                                    ? 'hover:bg-purple-50 text-slate-950 font-extrabold' 
                                                    : 'hover:bg-slate-800/70 text-slate-100 font-extrabold'
                                            }`}
                                        >
                                            <td className="py-2 px-3 font-extrabold">{item.invoiceName}</td>
                                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-bold">
                                                {item.dbName ? (
                                                    <span className="flex items-center space-x-1 text-slate-900 dark:text-slate-200">
                                                        <span>{item.dbName}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Eşleşen stok bulunamadı</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono text-slate-500 font-bold">
                                                {item.oldPrice ? `${item.oldPrice.toFixed(2)} TL` : '-'}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-black text-emerald-800 dark:text-emerald-400">
                                                {item.newPrice ? `${item.newPrice.toFixed(2)} TL` : '-'}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-black">
                                                {hasPriceChange ? (
                                                    <span className={diff > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}>
                                                        {diff > 0 ? `+${diff.toFixed(2)} TL` : `${diff.toFixed(2)} TL`}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-center font-bold">
                                                {item.confidence ? (
                                                    <span className="bg-purple-100 text-purple-950 border border-purple-300 px-2 py-0.5 rounded-md text-[11px] font-black">
                                                        %{Math.round(item.confidence * 100)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                                    item.dbName
                                                        ? 'bg-blue-100 text-blue-950 border-blue-300'
                                                        : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                                }`}>
                                                    {item.dbName ? 'Stok Güncelleme' : 'Yeni Ürün'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                            <ShieldCheck strokeWidth={1.5} className="h-10 w-10 opacity-30 text-purple-600" />
                            <p className="font-extrabold text-xs text-slate-600 dark:text-slate-400">Henüz çift kontrol çalıştırılmadı.</p>
                            <p className="text-[11px] opacity-75">Fatura dosyası seçip yukarıdaki "Faturayı Çapraz Kontrol Et" butonuna tıklayın.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
