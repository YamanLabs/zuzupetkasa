import React from 'react';
import { Warning as AlertTriangle, PencilSimple as Edit2, Trash as Trash2 } from '@phosphor-icons/react';
import { Product } from '@/lib/ipc';

interface ProductsTableProps {
    theme: 'cream' | 'dark';
    products: Product[];
    selectedProductId: number | null;
    onSelectProduct: (id: number) => void;
    onEditProduct: (product: Product) => void;
    onDeleteProduct: (id: number) => void;
}

export default function ProductsTable({
    theme, products, selectedProductId, onSelectProduct, onEditProduct, onDeleteProduct
}: ProductsTableProps) {
    const isCream = theme === 'cream';

    return (
        <div className={`flex-1 overflow-y-auto border rounded-xl shadow-sm transition-colors duration-150 ${
            isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
        }`}>
            <table className="w-full text-left text-xs border-collapse">
                <thead className={`font-black uppercase tracking-wider sticky top-0 border-b z-10 text-[11px] ${
                    isCream ? 'bg-[#f4f0e6] border-[#d8d1c2] text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                    <tr>
                        <th className="px-3 py-2">Barkod</th>
                        <th className="px-3 py-2">Ürün Adı</th>
                        <th className="px-3 py-2">Kategori</th>
                        <th className="px-3 py-2 text-right">Alış Fiyatı</th>
                        <th className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">Nakit Fiyat</th>
                        <th className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">Kart Fiyat</th>
                        <th className="px-3 py-2 text-center">Stok</th>
                        <th className="px-3 py-2 text-right">İşlem</th>
                    </tr>
                </thead>
                <tbody className={`divide-y text-xs ${isCream ? 'divide-[#ece6da]' : 'divide-slate-800/80'}`}>
                    {products.map(product => {
                        const isSelected = selectedProductId === product.id;
                        const hasNoBarcode = !product.barcode;
                        const cardPrice = product.card_price || Number((product.sale_price * 1.05).toFixed(2));

                        return (
                            <tr
                                key={product.id}
                                onClick={() => onSelectProduct(product.id)}
                                className={`cursor-pointer transition-colors duration-75 ${
                                    isSelected 
                                        ? isCream
                                            ? 'bg-[#ffeed3] border-l-4 border-l-amber-600 font-extrabold text-slate-950'
                                            : 'bg-blue-600/35 border-l-4 border-l-blue-400 font-extrabold text-white shadow-inner' 
                                        : isCream
                                            ? 'hover:bg-amber-500/10 text-slate-900'
                                            : 'hover:bg-slate-800/70 text-slate-100'
                                }`}
                            >
                                <td className={`px-3 py-1.5 font-mono text-[11px] whitespace-nowrap ${
                                    isSelected
                                        ? isCream ? 'text-slate-950 font-bold' : 'text-blue-200 font-bold'
                                        : isCream ? 'text-slate-600 font-medium' : 'text-slate-400'
                                }`}>
                                    {hasNoBarcode ? (
                                        <span className="bg-red-500/20 text-red-600 border border-red-500/40 font-black px-2 py-0.5 rounded text-[10px] inline-flex items-center space-x-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            <span>Barkod Yok</span>
                                        </span>
                                    ) : (
                                        <span>{product.barcode}</span>
                                    )}
                                </td>

                                <td className={`px-3 py-1.5 font-extrabold leading-tight ${
                                    isCream 
                                        ? isSelected ? 'text-slate-950' : 'text-slate-900' 
                                        : isSelected ? 'text-white' : 'text-slate-100'
                                }`}>
                                    {product.name}
                                </td>

                                <td className="px-3 py-1.5 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                        isCream ? 'bg-[#ede7db] text-slate-800 border-[#d0c8b6]' : 'bg-slate-800 text-slate-300 border-slate-700'
                                    }`}>
                                        {product.category}
                                    </span>
                                </td>

                                <td className={`px-3 py-1.5 text-right font-bold font-mono text-xs ${
                                    isCream ? 'text-slate-600' : 'text-slate-400'
                                }`}>
                                    {product.cost_price.toFixed(2)} TL
                                </td>

                                <td className={`px-3 py-1.5 text-right font-extrabold font-mono text-xs ${
                                    isCream ? 'text-emerald-800' : 'text-emerald-400'
                                }`}>
                                    {product.sale_price.toFixed(2)} TL
                                </td>

                                <td className={`px-3 py-1.5 text-right font-extrabold font-mono text-xs ${
                                    isCream ? 'text-blue-800' : 'text-blue-400'
                                }`}>
                                    {cardPrice.toFixed(2)} TL
                                </td>

                                <td className="px-3 py-1.5 text-center font-bold">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                        product.stock_quantity <= product.min_stock_alert
                                            ? 'bg-amber-500/25 text-amber-900 border border-amber-500/40'
                                            : isCream
                                                ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                    }`}>
                                        {product.stock_quantity} {product.unit}
                                    </span>
                                </td>

                                <td className="px-3 py-1.5 text-right space-x-1 whitespace-nowrap">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEditProduct(product); }}
                                        className={`p-1 rounded-lg transition active:scale-95 ${
                                            isCream ? 'hover:bg-slate-200 text-blue-700' : 'hover:bg-slate-700 text-blue-400'
                                        }`}
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteProduct(product.id); }}
                                        className={`p-1 rounded-lg transition active:scale-95 ${
                                            isCream ? 'hover:bg-slate-200 text-rose-700' : 'hover:bg-slate-700 text-rose-400'
                                        }`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
