import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, CheckCircle2, AlertCircle } from 'lucide-react';

import { useProducts } from '@/hooks/useProducts';
import ProductsHeader from './products/ProductsHeader';
import ProductsTable from './products/ProductsTable';
import ProductModal from './products/ProductModal';

interface ProductsTabProps {
    scannedBarcode?: string;
    onResetScannedBarcode?: () => void;
    theme?: 'cream' | 'dark';
}

export default function ProductsTab({ scannedBarcode, onResetScannedBarcode, theme = 'cream' }: ProductsTabProps) {
    const p = useProducts(scannedBarcode, onResetScannedBarcode);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] p-6 space-y-4 overflow-hidden">
            <ProductsHeader 
                theme={theme}
                productsCount={p.products.length}
                unbarcodedCount={p.unbarcodedCount}
                filterOnlyNoBarcode={p.filterOnlyNoBarcode}
                searchQuery={p.searchQuery}
                selectedCategory={p.selectedCategory}
                categories={p.categories}
                onFilterChange={p.setFilterOnlyNoBarcode}
                onOpenAddModal={p.handleOpenAddModal}
                onSearchChange={p.setSearchQuery}
                onCategoryChange={p.setSelectedCategory}
            />

            {/* Helper Banner for Arrow Key Navigation & Quick Scan */}
            <div className={`border rounded-xl p-3 flex items-center justify-between text-xs shadow-inner ${
                theme === 'cream' ? 'bg-amber-100/60 border-amber-300 text-amber-950' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
                <div className="flex items-center space-x-2.5">
                    <Navigation className={`h-4 w-4 ${theme === 'cream' ? 'text-amber-700' : 'text-blue-400'}`} />
                    <span className="font-medium">
                        <strong>Hızlı Barkod Atama:</strong> Tabloda <strong>Yön Tuşları (↑ ↓)</strong> veya fare ile ürünü seçip <strong>barkodu doğrudan taratın</strong>. Düzenle menüsüne girmeden otomatik kaydolur.
                    </span>
                </div>
                {p.selectedProductId && (
                    <div className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] flex items-center space-x-1.5 ${
                        theme === 'cream' ? 'bg-white border-amber-300 text-amber-900 shadow-sm' : 'bg-slate-800 border-slate-700 text-amber-300'
                    }`}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Seçili: {p.products.find(prod => prod.id === p.selectedProductId)?.name}</span>
                    </div>
                )}
            </div>

            {/* Toast Notification Overlay */}
            <AnimatePresence>
                {p.toastNotice && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.95 }}
                        className={`fixed bottom-6 right-6 z-50 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border text-xs ${
                            p.toastNotice.type === 'error'
                                ? 'bg-rose-600 border-rose-400/50 shadow-rose-600/30'
                                : 'bg-emerald-600 border-emerald-400/50 shadow-emerald-600/30'
                        }`}
                    >
                        {p.toastNotice.type === 'error' ? (
                            <AlertCircle className="h-5 w-5 text-rose-200" />
                        ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                        )}
                        <span>{p.toastNotice.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <ProductsTable 
                theme={theme}
                products={p.products}
                selectedProductId={p.selectedProductId}
                onSelectProduct={p.setSelectedProductId}
                onEditProduct={p.handleOpenEditModal}
                onDeleteProduct={p.handleDeleteProduct}
            />

            {p.showModal && (
                <ProductModal 
                    theme={theme}
                    editingProduct={p.editingProduct}
                    formData={p.formData}
                    categories={p.categories}
                    categoryMargins={p.categoryMargins}
                    nameInputRef={p.nameInputRef}
                    onClose={() => p.setShowModal(false)}
                    onSave={p.handleSaveProduct}
                    onFormDataChange={(updates) => p.setFormData(prev => ({ ...prev, ...updates }))}
                    onCostPriceChange={p.handleCostPriceChange}
                    onCategoryChange={p.handleCategoryChange}
                />
            )}
        </div>
    );
}
