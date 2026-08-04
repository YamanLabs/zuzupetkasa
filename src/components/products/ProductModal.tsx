import React, { RefObject } from 'react';
import { X, Check } from 'lucide-react';
import { Product } from '@/lib/ipc';

interface ProductModalProps {
    theme: 'cream' | 'dark';
    editingProduct: Product | null;
    formData: any;
    categories: string[];
    categoryMargins: Record<string, { cash: number; card: number }>;
    nameInputRef: RefObject<HTMLInputElement | null>;
    onClose: () => void;
    onSave: (e: React.FormEvent) => void;
    onFormDataChange: (updates: any) => void;
    onCostPriceChange: (val: string) => void;
    onCategoryChange: (cat: string) => void;
}

export default function ProductModal({
    theme, editingProduct, formData, categories, categoryMargins, nameInputRef,
    onClose, onSave, onFormDataChange, onCostPriceChange, onCategoryChange
}: ProductModalProps) {
    const isCream = theme === 'cream';

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3">
            <form onSubmit={onSave} className={`rounded-2xl w-full max-w-md p-4 space-y-3.5 shadow-2xl transition-all ${
                isCream ? 'bg-[#faf8f2] border border-[#d8d1c2] text-slate-900' : 'bg-slate-900 border border-slate-800 text-slate-100'
            }`}>
                <div className="flex items-center justify-between pb-2">
                    <h3 className="text-sm font-black tracking-tight">
                        {editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
                    </h3>
                    <button type="button" onClick={onClose} className={`p-1 rounded-lg transition active:scale-95 ${
                        isCream ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}>
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="col-span-2">
                        <label className={`block font-extrabold mb-1 ${isCream ? 'text-slate-900' : 'text-slate-300'}`}>Ürün Adı *</label>
                        <input
                            ref={nameInputRef}
                            type="text"
                            required
                            placeholder="Ürün adını yazın..."
                            value={formData.name}
                            onChange={(e) => onFormDataChange({ name: e.target.value })}
                            className={`w-full border rounded-xl px-3 py-1.5 font-bold ${
                                isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-white'
                            } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                        />
                    </div>

                    <div>
                        <label className={`block font-extrabold mb-1 ${isCream ? 'text-slate-900' : 'text-slate-300'}`}>Barkod Numarası</label>
                        <input
                            type="text"
                            placeholder="Yoksa boş bırakın"
                            value={formData.barcode}
                            onChange={(e) => onFormDataChange({ barcode: e.target.value })}
                            className={`w-full border rounded-xl px-3 py-1.5 font-mono font-bold ${
                                isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-white'
                            } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                        />
                    </div>

                    <div>
                        <label className={`block font-extrabold mb-1 ${isCream ? 'text-slate-900' : 'text-slate-300'}`}>Kategori</label>
                        <select
                            value={formData.category}
                            onChange={(e) => onCategoryChange(e.target.value)}
                            className={`w-full border rounded-xl px-3 py-1.5 font-bold ${
                                isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-white'
                            } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                        >
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                            {!categories.includes('Genel') && <option value="Genel">Genel</option>}
                        </select>
                    </div>

                    <div>
                        <label className={`block font-extrabold mb-1 ${isCream ? 'text-slate-900' : 'text-slate-300'}`}>Alış Fiyatı (TL)</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.cost_price}
                            onChange={(e) => onCostPriceChange(e.target.value)}
                            className={`w-full border rounded-xl px-3 py-1.5 font-mono font-extrabold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-white'
                            } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className={`font-extrabold ${isCream ? 'text-slate-900' : 'text-slate-300'}`}>Satış Fiyatı (TL) *</label>
                            <span className="text-[10px] text-amber-700 font-extrabold">
                                %{(() => {
                                    const m = categoryMargins[formData.category];
                                    return m ? (typeof m === 'object' ? m.cash : Number(m)) : 30;
                                })()} Kar
                            </span>
                        </div>
                        <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={formData.sale_price}
                            onChange={(e) => onFormDataChange({ sale_price: e.target.value })}
                            className={`w-full border rounded-xl px-3 py-1.5 font-mono font-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                isCream ? 'bg-white border-[#d8d1c2] text-emerald-800' : 'bg-slate-950 border-slate-700 text-emerald-400'
                            } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                        />
                    </div>

                    <div>
                        <label className={`block font-extrabold mb-1 ${isCream ? 'text-slate-900' : 'text-slate-300'}`}>Mevcut Stok</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={formData.stock_quantity}
                            onChange={(e) => onFormDataChange({ stock_quantity: e.target.value })}
                            className={`w-full border rounded-xl px-3 py-1.5 font-extrabold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-white'
                            } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                        />
                    </div>

                    <div>
                        <label className={`block font-extrabold mb-1 ${isCream ? 'text-slate-900' : 'text-slate-300'}`}>Birim</label>
                        <select
                            value={formData.unit}
                            onChange={(e) => onFormDataChange({ unit: e.target.value })}
                            className={`w-full border rounded-xl px-3 py-1.5 font-bold ${
                                isCream ? 'bg-white border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-white'
                            } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                        >
                            <option value="Adet">Adet</option>
                            <option value="Kg">Kg</option>
                            <option value="Lt">Lt</option>
                            <option value="Paket">Paket</option>
                            <option value="Kutu">Kutu</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`font-bold px-3 py-1.5 rounded-xl text-xs transition active:scale-95 ${
                            isCream ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                    >
                        İptal
                    </button>
                    <button
                        type="submit"
                        className={`text-white font-extrabold px-4 py-1.5 rounded-xl text-xs flex items-center space-x-1 shadow transition active:scale-95 ${
                            isCream ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
                        }`}
                    >
                        <Check className="h-3.5 w-3.5" />
                        <span>Kaydet</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
