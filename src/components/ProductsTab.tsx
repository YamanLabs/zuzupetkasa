import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass as Navigation, CheckCircle as CheckCircle2, WarningCircle as AlertCircle } from '@phosphor-icons/react';

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
