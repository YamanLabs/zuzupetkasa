import React from 'react';
import { Tag, Warning as AlertTriangle, Plus, MagnifyingGlass as Search } from '@phosphor-icons/react';

interface ProductsHeaderProps {
    theme: 'cream' | 'dark';
    productsCount: number;
    unbarcodedCount: number;
    filterOnlyNoBarcode: boolean;
    searchQuery: string;
    selectedCategory: string;
    categories: string[];
    onFilterChange: (val: boolean) => void;
    onOpenAddModal: () => void;
    onSearchChange: (val: string) => void;
    onCategoryChange: (cat: string) => void;
}

export default function ProductsHeader({
    theme, productsCount, unbarcodedCount, filterOnlyNoBarcode, searchQuery, selectedCategory, categories,
    onFilterChange, onOpenAddModal, onSearchChange, onCategoryChange
}: ProductsHeaderProps) {
    const isCream = theme === 'cream';

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                    <h2 className={`text-lg font-black tracking-tight flex items-center space-x-2 ${
                        isCream ? 'text-slate-900' : 'text-slate-100'
                    }`}>
                        <Tag strokeWidth={2} className={`h-5 w-5 ${isCream ? 'text-amber-700' : 'text-blue-400'}`} />
                        <span>Ürün Kataloğu</span>
                    </h2>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                        isCream ? 'bg-amber-100/90 text-amber-950 border-amber-300' : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                        {productsCount} Ürün
                    </span>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => onFilterChange(!filterOnlyNoBarcode)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition active:scale-95 ${
                            filterOnlyNoBarcode
                                ? 'bg-rose-600 text-white shadow-md'
                                : isCream
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30'
                        }`}
                    >
                        <AlertTriangle strokeWidth={2} className="h-3.5 w-3.5" />
                        <span>Barkodsuz Ürünler ({unbarcodedCount})</span>
                    </button>

                    <button
                        onClick={onOpenAddModal}
                        className={`text-white text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-md transition active:scale-95 ${
                            isCream ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                        }`}
                    >
                        <Plus strokeWidth={2.5} className="h-4 w-4" />
                        <span>Yeni Ürün Ekle</span>
                    </button>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                    <Search strokeWidth={2} className={`absolute left-3 top-2.5 h-4 w-4 ${isCream ? 'text-amber-800/70' : 'text-slate-400'}`} />
                    <input
                        type="text"
                        placeholder="Ürün adı veya barkod ara..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className={`w-full border rounded-xl pl-9 pr-4 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 ${
                            isCream
                                ? 'bg-white border-[#d8d1c2] text-slate-900 placeholder-slate-500 focus:ring-amber-500'
                                : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-blue-500'
                        }`}
                    />
                </div>

                <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                    {['Tümü', ...categories].map(cat => (
                        <button
                            key={cat}
                            onClick={() => onCategoryChange(cat)}
                            className={`px-3 py-1 rounded-lg text-xs font-black whitespace-nowrap transition active:scale-95 ${
                                selectedCategory === cat
                                    ? isCream ? 'bg-amber-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm'
                                    : isCream ? 'bg-white border border-[#d8d1c2] text-slate-800 hover:bg-amber-50' : 'bg-slate-800 text-slate-300 hover:text-white'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
