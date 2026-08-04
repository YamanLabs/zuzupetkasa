import { useState, useEffect } from 'react';
import { aiIPC, dbIPC, Product } from '@/lib/ipc';
import { AICustomRule } from './useAIRules';

export interface AIParsedItem {
    name: string;
    category: string;
    barcode: string | null;
    quantity: number;
    unit_price_excl_tax: number;
    vat_rate: number;
    unit_cost_with_tax: number;
    effective_cost: number;
    cost_price: number;
    sale_price: number;
    unit: string;
    matchedProduct?: Product | null;
}

interface UseAIAnalysisProps {
    customRules: AICustomRule[];
}

export function useAIAnalysis({ customRules }: UseAIAnalysisProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [parsedItems, setParsedItems] = useState<AIParsedItem[]>([]);
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [categoryMargins, setCategoryMargins] = useState<Record<string, { cash: number; card: number }>>({});
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);

    const [invoiceServiceFee, setInvoiceServiceFee] = useState<number>(0);
    const [totalProductQuantity, setTotalProductQuantity] = useState<number>(0);
    const [serviceFeePerUnit, setServiceFeePerUnit] = useState<number>(0);

    const loadCategoryData = async () => {
        const margins = await dbIPC.getCategoryMargins();
        setCategoryMargins(margins);
        setAvailableCategories(Object.keys(margins));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);

        const previews = files.map(file => URL.createObjectURL(file));
        setFilePreviews(prev => [...prev, ...previews]);
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setFilePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleRunAIAnalysis = async () => {
        if (selectedFiles.length === 0) return;
        setIsAnalyzing(true);
        setStatusMessage('Gemini AI Fatura Analizi Ediliyor...');

        try {
            const base64List = await Promise.all(selectedFiles.map(convertFileToBase64));
            const result = await aiIPC.analyzeInvoiceImages(base64List);

            if (result.success) {
                setStatusMessage(result.message);
                await loadCategoryData();

                const serviceFee = parseFloat((result as any).invoice_service_fee || 0);
                const totalQty = parseInt((result as any).total_quantity || 0, 10);
                const feePerUnit = parseFloat((result as any).service_fee_per_unit || 0);

                setInvoiceServiceFee(serviceFee);
                setTotalProductQuantity(totalQty);
                setServiceFeePerUnit(feePerUnit);

                const dbProducts = await dbIPC.getProducts('', 'Tümü');

                const normalizeName = (str: string) => {
                    return (str || '')
                        .toLowerCase()
                        .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ğ/g, 'g')
                        .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o')
                        .replace(/ç/g, 'c').replace(/[^a-z0-9\s]/g, ' ')
                        .replace(/\s+/g, ' ').trim();
                };

                const normalizeCategoryName = (cat: string, name: string): string => {
                    const combined = `${cat || ''} ${name || ''}`.toLowerCase();

                    if (customRules && customRules.length > 0) {
                        for (const rule of customRules) {
                            if (rule.keyword && rule.category && combined.includes(rule.keyword.toLowerCase())) {
                                return rule.category;
                            }
                        }
                    }

                    if (combined.includes('yaş') || combined.includes('yas') || combined.includes('konserve') || 
                        combined.includes('pouch') || combined.includes('çorba') || combined.includes('corba') || 
                        combined.includes('krema') || combined.includes('ödül') || combined.includes('odul') || 
                        combined.includes('stick') || combined.includes('sosis') || combined.includes('ezme')) {
                        return 'Yaş Mama';
                    }
                    if (combined.includes('mama') || combined.includes('kuru') || combined.includes('kedi mamasi') || combined.includes('kopek mamasi')) {
                        return 'Mama';
                    }
                    if (combined.includes('kum') || combined.includes('bentonit')) return 'Kedi Kumu';
                    if (combined.includes('oyuncak') || combined.includes('tırmalama') || combined.includes('top')) return 'Oyuncak';
                    if (combined.includes('kap') || combined.includes('suluk')) return 'Mama Kapları';
                    if (combined.includes('tasma') || combined.includes('tarak') || combined.includes('şampuan') || combined.includes('ped')) return 'Aksesuar';
                    if (combined.includes('çanta') || combined.includes('canta') || combined.includes('taşıma')) return 'Taşıma Çantası';
                    if (combined.includes('yatak')) return 'Yatak';

                    if (cat && availableCategories.includes(cat)) {
                        return cat;
                    }
                    return cat || (availableCategories[0] || 'Mama');
                };

                const findExistingMatch = (itemName: string, itemBarcode: string): Product | null => {
                    if (itemBarcode && itemBarcode.trim()) {
                        const byBcode = dbProducts.find(p => p.barcode && p.barcode.trim() === itemBarcode.trim());
                        if (byBcode) return byBcode;
                    }
                    const normItem = normalizeName(itemName);
                    if (!normItem) return null;

                    const exact = dbProducts.find(p => normalizeName(p.name) === normItem);
                    if (exact) return exact;

                    const tokens = normItem.split(' ').filter(t => t.length > 1);
                    if (tokens.length >= 2) {
                        let best: Product | null = null;
                        let maxCnt = 0;
                        for (const p of dbProducts) {
                            const normP = normalizeName(p.name);
                            const cnt = tokens.filter(tok => normP.includes(tok)).length;
                            if (cnt >= Math.ceil(tokens.length * 0.75) && cnt > maxCnt) {
                                maxCnt = cnt;
                                best = p;
                            }
                        }
                        if (best) return best;
                    }
                    return null;
                };

                const enrichedItems: AIParsedItem[] = [];
                for (const item of result.items) {
                    let matched = null;
                    if (item.matched_product_id) {
                        matched = dbProducts.find(p => p.id === item.matched_product_id) || null;
                    }
                    if (!matched) {
                        matched = findExistingMatch(item.name, item.barcode);
                    }
                    const catName = normalizeCategoryName(item.category, item.name);

                    const priceExcl = parseFloat(item.unit_price_excl_tax || item.cost_price || 0) || 0;
                    const vat = parseFloat(item.vat_rate !== undefined ? item.vat_rate : 20) || 20;
                    const unitCostWithTax = parseFloat(item.unit_cost_with_tax || 0) || Math.round(priceExcl * (1 + vat / 100) * 100) / 100;
                    const effectiveCost = parseFloat(item.effective_cost || item.cost_price || 0) || Math.round((unitCostWithTax + feePerUnit) * 100) / 100;
                    
                    const catObj = categoryMargins[catName];
                    const cashMargin = typeof catObj === 'object' && catObj !== null ? catObj.cash : (Number(catObj) || 30);
                    
                    let computedSalePrice = parseFloat(item.sale_price || 0);
                    if (!computedSalePrice || isNaN(computedSalePrice)) {
                        computedSalePrice = effectiveCost > 0 ? Math.round(effectiveCost * (1 + cashMargin / 100)) : (matched ? matched.sale_price : 0);
                    }

                    enrichedItems.push({
                        ...item,
                        unit_price_excl_tax: priceExcl,
                        vat_rate: vat,
                        unit_cost_with_tax: unitCostWithTax,
                        effective_cost: effectiveCost,
                        cost_price: effectiveCost,
                        sale_price: isNaN(computedSalePrice) ? 0 : computedSalePrice,
                        category: catName,
                        matchedProduct: matched
                    });
                }

                setParsedItems(enrichedItems);
                const firstNoBcode = enrichedItems.findIndex(i => !i.barcode);
                if (firstNoBcode !== -1) setSelectedItemIndex(firstNoBcode);
            } else {
                alert('AI Fatura Analiz Hatası: ' + result.message);
            }
        } catch (err: any) {
            alert('Analiz hatası: ' + err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleServiceFeeChange = (newFeeVal: number) => {
        const fee = Math.max(0, newFeeVal);
        setInvoiceServiceFee(fee);
        const totalQty = parsedItems.reduce((acc, i) => acc + i.quantity, 0);
        setTotalProductQuantity(totalQty);
        const feePerUnit = totalQty > 0 ? (fee / totalQty) : 0;
        setServiceFeePerUnit(feePerUnit);

        setParsedItems(prev => prev.map(item => {
            const priceExcl = item.unit_price_excl_tax || 0;
            const vat = item.vat_rate !== undefined ? item.vat_rate : 20;
            const unitCostWithTax = Math.round(priceExcl * (1 + vat / 100) * 100) / 100;
            const effectiveCost = Math.round((unitCostWithTax + feePerUnit) * 100) / 100;
            const catObj = categoryMargins[item.category];
            const cashMargin = typeof catObj === 'object' && catObj !== null ? catObj.cash : (Number(catObj) || 30);
            const salePrice = effectiveCost > 0 ? Math.round(effectiveCost * (1 + cashMargin / 100)) : item.sale_price;
            return {
                ...item,
                unit_cost_with_tax: unitCostWithTax,
                effective_cost: effectiveCost,
                cost_price: effectiveCost,
                sale_price: salePrice
            };
        }));
    };

    const handleCategoryChange = (index: number, newCat: string) => {
        setParsedItems(prev => prev.map((item, idx) => {
            if (idx !== index) return item;
            const catObj = categoryMargins[newCat];
            const cashMargin = typeof catObj === 'object' && catObj !== null ? catObj.cash : (Number(catObj) || 30);
            const baseCost = item.effective_cost || item.unit_cost_with_tax || item.cost_price;
            const computedSalePrice = baseCost > 0 
                ? Math.round(baseCost * (1 + cashMargin / 100)) 
                : item.sale_price;
            return {
                ...item,
                category: newCat,
                sale_price: computedSalePrice
            };
        }));
    };

    const handleItemFieldChange = (index: number, field: keyof AIParsedItem, value: any) => {
        setParsedItems(prev => prev.map((item, idx) => {
            if (idx !== index) return item;
            const updated = { ...item, [field]: value };
            
            if (field === 'unit_price_excl_tax' || field === 'vat_rate' || field === 'quantity') {
                const priceExcl = parseFloat(field === 'unit_price_excl_tax' ? value : updated.unit_price_excl_tax) || 0;
                const vat = parseFloat(field === 'vat_rate' ? value : updated.vat_rate) || 0;
                const unitCostWithTax = Math.round(priceExcl * (1 + vat / 100) * 100) / 100;
                const effectiveCost = Math.round((unitCostWithTax + serviceFeePerUnit) * 100) / 100;
                const catObj = categoryMargins[item.category];
                const cashMargin = typeof catObj === 'object' && catObj !== null ? catObj.cash : (Number(catObj) || 30);
                updated.unit_cost_with_tax = unitCostWithTax;
                updated.effective_cost = effectiveCost;
                updated.cost_price = effectiveCost;
                updated.sale_price = effectiveCost > 0 ? Math.round(effectiveCost * (1 + cashMargin / 100)) : item.sale_price;
            }
            return updated;
        }));
    };

    const handleCommitStockToDatabase = async () => {
        if (parsedItems.length === 0 || isSaving) return;
        setIsSaving(true);

        try {
            for (const item of parsedItems) {
                if (item.matchedProduct) {
                    await dbIPC.updateProduct(item.matchedProduct.id, {
                        ...item.matchedProduct,
                        category: item.category || item.matchedProduct.category,
                        stock_quantity: item.matchedProduct.stock_quantity + item.quantity,
                        cost_price: item.cost_price,
                        sale_price: item.sale_price > 0 ? item.sale_price : item.matchedProduct.sale_price
                    });
                } else {
                    await dbIPC.addOrUpdateStockByBarcode(
                        item.barcode,
                        item.name,
                        item.quantity,
                        item.sale_price,
                        item.cost_price,
                        item.unit || 'Adet',
                        item.category || 'Genel'
                    );
                }
            }

            alert('Tüm fatura kalemleri kategorileriyle birlikte veritabanı stoğuna aktarıldı!');
            setParsedItems([]);
            setSelectedFiles([]);
            setFilePreviews([]);
            setStatusMessage('');
        } catch (err: any) {
            alert('Stok aktarımında hata: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return {
        selectedFiles, filePreviews, isAnalyzing, statusMessage,
        parsedItems, setParsedItems, selectedItemIndex, setSelectedItemIndex,
        isSaving, categoryMargins, availableCategories,
        invoiceServiceFee, totalProductQuantity, serviceFeePerUnit,
        loadCategoryData, handleFileSelect, handleRemoveFile,
        handleRunAIAnalysis, handleServiceFeeChange, handleCategoryChange,
        handleItemFieldChange, handleCommitStockToDatabase
    };
}
