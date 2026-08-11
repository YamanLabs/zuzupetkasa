import React, { useRef, useEffect } from 'react';
import { MagnifyingGlass as Search, Plus, Tag, WarningCircle as AlertCircle, ShoppingBag, X } from '@phosphor-icons/react';
import { Product } from '@/lib/ipc';

interface SalesProductTableProps {
    theme: 'cream' | 'dark';
    products: Product[];
    categories: string[];
    selectedCategory: string;
    searchQuery: string;
    selectedIndex: number;
    searchInputRef: React.RefObject<HTMLInputElement | null>;
    selectedRowRef?: React.RefObject<HTMLTableRowElement | null>;
    onSearchChange: (query: string) => void;
    onCategoryChange: (category: string) => void;
    onIndexChange: (index: number) => void;
    onAddToCart: (product: Product) => void;
    onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function SalesProductTable({
    theme,
    products,
    categories,
    selectedCategory,
    searchQuery,
    selectedIndex,
    searchInputRef,
    selectedRowRef: externalSelectedRowRef,
    onSearchChange,
    onCategoryChange,
    onIndexChange,
    onAddToCart,
    onSearchKeyDown
}: SalesProductTableProps) {
    const isCream = theme === 'cream';
    const internalSelectedRowRef = useRef<HTMLTableRowElement | null>(null);
    const activeRowRef = externalSelectedRowRef || internalSelectedRowRef;

    useEffect(() => {
        if (activeRowRef.current) {
            activeRowRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [selectedIndex]);

    return (
        <div className="flex-1 flex flex-col space-y-3 p-3.5 overflow-hidden">
            {/* Search Input Bar */}
            <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                    <Search 
                        strokeWidth={2} 
                        className={`absolute left-3 top-2.5 h-4 w-4 ${
                            isCream ? 'text-slate-500' : 'text-zinc-400'
                        }`} 
                    />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Ürün Adı veya Barkod Oku... (F1)"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={onSearchKeyDown}
                        className={`w-full rounded-xl pl-9 pr-9 py-1.5 text-xs font-bold tracking-tight shadow-sm transition-all focus:outline-none focus:ring-2 ${
                            isCream
                                ? 'bg-white border border-[#d8d1c2] text-slate-900 placeholder-slate-500 focus:ring-amber-500'
                                : 'bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:ring-zinc-600'
                        }`}
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => onSearchChange('')} 
                            className={`absolute right-2.5 top-2 p-0.5 rounded-full transition-transform active:scale-95 ${
                                isCream ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            <X strokeWidth={2.5} className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Categories Bar */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {['Tümü', ...categories.filter(c => !c.toLowerCase().includes('ai fatura'))].map(cat => {
                    const isSelected = selectedCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => onCategoryChange(cat)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-extrabold tracking-tight whitespace-nowrap transition-all duration-150 active:scale-95 ${
                                isSelected
                                    ? isCream
                                        ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-700'
                                        : 'bg-zinc-800 text-white shadow-md border border-zinc-700 text-glow-sm'
                                    : isCream
                                        ? 'bg-white border border-[#dcd6c8] text-slate-800 hover:bg-amber-500/10'
                                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white'
                            }`}
                        >
                            {cat}
                        </button>
                    );
                })}
            </div>

            {/* 60 FPS Optimized Product Table View */}
            <div className={`flex-1 overflow-auto rounded-xl border shadow-sm transition-colors duration-150 ${
                isCream ? 'bg-white border-[#d8d1c2]' : 'bg-black border-zinc-800'
            }`}>
                <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead className={`sticky top-0 border-b text-[11px] font-extrabold uppercase tracking-wider z-10 ${
                        isCream 
                            ? 'bg-[#f4f0e6] border-[#d8d1c2] text-slate-700' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}>
                        <tr>
                            <th className="py-2 px-3 w-28 whitespace-nowrap">Barkod</th>
                            <th className="py-2 px-3 min-w-[180px]">Ürün Adı</th>
                            <th className="py-2 px-3 w-28 whitespace-nowrap">Kategori</th>
                            <th className="py-2 px-3 w-24 text-center whitespace-nowrap">Stok</th>
                            <th className="py-2 px-3 w-24 text-right whitespace-nowrap text-emerald-600 dark:text-emerald-400">Nakit Fiyat</th>
                            <th className="py-2 px-3 w-24 text-right whitespace-nowrap text-purple-700 dark:text-purple-400">Kart Fiyat</th>
                            <th className="py-2 px-3 w-20 text-center whitespace-nowrap">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${isCream ? 'divide-[#ece6da]' : 'divide-zinc-800/80'}`}>
                        {products.map((product, index) => {
                            const isSelected = index === selectedIndex;
                            const isLowStock = product.stock_quantity <= product.min_stock_alert;
                            const hasNoBarcode = !product.barcode;
                            const isAiInvoiceCategory = product.category && product.category.toLowerCase().includes('ai fatura');
                            const cardPrice = product.card_price || Number((product.sale_price * 1.05).toFixed(2));

                            return (
                                <tr
                                    key={product.id}
                                    ref={isSelected ? (activeRowRef as any) : null}
                                    onClick={() => {
                                        onIndexChange(index);
                                        onAddToCart(product);
                                    }}
                                    className={`cursor-pointer transition-colors duration-75 ${
                                        isSelected 
                                            ? isCream
                                                ? 'bg-[#ffeed3] border-l-4 border-l-amber-600 font-extrabold'
                                                : 'bg-zinc-800/90 border-l-4 border-l-amber-500 font-extrabold text-white shadow-inner' 
                                            : isCream
                                                ? 'hover:bg-amber-500/10 text-slate-900'
                                                : 'hover:bg-zinc-900/80 text-zinc-100'
                                    }`}
                                >
                                    {/* BARKOD */}
                                    <td className={`py-1.5 px-3 font-mono text-[11px] whitespace-nowrap ${
                                        isSelected
                                            ? isCream ? 'text-slate-900 font-bold' : 'text-zinc-100 font-bold'
                                            : isCream ? 'text-slate-600 font-medium' : 'text-zinc-400'
                                    }`}>
                                        {product.barcode || <span className="italic text-[10px] text-slate-400">Barkodsuz</span>}
                                    </td>

                                    {/* ÜRÜN ADI */}
                                    <td className={`py-1.5 px-3 font-extrabold leading-tight ${
                                        isCream 
                                            ? isSelected ? 'text-slate-950' : 'text-slate-900' 
                                            : isSelected ? 'text-white text-glow-sm' : 'text-zinc-100'
                                    }`}>
                                        {product.name}
                                    </td>

                                    {/* KATEGORİ */}
                                    <td className="py-1.5 px-3 whitespace-nowrap">
                                        {!isAiInvoiceCategory && product.category ? (
                                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                                                isCream 
                                                    ? 'bg-[#ede7db] text-slate-800 border-[#d0c8b6]' 
                                                    : 'bg-zinc-900 text-zinc-300 border-zinc-800'
                                            }`}>
                                                {product.category}
                                            </span>
                                        ) : null}
                                    </td>

                                    {/* STOK */}
                                    <td className="py-1.5 px-3 text-center whitespace-nowrap">
                                        {hasNoBarcode ? (
                                            <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-red-500/20 text-red-600 border border-red-500/30 whitespace-nowrap">
                                                Barkod Yok
                                            </span>
                                        ) : (
                                            <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md whitespace-nowrap ${
                                                isLowStock 
                                                    ? 'bg-amber-500/25 text-amber-900 border border-amber-500/40' 
                                                    : isCream 
                                                        ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' 
                                                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                            }`}>
                                                {product.stock_quantity} {product.unit}
                                            </span>
                                        )}
                                    </td>

                                    {/* NAKİT FİYAT */}
                                    <td className={`py-1.5 px-3 text-right font-extrabold font-mono text-xs whitespace-nowrap ${
                                        isCream ? 'text-emerald-800' : 'text-emerald-400'
                                    }`}>
                                        {product.sale_price.toFixed(2)} TL
                                    </td>

                                    {/* KART FİYAT */}
                                    <td className={`py-1.5 px-3 text-right font-extrabold font-mono text-xs whitespace-nowrap ${
                                        isCream ? 'text-purple-800' : 'text-purple-400'
                                    }`}>
                                        {cardPrice.toFixed(2)} TL
                                    </td>

                                    {/* İŞLEM BUTONU */}
                                    <td className="py-1.5 px-3 text-center whitespace-nowrap">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddToCart(product);
                                            }}
                                            className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg transition-transform duration-100 flex items-center justify-center space-x-1 mx-auto whitespace-nowrap active:scale-95 ${
                                                isSelected
                                                    ? isCream ? 'bg-amber-600 text-white shadow-sm' : 'bg-zinc-700 text-white shadow-sm border border-zinc-600'
                                                    : isCream ? 'bg-amber-600/10 hover:bg-amber-600 text-amber-900 hover:text-white border border-amber-600/20' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                                            }`}
                                        >
                                            <Plus strokeWidth={2.5} className="h-3 w-3" />
                                            <span>Ekle</span>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {products.length === 0 && (
                    <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                        <ShoppingBag strokeWidth={1.5} className="h-10 w-10 opacity-25 text-amber-600" />
                        <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">Ürün bulunamadı.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
