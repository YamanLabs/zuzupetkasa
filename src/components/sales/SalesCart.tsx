import React from 'react';
import { ShoppingCart, Trash2, Minus, Plus, X, Banknote, CreditCard, Percent } from 'lucide-react';
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
    onRemoveFromCart,
    onClearCart,
    onDiscountChange,
    onDiscountTypeChange,
    onOpenPayment
}: SalesCartProps) {
    const isCream = theme === 'cream';
    const totalItems = cart.reduce((a, b) => a + b.quantity, 0);

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
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-rose-500/10 transition active:scale-95"
                    >
                        <Trash2 strokeWidth={2} className="h-3.5 w-3.5" />
                        <span>Temizle</span>
                    </button>
                )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {cart.map(item => (
                    <div 
                        key={item.product.id} 
                        className={`rounded-xl p-3 flex items-center justify-between border shadow-sm transition-all duration-150 ${
                            isCream 
                                ? 'bg-white border-[#d8d1c2]' 
                                : 'bg-zinc-900/90 border-zinc-800'
                        }`}
                    >
                        <div className="flex-1 pr-2 min-w-0">
                            <h5 className={`text-xs font-extrabold truncate tracking-tight ${
                                isCream ? 'text-slate-900' : 'text-zinc-100'
                            }`}>
                                {item.product.name}
                            </h5>
                            <div className={`text-[11px] font-semibold mt-0.5 ${
                                isCream ? 'text-slate-600' : 'text-zinc-400'
                            }`}>
                                {item.unit_price.toFixed(2)} TL / {item.product.unit}
                            </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                            <button
                                onClick={() => onUpdateQuantity(item.product.id, -1)}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold transition-transform active:scale-90 ${
                                    isCream ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                                }`}
                            >
                                <Minus strokeWidth={2.5} className="h-3 w-3" />
                            </button>
                            
                            <span className={`text-xs font-black w-6 text-center ${
                                isCream ? 'text-slate-950' : 'text-white'
                            }`}>
                                {item.quantity}
                            </span>
                            
                            <button
                                onClick={() => onUpdateQuantity(item.product.id, 1)}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold transition-transform active:scale-90 ${
                                    isCream ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                                }`}
                            >
                                <Plus strokeWidth={2.5} className="h-3 w-3" />
                            </button>
                            
                            <div className={`w-16 text-right font-black text-xs font-mono ${
                                isCream ? 'text-emerald-800' : 'text-emerald-400'
                            }`}>
                                {(item.quantity * item.unit_price).toFixed(2)}
                            </div>
                            
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
                                isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-900' : 'bg-zinc-950 border-zinc-700 text-white'
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

                {/* Dual Totals Breakdown (Nakit & Kart) */}
                <div className={`grid grid-cols-2 divide-x border rounded-xl shadow-sm ${
                    isCream 
                        ? 'bg-white border-[#d8d1c2] divide-[#e2dcd0]' 
                        : 'bg-zinc-900 border-zinc-800 divide-zinc-800'
                }`}>
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                            isCream ? 'text-slate-600' : 'text-zinc-400'
                        }`}>
                            Nakit Tutar
                        </span>
                        <span className={`text-lg font-black mt-0.5 font-mono tracking-tight ${
                            isCream ? 'text-slate-950' : 'text-white text-glow-sm'
                        }`}>
                            {cashFinalTotal.toFixed(2)} TL
                        </span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-2 text-center">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                            isCream ? 'text-slate-600' : 'text-zinc-400'
                        }`}>
                            Kart Tutar
                        </span>
                        <span className={`text-lg font-black mt-0.5 font-mono tracking-tight ${
                            isCream ? 'text-slate-950' : 'text-white text-glow-sm'
                        }`}>
                            {cardFinalTotal.toFixed(2)} TL
                        </span>
                    </div>
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
