"use client";

import React, { useEffect } from 'react';
import SalesProductTable from './sales/SalesProductTable';
import SalesCart from './sales/SalesCart';
import SalesPaymentModal from './sales/SalesPaymentModal';

import { useCart } from '@/hooks/useCart';
import { useProductSearch } from '@/hooks/useProductSearch';
import { useCheckout } from '@/hooks/useCheckout';

interface SalesTabProps {
    scannedBarcode?: string;
    onResetScannedBarcode?: () => void;
    theme?: 'cream' | 'dark';
    isActive?: boolean;
}

export default function SalesTab({ scannedBarcode, onResetScannedBarcode, theme = 'cream', isActive = true }: SalesTabProps) {
    const cartState = useCart();
    
    const searchState = useProductSearch((product) => {
        cartState.addToCart(product);
    });

    const checkoutState = useCheckout({
        cart: cartState.cart,
        setCart: cartState.setCart,
        cashFinalTotal: cartState.cashFinalTotal,
        cardFinalTotal: cartState.cardFinalTotal,
        cashSubtotal: cartState.cashSubtotal,
        cardSubtotal: cartState.cardSubtotal,  // BUG-09: pass card subtotal
        discount: cartState.discount,
        discountType: cartState.discountType,
        taxTotal: cartState.taxTotal,
        onSuccess: () => {
            cartState.clearCart();
            searchState.loadData();
        }
    });

    useEffect(() => {
        if (isActive) {
            searchState.loadData();
        }
    }, [isActive]);

    useEffect(() => {
        if (scannedBarcode && isActive) {
            searchState.handleBarcodeScanned(scannedBarcode);
            if (onResetScannedBarcode) onResetScannedBarcode();
        }
    }, [scannedBarcode, isActive]);

    // IMP-18: Auto-Focus Search Input on any non-input key press
    useEffect(() => {
        if (!isActive || checkoutState.showPaymentModal) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Ignore if we're already typing in an input or textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            // Ignore modifier keys and Function keys
            if (e.ctrlKey || e.altKey || e.metaKey || e.key.startsWith('F')) return;

            // Ignore space or enter or escape etc if we aren't typing
            if (e.key.length !== 1 && e.key !== 'Backspace') return;

            if (searchState.searchInputRef.current) {
                searchState.searchInputRef.current.focus();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isActive, checkoutState.showPaymentModal]);

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            <SalesProductTable 
                theme={theme}
                products={searchState.products}
                categories={searchState.categories}
                selectedCategory={searchState.selectedCategory}
                searchQuery={searchState.searchQuery}
                selectedIndex={searchState.selectedIndex}
                searchInputRef={searchState.searchInputRef}
                selectedRowRef={searchState.selectedRowRef}
                onSearchChange={searchState.setSearchQuery}
                onCategoryChange={searchState.setSelectedCategory}
                onIndexChange={searchState.setSelectedIndex}
                onAddToCart={cartState.addToCart}
                onSearchKeyDown={searchState.handleSearchKeyDown}
            />

            <SalesCart 
                theme={theme}
                cart={cartState.cart}
                discount={cartState.discount}
                discountType={cartState.discountType}
                cashFinalTotal={cartState.cashFinalTotal}
                cardFinalTotal={cartState.cardFinalTotal}
                onUpdateQuantity={cartState.updateQuantity}
                onSetQuantity={cartState.setQuantity}
                onRemoveFromCart={cartState.removeFromCart}
                onClearCart={cartState.clearCart}
                onDiscountChange={cartState.setDiscount}
                onDiscountTypeChange={cartState.setDiscountType}
                onOpenPayment={checkoutState.handleOpenPayment}
            />

            <SalesPaymentModal 
                theme={theme}
                show={checkoutState.showPaymentModal}
                paymentMethod={checkoutState.paymentMethod}
                targetTotal={checkoutState.targetTotal}
                cashPaidAmount={checkoutState.cashPaidAmount}
                splitCashAmount={checkoutState.splitCashAmount}
                splitCardAmount={checkoutState.splitCardAmount}
                changeAmount={checkoutState.changeAmount}
                isProcessing={checkoutState.isProcessing}
                posStatusMessage={checkoutState.posStatusMessage}
                onClose={() => {
                    checkoutState.setShowPaymentModal(false);
                    checkoutState.setIsProcessing(false);
                    checkoutState.setPosStatusMessage('');
                }}
                onCashPaidChange={checkoutState.setCashPaidAmount}
                onSplitCashChange={checkoutState.setSplitCashAmount}
                onSplitCardChange={checkoutState.setSplitCardAmount}
                onFinalizeSale={checkoutState.handleFinalizeSale}
            />
        </div>
    );
}
