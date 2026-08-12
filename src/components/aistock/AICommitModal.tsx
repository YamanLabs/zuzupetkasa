import React from 'react';
import { motion } from 'framer-motion';
import { Package, X, WarningCircle } from '@phosphor-icons/react';
import type { AIParsedItem } from '@/hooks/useAIAnalysis';

interface AICommitModalProps {
    theme: 'cream' | 'dark';
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
    parsedItems: AIParsedItem[];
}

export default function AICommitModal({ theme, show, onClose, onConfirm, parsedItems }: AICommitModalProps) {
    if (!show) return null;

    const isCream = theme === 'cream';

    const totalItems = parsedItems.length;
    const itemsWithoutBarcode = parsedItems.filter(i => !i.barcode).length;
    const existingItems = parsedItems.filter(i => !!i.matchedProduct).length;
    const newItems = totalItems - existingItems;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${
                    isCream ? 'bg-[#fdfbf7] border-[#d8d1c2]' : 'bg-slate-900 border-slate-700'
                }`}
            >
                {/* Header */}
                <div className={`px-4 py-3 border-b flex items-center justify-between ${
                    isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                }`}>
                    <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                        <Package weight="bold" className="h-5 w-5" />
                        <h2 className={`font-black text-sm tracking-tight ${isCream ? 'text-slate-900' : 'text-slate-100'}`}>
                            Stok Aktarım Özeti
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-1.5 rounded-xl transition-colors ${
                            isCream ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
                        }`}
                    >
                        <X strokeWidth={2.5} className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className={`p-5 space-y-4 text-sm font-medium ${isCream ? 'text-slate-700' : 'text-slate-300'}`}>
                    <p>
                        Aşağıdaki ürünler veritabanına aktarılacaktır. Devam etmek istiyor musunuz?
                    </p>

                    <div className={`p-4 rounded-xl space-y-2 border ${
                        isCream ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                    }`}>
                        <div className="flex justify-between items-center">
                            <span>Toplam Aktarılacak Kalem:</span>
                            <span className="font-black text-lg">{totalItems}</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                            <span>Güncellenecek Mevcut Ürünler:</span>
                            <span className="font-bold">{existingItems}</span>
                        </div>
                        <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                            <span>Eklenecek Yeni Ürünler:</span>
                            <span className="font-bold">{newItems}</span>
                        </div>
                    </div>

                    {itemsWithoutBarcode > 0 && (
                        <div className="flex items-start space-x-2 p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <WarningCircle strokeWidth={2} className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <span className="text-xs font-bold">
                                Dikkat: Barkodu olmayan {itemsWithoutBarcode} adet kalem var. Bu ürünler, isme göre aranabilecek şekilde eklenecektir veya eşleşme bulunamazsa yeni oluşturulacaktır.
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-4 py-3 border-t flex justify-end space-x-2 ${
                    isCream ? 'bg-[#f4f0e6] border-[#d8d1c2]' : 'bg-slate-900 border-slate-800'
                }`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
                            isCream ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-black rounded-xl text-white shadow-md transition active:scale-95 ${
                            isCream ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-500'
                        }`}
                    >
                        <Package strokeWidth={2} className="h-4 w-4" />
                        <span>Onayla ve Aktar</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
