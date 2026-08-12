import { useState } from 'react';
import { Product } from '@/lib/ipc';
import { soundFX } from '@/lib/sound-effects';

export interface CartItem {
    product: Product;
    quantity: number;
    unit_price: number;
}

export function useCart() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discount, setDiscount] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'TL' | '%'>('TL');

    const addToCart = (product: Product) => {
        soundFX.playClick();
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => 
                    item.product.id === product.id 
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                return [...prev, { product, quantity: 1, unit_price: product.sale_price }];
            }
        });
    };

    const updateQuantity = (productId: number, delta: number) => {
        soundFX.playClick();
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }));
    };

    const setQuantity = (productId: number, qty: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                return qty > 0 ? { ...item, quantity: qty } : item;
            }
            return item;
        }));
    };

    const removeFromCart = (productId: number) => {
        soundFX.playClick();
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const clearCart = () => {
        soundFX.playClick();
        setCart([]);
        setDiscount(0);
    };

    const cashSubtotal = cart.reduce((sum, item) => sum + (item.quantity * item.product.sale_price), 0);
    const cardSubtotal = cart.reduce((sum, item) => sum + (item.quantity * (item.product.card_price || Number((item.product.sale_price * 1.05).toFixed(2)))), 0);

    const cashDiscountAmount = discountType === '%' ? (cashSubtotal * (discount / 100)) : discount;
    const cardDiscountAmount = discountType === '%' ? (cardSubtotal * (discount / 100)) : discount;

    const cashFinalTotal = Math.max(0, cashSubtotal - cashDiscountAmount);
    const cardFinalTotal = Math.max(0, cardSubtotal - cardDiscountAmount);

    const taxTotal = cart.reduce((sum, item) => {
        const vat = item.product.vat_rate || 20;
        const lineTotal = item.quantity * item.unit_price;
        return sum + (lineTotal - (lineTotal / (1 + vat / 100)));
    }, 0);

    return {
        cart, setCart,
        discount, setDiscount,
        discountType, setDiscountType,
        addToCart, updateQuantity, setQuantity, removeFromCart, clearCart,
        cashSubtotal, cardSubtotal,
        cashFinalTotal, cardFinalTotal, taxTotal
    };
}
