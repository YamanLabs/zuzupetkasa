import React, { useState } from 'react';
import { ShoppingCart, Trash as Trash2, Minus, Plus, X, Money as Banknote, CreditCard, Percent, Eye, EyeSlash } from '@phosphor-icons/react';
import { Product } from '@/lib/ipc';

interface CartItem {
    product: Product;
    quantity: number;
    unit_price: number;
}

interface SalesCartProps {
    theme: 'cream' | 'dark';
    cart: CartItem[];
    discount: number;
    discountType: 'TL' | '%';
    cashFinalTotal: number;
    cardFinalTotal: number;
    onUpdateQuantity: (productId: number, delta: number) => void;
    onSetQuantity: (productId: number, qty: number) => void;
    onRemoveFromCart: (productId: number) => void;
    onClearCart: () => void;
    onDiscountChange: (val: number) => void;
    onDiscountTypeChange: (type: 'TL' | '%') => void;
    onOpenPayment: (method: 'Nakit' | 'Kredi Kartı' | 'Çoklu') => void;
}

export default function SalesCart({
    theme,
    cart,
    discount,
    discountType,
    cashFinalTotal,
    cardFinalTotal,
    onUpdateQuantity,
    onSetQuantity,
    onRemoveFromCart,
    onClearCart,
    onDiscountChange,
    onDiscountTypeChange,
    onOpenPayment
}: SalesCartProps) {
    const isCream = theme === 'cream';
    const totalItems = cart.reduce((a, b) => a + b.quantity, 0);

    const [showProfitInfo, setShowProfitInfo] = useState<boolean>(false);

    const totalCost = cart.reduce((sum, item) => sum + (item.quantity * (item.product.cost_price || 0)), 0);
    const totalProfit = cashFinalTotal - totalCost;

    return (
        <div className={`w-96 md:w-[420px] flex flex-col border-l transition-colors duration-200 ${
            isCream 
                ? 'bg-[#f4f0e6] border-[#d8d1c2]' 
                : 'bg-black border-zinc-800'
        }`}>
            {/* Cart Header */}
            <div className={`p-3.5 border-b flex items-center justify-between ${
                isCream ? 'bg-[#e9e4d6] border-[#d8d1c2]' : 'bg-zinc-950 border-zinc-800'
            }`}>
                <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-xl ${
                        isCream ? 'bg-amber-600/15 text-amber-900' : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    }`}>
                        <ShoppingCart strokeWidth={2} className="h-4 w-4" />
                    </div>
                    <h3 className={`font-black text-sm tracking-tight ${isCream ? 'text-slate-900' : 'text-zinc-100 text-glow-sm'}`}>
                        Satış Sepeti
                    </h3>
                    <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                        isCream 
                            ? 'bg-amber-600/20 text-amber-950 border border-amber-600/30' 
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    }`}>
                        {totalItems} Kalem
                    </span>
                </div>

                {cart.length > 0 && (
                    <button
                        onClick={onClearCart}
                        className={`text-xs font-black px-2.5 py-1 rounded-xl transition active:scale-95 flex items-center space-x-1 ${
                            isCream 
                                ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300' 
                                : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border border-rose-800/60'
                        }`}
                    >
                        <Trash2 strokeWidth={2} className="h-3.5 w-3.5" />
                        <span>Sepeti Temizle</span>
                    </button>
                )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {cart.map(item => (
                    <div 
                        key={item.product.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors shadow-sm ${
                            isCream 
                                ? 'bg-white border-[#d8d1c2] hover:border-amber-500/50' 
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                        }`}
                    >
                        <div className="flex-1 min-w-0 pr-2">
                            <h4 className={`font-extrabold text-xs truncate ${isCream ? 'text-slate-900' : 'text-zinc-100'}`}>
                                {item.product.name}
                            </h4>
                            <div className="flex items-center space-x-2 mt-0.5 text-[11px] font-extrabold">
                                <span className={isCream ? 'text-amber-800' : 'text-amber-400'}>
                                    {item.product.sale_price.toFixed(2)} ₺
                                </span>
                                <span className="opacity-30">•</span>
                                <span className={isCream ? 'text-slate-600' : 'text-zinc-400'}>
                                    Toplam: {(item.quantity * item.product.sale_price).toFixed(2)} ₺
                                </span>
                            </div>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => onUpdateQuantity(item.product.id, -1)}
                                className={`p-1 rounded-lg border transition active:scale-90 ${
                                    isCream 
                                        ? 'bg-[#ede7db] border-[#d0c8b6] text-slate-800 hover:bg-amber-600 hover:text-white' 
                                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                                }`}
                            >
                                <Minus strokeWidth={2.5} className="h-3 w-3" />
                            </button>
                            <input
                                type="number"
                                min="1"
                                value={item.quantity || ''}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val > 0) {
                                        onSetQuantity(item.product.id, val);
                                    } else if (e.target.value === '') {
                                        // Allow clearing input temporarily
                                        onSetQuantity(item.product.id, 0);
                                    }
                                }}
                                onBlur={() => {
                                    if (item.quantity === 0) {
                                        onSetQuantity(item.product.id, 1);
                                    }
                                }}
                                className={`w-8 text-center font-black text-xs font-mono outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isCream ? 'text-slate-900' : 'text-white'}`}
                            />
                            <button
                                onClick={() => onUpdateQuantity(item.product.id, 1)}
                                className={`p-1 rounded-lg border transition active:scale-90 ${
                                    isCream 
                                        ? 'bg-[#ede7db] border-[#d0c8b6] text-slate-800 hover:bg-amber-600 hover:text-white' 
                                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                                }`}
                            >
                                <Plus strokeWidth={2.5} className="h-3 w-3" />
                            </button>
                            <button
                                onClick={() => onRemoveFromCart(item.product.id)}
                                className={`p-1 rounded transition-colors ${
                                    isCream ? 'text-slate-400 hover:text-rose-600' : 'text-zinc-500 hover:text-rose-400'
                                }`}
                            >
                                <X strokeWidth={2.5} className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                ))}

                {cart.length === 0 && (
                    <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                        <ShoppingCart strokeWidth={1.5} className="h-10 w-10 opacity-25 text-amber-600" />
                        <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">Sepetiniz boş.</p>
                        <p className="text-[11px] opacity-75">Barkod okutun veya listeden ürün seçin.</p>
                    </div>
                )}
            </div>

            {/* Footer Totals & Pure Monochrome Action Buttons */}
            <div className={`p-3.5 border-t space-y-3 ${
                isCream ? 'bg-[#e9e4d6] border-[#d8d1c2]' : 'bg-zinc-950 border-zinc-800'
            }`}>
                {/* Discount Bar */}
                <div className={`flex items-center justify-between gap-2 text-xs p-2 rounded-xl border shadow-sm ${
                    isCream ? 'bg-white border-[#d8d1c2]' : 'bg-zinc-900 border-zinc-800'
                }`}>
                    <span className={`font-extrabold text-[11px] ${isCream ? 'text-slate-800' : 'text-zinc-200'}`}>İndirim Uygula:</span>
                    <div className="flex items-center space-x-1.5">
                        <input
                            type="number"
                            min="0"
                            value={discount || ''}
                            onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className={`w-16 rounded-lg px-2 py-0.5 text-right text-xs font-black font-mono focus:outline-none border ${
                                isCream ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-zinc-950 border-zinc-700 text-white'
                            }`}
                        />
                        <div className={`flex items-center p-0.5 rounded-lg border ${
                            isCream ? 'bg-[#ede7db] border-[#d0c8b6]' : 'bg-zinc-950 border-zinc-800'
                        }`}>
                            <button
                                type="button"
                                onClick={() => onDiscountTypeChange('TL')}
                                className={`px-2 py-0.5 rounded text-[11px] font-black transition-all ${
                                    discountType === 'TL'
                                        ? isCream ? 'bg-amber-600 text-white shadow-sm' : 'bg-zinc-700 text-white border border-zinc-600 shadow-sm'
                                        : isCream ? 'text-slate-700 hover:text-slate-900' : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                TL
                            </button>
                            <button
                                type="button"
                                onClick={() => onDiscountTypeChange('%')}
                                className={`px-2 py-0.5 rounded text-[11px] font-black transition-all ${
                                    discountType === '%'
                                        ? isCream ? 'bg-amber-600 text-white shadow-sm' : 'bg-zinc-700 text-white border border-zinc-600 shadow-sm'
                                        : isCream ? 'text-slate-700 hover:text-slate-900' : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                %
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dual / Triple Totals Breakdown (Nakit, Kart & Opsiyonel Maliyet/Kâr) */}
                <div className={`grid transition-all duration-300 border rounded-xl shadow-sm overflow-hidden ${
                    showProfitInfo ? 'grid-cols-3 divide-x' : 'grid-cols-2 divide-x'
                } ${
                    isCream 
                        ? 'bg-white border-[#d8d1c2] divide-[#e2dcd0]' 
                        : 'bg-zinc-900 border-zinc-800 divide-zinc-800'
                }`}>
                    {/* NAKİT TUTAR */}
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                            isCream ? 'text-slate-600' : 'text-zinc-400'
                        }`}>
                            Nakit Tutar
                        </span>
                        <span className={`text-base md:text-lg font-black mt-0.5 font-mono tracking-tight ${
                            isCream ? 'text-slate-950' : 'text-white text-glow-sm'
                        }`}>
                            {cashFinalTotal.toFixed(2)} TL
                        </span>
                    </div>

                    {/* KART TUTAR */}
                    <div className="relative group flex flex-col items-center justify-center p-2 text-center">
                        {!showProfitInfo && (
                            <button
                                type="button"
                                onClick={() => setShowProfitInfo(true)}
                                title="Maliyet & Kâr Bilgisini Göster"
                                className="absolute top-1 right-1 p-1 rounded-lg opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200"
                            >
                                <EyeSlash className="h-3.5 w-3.5" weight="bold" />
                            </button>
                        )}

                        <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                            isCream ? 'text-slate-600' : 'text-zinc-400'
                        }`}>
                            Kart Tutar
                        </span>
                        <span className={`text-base md:text-lg font-black mt-0.5 font-mono tracking-tight ${
                            isCream ? 'text-slate-950' : 'text-white text-glow-sm'
                        }`}>
                            {cardFinalTotal.toFixed(2)} TL
                        </span>
                    </div>

                    {/* 3. KATEGORİ: MALİYET & KÂR (Rightmost Column when opened) */}
                    {showProfitInfo && (
                        <div className={`relative group flex flex-col items-center justify-center p-1.5 text-center ${
                            isCream ? 'bg-purple-50/60' : 'bg-purple-950/30'
                        }`}>
                            <button
                                type="button"
                                onClick={() => setShowProfitInfo(false)}
                                title="Maliyet & Kâr Bilgisini Gizle"
                                className="absolute top-1 right-1 p-1 rounded-lg opacity-80 hover:opacity-100 bg-purple-500/20 text-purple-700 dark:text-purple-300 transition-all duration-200"
                            >
                                <Eye className="h-3.5 w-3.5" weight="bold" />
                            </button>

                            <span className={`text-[9px] font-black uppercase tracking-wider ${
                                isCream ? 'text-purple-900' : 'text-purple-300'
                            }`}>
                                Maliyet & Kâr
                            </span>
                            <div className="flex flex-col items-center mt-0.5 space-y-0.2 text-[11px] font-mono font-black">
                                <span className={isCream ? 'text-slate-700' : 'text-slate-300'} title="Sepet Toplam Maliyeti">
                                    <span className="opacity-60 text-[9px]">M:</span> {totalCost.toFixed(2)} TL
                                </span>
                                <span 
                                    className={totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                                    title="Sepet Toplam Kârı"
                                >
                                    <span className="opacity-60 text-[9px]">K:</span> {totalProfit >= 0 ? `+${totalProfit.toFixed(2)}` : totalProfit.toFixed(2)} TL
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Pure Monochrome Action Buttons (F1, F2, F3) */}
                <div className="grid grid-cols-3 gap-2 pt-0.5">
                    {/* F1 NAKİT */}
                    <button
                        onClick={() => onOpenPayment('Nakit')}
                        disabled={cart.length === 0}
                        className="group relative overflow-hidden bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 disabled:opacity-40 text-white font-black py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_16px_-4px_rgba(0,0,0,0.6)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]"
                    >
                        <div className="flex items-center space-x-1">
                            <Banknote strokeWidth={2} className="h-4 w-4 drop-shadow" />
                            <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-100 px-1.5 py-0.2 rounded-md border border-emerald-400/30">F1</span>
                        </div>
                        <span className="text-xs font-black tracking-tight drop-shadow">Nakit</span>
                    </button>
                    
                    {/* F2 KREDİ KARTI */}
                    <button
                        onClick={() => onOpenPayment('Kredi Kartı')}
                        disabled={cart.length === 0}
                        className={`group relative overflow-hidden disabled:opacity-40 text-white font-black py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.96] ${
                            isCream 
                                ? 'bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_16px_-4px_rgba(217,119,6,0.4)]' 
                                : 'bg-gradient-to-b from-zinc-700 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800 border border-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_16px_-4px_rgba(0,0,0,0.8)]'
                        }`}
                    >
                        <div className="flex items-center space-x-1">
                            <CreditCard strokeWidth={2} className="h-4 w-4 drop-shadow" />
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md border ${
                                isCream ? 'bg-amber-950/50 text-amber-100 border-amber-400/30' : 'bg-zinc-950 text-zinc-200 border-zinc-700'
                            }`}>F2</span>
                        </div>
                        <span className="text-xs font-black tracking-tight drop-shadow">Kredi Kartı</span>
                    </button>
                    
                    {/* F3 ÇOKLU / PARÇALI */}
                    <button
                        onClick={() => onOpenPayment('Çoklu')}
                        disabled={cart.length === 0}
                        className="group relative overflow-hidden bg-gradient-to-b from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 disabled:opacity-40 text-white font-black py-3 px-2 rounded-xl flex flex-col items-center justify-center space-y-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_16px_-4px_rgba(0,0,0,0.6)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.96]"
                    >
                        <div className="flex items-center space-x-1">
                            <Percent strokeWidth={2} className="h-4 w-4 drop-shadow" />
                            <span className="text-[10px] font-mono bg-purple-950/60 text-purple-100 px-1.5 py-0.2 rounded-md border border-purple-400/30">F3</span>
                        </div>
                        <span className="text-xs font-black tracking-tight drop-shadow">Çoklu</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
