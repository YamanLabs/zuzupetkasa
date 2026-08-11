import React from 'react';
import { Money as Banknote, CreditCard, Percent, X, Check } from '@phosphor-icons/react';

interface SalesPaymentModalProps {
    theme: 'cream' | 'dark';
    show?: boolean;
    paymentMethod: 'Nakit' | 'Kredi Kartı' | 'Çoklu';
    targetTotal: number;
    cashPaidAmount: string;
    changeAmount: number;
    splitCashAmount: string;
    splitCardAmount: string;
    posStatusMessage: string;
    isProcessing: boolean;
    onClose: () => void;
    onCashPaidChange: (val: string) => void;
    onSplitCashChange: (val: string) => void;
    onSplitCardChange: (val: string) => void;
    onFinalizeSale: (bypassPOS?: boolean) => void;
}

export default function SalesPaymentModal({
    theme,
    show = true,
    paymentMethod,
    targetTotal,
    cashPaidAmount,
    changeAmount,
    splitCashAmount,
    splitCardAmount,
    posStatusMessage,
    isProcessing,
    onClose,
    onCashPaidChange,
    onSplitCashChange,
    onSplitCardChange,
    onFinalizeSale
}: SalesPaymentModalProps) {
    if (!show) return null;
    const isCream = theme === 'cream';

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onFinalizeSale(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
            <form
                onSubmit={handleFormSubmit}
                className={`rounded-2xl w-full max-w-sm p-4 shadow-2xl space-y-3.5 border transition-all ${
                    isCream 
                        ? 'bg-[#faf8f2] border border-[#d8d1c2] text-slate-900' 
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-100'
                }`}
            >
                {/* Compact Modal Header */}
                <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center space-x-2">
                        {paymentMethod === 'Nakit' && <Banknote strokeWidth={2} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                        {paymentMethod === 'Kredi Kartı' && <CreditCard strokeWidth={2} className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                        {paymentMethod === 'Çoklu' && <Percent strokeWidth={2} className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                        <h3 className="text-sm font-black tracking-tight">
                            {paymentMethod} Ödeme
                        </h3>
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-md border ${
                            isCream 
                                ? 'bg-emerald-100/80 text-emerald-950 border-emerald-300' 
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                        }`}>
                            {targetTotal.toFixed(2)} TL
                        </span>
                        <button 
                            type="button"
                            onClick={onClose} 
                            className={`p-1 rounded-lg transition active:scale-95 ${
                                isCream ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        >
                            <X strokeWidth={2} className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* POS Status Banner (Theme-Matching Glass Style) */}
                {posStatusMessage && (
                    <div className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 animate-pulse border ${
                        isCream 
                            ? 'bg-[#faf8f2] border-amber-300 text-amber-950 font-bold shadow-sm' 
                            : 'bg-zinc-900 border-zinc-700 text-zinc-100 font-bold'
                    }`}>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span>{posStatusMessage}</span>
                    </div>
                )}

                {/* 1. NAKİT MODE */}
                {paymentMethod === 'Nakit' && (
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-black whitespace-nowrap">Alınan:</span>
                            <input
                                type="number"
                                step="0.01"
                                autoFocus
                                value={cashPaidAmount}
                                onChange={(e) => onCashPaidChange(e.target.value)}
                                placeholder="0.00"
                                className={`flex-1 border rounded-xl px-3 py-1.5 text-lg font-black text-right font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                                    isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-black border-zinc-700 text-white'
                                }`}
                            />
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5">
                            {[20, 50, 100, 200].map(val => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => onCashPaidChange(val.toString())}
                                    className={`flex-1 font-extrabold py-1 rounded-lg border text-[11px] transition active:scale-95 ${
                                        isCream
                                            ? 'bg-white hover:bg-amber-100/60 text-slate-950 border-[#d8d1c2]'
                                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                                    }`}
                                >
                                    {val}₺
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => onCashPaidChange(targetTotal.toFixed(2))}
                                className="flex-1 font-extrabold py-1 rounded-lg border text-[11px] bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-600 transition active:scale-95"
                            >
                                Tam
                            </button>
                        </div>

                        {/* Para Üstü Bar */}
                        <div className={`p-2.5 rounded-xl flex items-center justify-between border ${
                            isCream
                                ? 'bg-emerald-100/80 border-emerald-300 text-emerald-950'
                                : 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                        }`}>
                            <span className="text-xs font-bold">Para Üstü:</span>
                            <span className="text-lg font-black font-mono">{changeAmount.toFixed(2)} TL</span>
                        </div>
                    </div>
                )}

                {/* 2. KREDİ KARTI MODE */}
                {paymentMethod === 'Kredi Kartı' && !posStatusMessage && (
                    <div className={`p-3 rounded-xl text-center space-y-1 border ${
                        isCream ? 'bg-amber-50/80 border-[#d8d1c2] text-slate-900' : 'bg-black border-zinc-800 text-zinc-200'
                    }`}>
                        <div className="text-xs font-black">POS Terminaline {targetTotal.toFixed(2)} TL Sinyali Gönderilecek</div>
                        <div className={`text-[11px] ${isCream ? 'text-slate-600' : 'text-zinc-400'}`}>Fiş otomatik yazdırılır ve ödeme tamamlanır.</div>
                    </div>
                )}

                {/* 3. PARÇALI MODE */}
                {paymentMethod === 'Çoklu' && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between space-x-2">
                            <span className="text-xs font-black whitespace-nowrap">Nakit:</span>
                            <input
                                type="number"
                                step="0.01"
                                value={splitCashAmount}
                                onChange={(e) => onSplitCashChange(e.target.value)}
                                className={`w-32 border rounded-lg px-2 py-1 text-sm font-black font-mono text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                    isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-black border-zinc-700 text-white'
                                }`}
                            />
                        </div>

                        <div className="flex items-center justify-between space-x-2">
                            <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-black whitespace-nowrap">Kart:</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const cVal = parseFloat(splitCashAmount) || 0;
                                        const rem = Math.max(0, targetTotal - cVal);
                                        onSplitCardChange(rem.toFixed(2));
                                    }}
                                    className="text-[10px] font-bold text-zinc-400 hover:underline hover:text-white"
                                >
                                    (Kalanı Al)
                                </button>
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                value={splitCardAmount}
                                onChange={(e) => onSplitCardChange(e.target.value)}
                                className={`w-32 border rounded-lg px-2 py-1 text-sm font-black font-mono text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                    isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-black border-zinc-700 text-white'
                                }`}
                            />
                        </div>
                    </div>
                )}

                {/* Compact Footer Actions */}
                <div className="flex items-center space-x-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                            isCream ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                        }`}
                    >
                        İptal
                    </button>

                    {(paymentMethod === 'Kredi Kartı' || paymentMethod === 'Çoklu') && (
                        <button
                            type="button"
                            onClick={() => onFinalizeSale(true)}
                            disabled={isProcessing}
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-extrabold py-2 px-2.5 rounded-xl text-xs flex items-center justify-center space-x-1 border border-zinc-700 shadow transition active:scale-95"
                            title="POS cihazına sinyal göndermeden kaydeder"
                        >
                            <Check strokeWidth={2} className="h-3.5 w-3.5" />
                            <span>POS'suz Kaydet</span>
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={isProcessing}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold py-2 px-2.5 rounded-xl text-xs flex items-center justify-center space-x-1 shadow transition active:scale-95"
                    >
                        <Check strokeWidth={2} className="h-3.5 w-3.5" />
                        <span>{isProcessing ? 'İşleniyor...' : 'Tamamla'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
