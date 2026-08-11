import { useState } from 'react';
import { dbIPC, posIPC } from '@/lib/ipc';
import { soundFX } from '@/lib/sound-effects';
import { CartItem } from './useCart';

interface UseCheckoutProps {
    cart: CartItem[];
    setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
    cashFinalTotal: number;
    cardFinalTotal: number;
    cashSubtotal: number;
    cardSubtotal: number;  // BUG-09: needed for correct % discount with card payment
    discount: number;
    discountType: 'TL' | '%';
    taxTotal: number;
    onSuccess: () => void;
}

export function useCheckout({
    cart, setCart, cashFinalTotal, cardFinalTotal, 
    cashSubtotal, cardSubtotal, discount, discountType, taxTotal, onSuccess
}: UseCheckoutProps) {
    const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
    const [paymentMethod, setPaymentMethod] = useState<'Nakit' | 'Kredi Kartı' | 'Çoklu'>('Nakit');
    const [cashPaidAmount, setCashPaidAmount] = useState<string>('');
    const [splitCashAmount, setSplitCashAmount] = useState<string>('');
    const [splitCardAmount, setSplitCardAmount] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [posStatusMessage, setPosStatusMessage] = useState<string>('');

    const paidNum = parseFloat(cashPaidAmount) || 0;
    const changeAmount = Math.max(0, paidNum - (paymentMethod === 'Nakit' ? cashFinalTotal : cardFinalTotal));
    const targetTotal = paymentMethod === 'Nakit' ? cashFinalTotal : cardFinalTotal;

    const handleOpenPayment = (method: 'Nakit' | 'Kredi Kartı' | 'Çoklu') => {
        if (cart.length === 0) return;
        soundFX.playClick();
        setPaymentMethod(method);
        setPosStatusMessage('');

        const localTargetTotal = method === 'Nakit' ? cashFinalTotal : cardFinalTotal;

        setCart(prev => prev.map(item => ({
            ...item,
            unit_price: method === 'Nakit' ? item.product.sale_price : (item.product.card_price || Number((item.product.sale_price * 1.05).toFixed(2)))
        })));

        if (method === 'Nakit') {
            setCashPaidAmount(localTargetTotal.toFixed(2));
        } else if (method === 'Çoklu') {
            const half = (localTargetTotal / 2).toFixed(2);
            setSplitCashAmount(half);
            setSplitCardAmount((localTargetTotal - parseFloat(half)).toFixed(2));
        }
        setShowPaymentModal(true);
    };

    const handleFinalizeSale = async (skipPos: boolean = false) => {
        if (cart.length === 0 || isProcessing) return;
        setIsProcessing(true);

        try {
            const cart_items = cart.map(item => ({
                product_id: item.product.id,
                product_name: item.product.name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.quantity * item.unit_price,
                vat_rate: item.product.vat_rate || 20
            }));

            let p1 = paymentMethod === 'Nakit' ? cashFinalTotal : cardFinalTotal;
            let p2 = 0;
            let m1 = paymentMethod === 'Çoklu' ? 'Nakit' : paymentMethod;
            let m2 = paymentMethod === 'Çoklu' ? 'Kredi Kartı' : null;
            let cardAmount = 0;

            if (paymentMethod === 'Çoklu') {
                p1 = parseFloat(splitCashAmount) || 0;
                p2 = parseFloat(splitCardAmount) || 0;
                cardAmount = p2;
            } else if (paymentMethod === 'Kredi Kartı') {
                cardAmount = cardFinalTotal;
                p1 = cardFinalTotal;
            } else if (paymentMethod === 'Nakit') {
                p1 = paidNum > 0 ? paidNum : cashFinalTotal;
            }

            let posAuthCode: string | null = null;

            if (cardAmount > 0 && !skipPos) {
                setPosStatusMessage(`POS Cihazına ${cardAmount.toFixed(2)} TL Sinyal Gönderiliyor... Lütfen Bekleyin`);
                const posRes = await posIPC.sendPaymentSignal(cardAmount);
                if (!posRes || posRes.success === false) {
                    soundFX.playError();
                    setPosStatusMessage(`Hata: ${posRes?.message || 'POS cihazından onay alınamadı.'}`);
                    setIsProcessing(false);
                    return;
                }
                posAuthCode = posRes.auth_code || `POS-OK-${Math.floor(100000 + Math.random() * 900000)}`;
                setPosStatusMessage('POS Ödemesi Başarıyla Onaylandı! Satış Kaydediliyor...');
            } else if (cardAmount > 0 && skipPos) {
                posAuthCode = `MANUAL-CARD-${Math.floor(100000 + Math.random() * 900000)}`;
            }

            // BUG-09: Use the correct subtotal base for percentage discounts
            const baseSubtotal = paymentMethod === 'Kredi Kartı' ? cardSubtotal : cashSubtotal;
            await dbIPC.createSale({
                cart_items,
                discount: discountType === '%' ? (baseSubtotal * (discount / 100)) : discount,
                payment_method: m1,
                payment_amount_1: p1,
                payment_method_2: m2,
                payment_amount_2: p2,
                pos_auth_code: posAuthCode,
                tax_amount: taxTotal
            });

            soundFX.playSuccess();
            setShowPaymentModal(false);
            setPosStatusMessage('');
            setIsProcessing(false);
            onSuccess();
        } catch (err: any) {
            soundFX.playError();
            setPosStatusMessage('Hata: ' + err.message);
            setIsProcessing(false);
        }
    };

    return {
        showPaymentModal, setShowPaymentModal,
        paymentMethod, setPaymentMethod,
        cashPaidAmount, setCashPaidAmount,
        splitCashAmount, setSplitCashAmount,
        splitCardAmount, setSplitCardAmount,
        isProcessing, setIsProcessing,
        posStatusMessage, setPosStatusMessage,
        changeAmount, targetTotal,
        handleOpenPayment, handleFinalizeSale
    };
}
