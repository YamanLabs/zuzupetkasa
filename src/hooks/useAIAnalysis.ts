import { useState, useEffect, useRef } from 'react';
import { aiIPC, dbIPC, Product } from '@/lib/ipc';
import { AICustomRule } from './useAIRules';
import { useModal } from '@/providers/ModalProvider';

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
    originalMatchedProduct?: Product | null;
}

interface UseAIAnalysisProps {
    customRules: AICustomRule[];
    overwriteInvoicePrices?: boolean;
}

export function useAIAnalysis({ customRules, overwriteInvoicePrices = true }: UseAIAnalysisProps) {
    const { showAlert } = useModal();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [aiProgress, setAiProgress] = useState<{ current: number; total: number; message: string } | null>(null);
    const [parsedItems, setParsedItems] = useState<AIParsedItem[]>([]);
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [categoryMargins, setCategoryMargins] = useState<Record<string, { cash: number; card: number }>>({});
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    
    // Bulk operations
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    const [invoiceServiceFee, setInvoiceServiceFee] = useState<number>(0);
    const [totalProductQuantity, setTotalProductQuantity] = useState<number>(0);
    const [serviceFeePerUnit, setServiceFeePerUnit] = useState<number>(0);

    const filePreviewsRef = useRef<string[]>([]);

    const loadCategoryData = async () => {
        const margins = await dbIPC.getCategoryMargins();
        setCategoryMargins(margins);
        setAvailableCategories(Object.keys(margins));
    };

    // BUG-19 FIX: Revoke all objectURLs when component unmounts to prevent memory leak
    useEffect(() => {
        const removeProgressLsn = aiIPC.onAIProgress((data) => {
            setAiProgress({ current: data.currentBatch, total: data.totalBatches, message: data.message });
        });
        
        return () => {
            removeProgressLsn();
            filePreviewsRef.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);

        const previews = files.map(file => URL.createObjectURL(file));
        // BUG-19 FIX: Track all created objectURLs for cleanup
        filePreviewsRef.current = [...filePreviewsRef.current, ...previews];
        setFilePreviews(prev => [...prev, ...previews]);
    };

    const handleRemoveFile = (index: number) => {
        setFilePreviews(prev => {
            URL.revokeObjectURL(prev[index]);
            // BUG-19 FIX: Remove revoked URL from ref tracking
            filePreviewsRef.current = filePreviewsRef.current.filter((_, i) => i !== index);
            return prev.filter((_, i) => i !== index);
        });
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const convertFileToBase64 = async (file: File): Promise<string[]> => {
        // For PDFs: render each page to JPEG via pdfjs and return one entry per page
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            try {
                const pdfjsLib = await import('pdfjs-dist');
                // Use the bundled worker
                pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                    'pdfjs-dist/build/pdf.worker.mjs',
                    import.meta.url
                ).toString();

                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const pageImages: string[] = [];

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    // EFFICIENCY: Cap max width at 800px to limit image tokens.
                    // Claude tiles images at 512px — an 800px-wide page uses ~4 tiles (~4K tokens)
                    // vs scale:2.0 which produces ~1190px-wide pages (~10 tiles, ~10K tokens).
                    const naturalViewport = page.getViewport({ scale: 1 });
                    const targetScale = Math.min(1.5, 800 / naturalViewport.width);
                    const viewport = page.getViewport({ scale: targetScale });

                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d')!;

                    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
                    // EFFICIENCY: quality 0.72 — digital invoice text stays sharp, ~30% smaller than 0.92
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
                    pageImages.push(dataUrl);
                }

                return pageImages;
            } catch (err) {
                console.error('[PDF Render] Failed to render PDF pages, falling back to raw base64:', err);
                // Fallback: send raw — may not work for OpenRouter but keep for Gemini
                return await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve([reader.result as string]);
                    reader.onerror = error => reject(error);
                });
            }
        }

        // Non-PDF: return as single-item array
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve([reader.result as string]);
            reader.onerror = error => reject(error);
        });
    };


    const handleRunAIAnalysis = async () => {
        if (selectedFiles.length === 0) return;
        setIsAnalyzing(true);
        setAiProgress(null);
        setStatusMessage('AI Fatura Analiz Ediyor...');

        try {
            // convertFileToBase64 returns string[] (multiple pages for PDFs).
            // Flatten all files into one flat array of image strings.
            const base64PerFile = await Promise.all(selectedFiles.map(convertFileToBase64));
            const base64List = base64PerFile.flat();
            const result = await aiIPC.analyzeInvoiceImages(base64List);

            setAiProgress(null);

            if (result.success) {
                setStatusMessage(result.message);

                const margins = await dbIPC.getCategoryMargins();
                setCategoryMargins(margins);
                const localCategories = Object.keys(margins);
                setAvailableCategories(localCategories);

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

                    if (cat && localCategories.includes(cat)) {
                        return cat;
                    }
                    
                    if (cat) {
                        return cat;
                    }

                    return localCategories[0] || 'Genel';
                };

                const extractGrammages = (str: string): string[] => {
                    const norm = normalizeName(str).replace(/,/g, '.');
                    const matches = norm.match(/\b(\d+(?:\.\d+)?)\s*(kg|g|gr|gram|ml|l|lt)\b/g);
                    if (!matches) return [];
                    return matches.map(m => {
                        const valMatch = m.match(/\d+(?:\.\d+)?/);
                        const unitMatch = m.match(/[a-z]+/);
                        if (!valMatch || !unitMatch) return m;
                        const val = parseFloat(valMatch[0]);
                        let unit = unitMatch[0];
                        if (unit === 'gr' || unit === 'gram') unit = 'g';
                        if (unit === 'lt') unit = 'l';
                        return `${val}${unit}`;
                    });
                };

                const extractFlavors = (str: string): string[] => {
                    const norm = normalizeName(str);
                    const map: Record<string, string> = {
                        tavuk: 'tavuk', tavuklu: 'tavuk',
                        somon: 'somon', somonlu: 'somon',
                        kuzu: 'kuzu', kuzulu: 'kuzu',
                        ordek: 'ordek', ordekli: 'ordek',
                        hindi: 'hindi', hindili: 'hindi',
                        dana: 'dana', danali: 'dana',
                        sigir: 'sigir', sigirli: 'sigir',
                        balik: 'balik', balikli: 'balik',
                        hamsi: 'hamsi', hamsili: 'hamsi',
                        karides: 'karides', karidesli: 'karides'
                    };
                    const found: string[] = [];
                    const words = norm.split(/\s+/);
                    for (const w of words) {
                        if (map[w] && !found.includes(map[w])) found.push(map[w]);
                    }
                    return found;
                };

                const isValidVariantMatch = (invName: string, dbName: string): boolean => {
                    const invGrams = extractGrammages(invName);
                    const dbGrams = extractGrammages(dbName);
                    if (invGrams.length > 0 && dbGrams.length > 0) {
                        if (invGrams.sort().join(',') !== dbGrams.sort().join(',')) {
                            return false;
                        }
                    }
                    const invFlavors = extractFlavors(invName);
                    const dbFlavors = extractFlavors(dbName);
                    if (invFlavors.length > 0 && dbFlavors.length > 0) {
                        if (invFlavors.sort().join(',') !== dbFlavors.sort().join(',')) {
                            return false;
                        }
                    }
                    return true;
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
                            if (!isValidVariantMatch(itemName, p.name)) continue;

                            const normP = normalizeName(p.name);
                            const pTokens = normP.split(' ').filter(t => t.length > 1);
                            const cnt = tokens.filter(tok => pTokens.includes(tok)).length;
                            if (cnt >= Math.ceil(tokens.length * 0.90) && cnt > maxCnt) {
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
                        // BUG-33 FIX: Override matched_product_id if frontend fuzzy search found a match
                        if (matched) {
                            item.matched_product_id = matched.id;
                        }
                    }
                    const catName = normalizeCategoryName(item.category, item.name);

                    const originalPriceExcl = parseFloat(item.unit_price_excl_tax || item.cost_price || 0) || 0;
                    const vat = parseFloat(item.vat_rate !== undefined ? item.vat_rate : 20) || 20;
                    const priceWithVat = Math.round(originalPriceExcl * (1 + vat / 100) * 100) / 100;
                    
                    let unitCostWithTax = parseFloat(item.unit_cost_with_tax || 0) || priceWithVat;
                    let effectiveCost = parseFloat(item.effective_cost || item.cost_price || 0) || Math.round((unitCostWithTax + feePerUnit) * 100) / 100;
                    
                    const catObj = margins[catName];
                    const cashMargin = typeof catObj === 'object' && catObj !== null ? catObj.cash : (Number(catObj) || 30);
                    
                    let computedSalePrice = parseFloat(item.sale_price || 0);

                    if (!overwriteInvoicePrices && matched) {
                        if (matched.cost_price > 0) {
                            effectiveCost = matched.cost_price;
                            unitCostWithTax = matched.cost_price;
                        }
                        if (matched.sale_price > 0) {
                            computedSalePrice = matched.sale_price;
                        } else if (!computedSalePrice || isNaN(computedSalePrice)) {
                            computedSalePrice = effectiveCost > 0 ? Number((effectiveCost * (1 + cashMargin / 100)).toFixed(2)) : 0;
                        }
                    } else if (!computedSalePrice || isNaN(computedSalePrice)) {
                        computedSalePrice = effectiveCost > 0 ? Number((effectiveCost * (1 + cashMargin / 100)).toFixed(2)) : (matched ? matched.sale_price : 0);
                    }

                    enrichedItems.push({
                        ...item,
                        unit_price_excl_tax: originalPriceExcl,
                        vat_rate: vat,
                        unit_cost_with_tax: unitCostWithTax,
                        effective_cost: effectiveCost,
                        cost_price: effectiveCost,
                        sale_price: isNaN(computedSalePrice) ? 0 : computedSalePrice,
                        category: catName,
                        matchedProduct: matched,
                        originalMatchedProduct: matched
                    });
                }

                setParsedItems(enrichedItems);
                const firstNoBcode = enrichedItems.findIndex(i => !i.barcode);
                if (firstNoBcode !== -1) setSelectedItemIndex(firstNoBcode);
            } else {
                // BUG-08 FIX: Clear old parsed items when analysis fails so stale data is not shown
                setParsedItems([]);
                showAlert('AI Fatura Analiz Hatası: ' + result.message);
            }
        } catch (err: any) {
            showAlert('Analiz hatası: ' + err.message);
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
            const exclTax = item.unit_price_excl_tax || 0;
            const vatRate = item.vat_rate || 20;
            const unitCostWithTax = Math.round(exclTax * (1 + vatRate / 100) * 100) / 100;
            const effectiveCost = Math.round((unitCostWithTax + feePerUnit) * 100) / 100;
            const catObj = categoryMargins[item.category];
            const cashMargin = typeof catObj === 'object' && catObj !== null ? catObj.cash : (Number(catObj) || 30);
            const salePrice = effectiveCost > 0 ? Number((effectiveCost * (1 + cashMargin / 100)).toFixed(2)) : item.sale_price;
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
                ? Number((baseCost * (1 + cashMargin / 100)).toFixed(2)) 
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
                const exclTax = parseFloat(field === 'unit_price_excl_tax' ? value : updated.unit_price_excl_tax) || 0;
                const vatRate = parseFloat((field === 'vat_rate' ? value : updated.vat_rate)?.toString() || '20') || 20;
                const unitCostWithTax = Math.round(exclTax * (1 + vatRate / 100) * 100) / 100;
                const effectiveCost = Math.round((unitCostWithTax + serviceFeePerUnit) * 100) / 100;
                const catObj = categoryMargins[item.category];
                const cashMargin = typeof catObj === 'object' && catObj !== null ? catObj.cash : (Number(catObj) || 30);
                updated.unit_cost_with_tax = unitCostWithTax;
                updated.effective_cost = effectiveCost;
                updated.cost_price = effectiveCost;
                updated.sale_price = effectiveCost > 0 ? Number((effectiveCost * (1 + cashMargin / 100)).toFixed(2)) : item.sale_price;
            }
            return updated;
        }));
    };

    const handleToggleMatchedStatus = (index: number) => {
        setParsedItems(prev => prev.map((item, idx) => {
            if (idx !== index) return item;
            if (item.matchedProduct) {
                return {
                    ...item,
                    matchedProduct: null,
                    originalMatchedProduct: item.originalMatchedProduct || item.matchedProduct
                };
            } else {
                return {
                    ...item,
                    matchedProduct: item.originalMatchedProduct || null
                };
            }
        }));
    };

    const handleRemoveParsedItem = (index: number) => {
        setParsedItems(prev => {
            const newArr = [...prev];
            newArr.splice(index, 1);
            return newArr;
        });
        if (selectedItemIndex === index) {
            setSelectedItemIndex(null);
        } else if (selectedItemIndex !== null && selectedItemIndex > index) {
            setSelectedItemIndex(selectedItemIndex - 1);
        }
        setSelectedIndices(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            const updatedSet = new Set<number>();
            newSet.forEach(i => {
                if (i > index) updatedSet.add(i - 1);
                else updatedSet.add(i);
            });
            return updatedSet;
        });
    };

    const handleToggleSelectIndex = (index: number) => {
        setSelectedIndices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleSelectAll = (selectAll: boolean) => {
        if (selectAll) {
            setSelectedIndices(new Set(parsedItems.map((_, i) => i)));
        } else {
            setSelectedIndices(new Set());
        }
    };

    const handleBulkCategoryChange = (newCat: string) => {
        if (selectedIndices.size === 0) return;
        setParsedItems(prev => {
            const arr = [...prev];
            selectedIndices.forEach(idx => {
                if (arr[idx]) {
                    const catObj = categoryMargins[newCat];
                    const cashMargin = typeof catObj === 'object' && catObj !== null ? catObj.cash : (Number(catObj) || 30);
                    const baseCost = arr[idx].effective_cost || arr[idx].unit_cost_with_tax || arr[idx].cost_price;
                    const computedSalePrice = baseCost > 0 
                        ? Number((baseCost * (1 + cashMargin / 100)).toFixed(2)) 
                        : arr[idx].sale_price;
                    
                    arr[idx] = {
                        ...arr[idx],
                        category: newCat,
                        sale_price: computedSalePrice
                    };
                }
            });
            return arr;
        });
    };

    const handleBulkRemove = () => {
        if (selectedIndices.size === 0) return;
        setParsedItems(prev => {
            return prev.filter((_, i) => !selectedIndices.has(i));
        });
        setSelectedIndices(new Set());
        setSelectedItemIndex(null);
    };

    const handleAssignScannedBarcode = async (barcode: string) => {
        if (parsedItems.length === 0 || !barcode || !barcode.trim()) return;
        const cleanCode = barcode.trim();

        let targetIndex = selectedItemIndex;
        if (targetIndex === null || targetIndex < 0 || targetIndex >= parsedItems.length) {
            targetIndex = parsedItems.findIndex(i => !i.barcode);
            if (targetIndex === -1) targetIndex = 0;
        }

        const dbProducts = await dbIPC.getProducts('', 'Tümü');
        const matched = dbProducts.find(p => p.barcode && p.barcode.trim() === cleanCode) || null;

        const itemName = parsedItems[targetIndex]?.name || 'Ürün';

        // BUG-15 FIX: Calculate next no-barcode index from current state BEFORE setParsedItems
        // This avoids stale closure issues where findIndex would still see the old (un-assigned) items
        const updatedItems = parsedItems.map((item, idx) => {
            if (idx !== targetIndex) return item;
            return {
                ...item,
                barcode: cleanCode,
                matchedProduct: matched || item.matchedProduct,
                originalMatchedProduct: matched || item.originalMatchedProduct
            };
        });

        setParsedItems(updatedItems);

        setStatusMessage(`Barkod [${cleanCode}] "${itemName}" kaleme atandı!`);

        // Find next no-barcode item from the updated array (not stale parsedItems)
        const nextNoBarcodeIndex = updatedItems.findIndex((item, idx) => idx > (targetIndex as number) && !item.barcode);
        if (nextNoBarcodeIndex !== -1) {
            setSelectedItemIndex(nextNoBarcodeIndex);
        } else if ((targetIndex as number) < updatedItems.length - 1) {
            setSelectedItemIndex((targetIndex as number) + 1);
        }
    };

    const handleCommitStockToDatabase = async () => {
        if (parsedItems.length === 0 || isSaving) return;
        setIsSaving(true);

        try {
            for (const item of parsedItems) {
                if (item.matchedProduct) {
                    const catObj = categoryMargins[item.category];
                    const cardMargin = typeof catObj === 'object' && catObj !== null ? catObj.card : (Number(catObj) || 35);
                    const newCardPrice = item.cost_price > 0
                        ? Number((item.cost_price * (1 + cardMargin / 100)).toFixed(2))
                        : (item.matchedProduct.card_price || item.matchedProduct.sale_price);

                    await dbIPC.updateProduct(item.matchedProduct.id, {
                        ...item.matchedProduct,
                        category: item.category || item.matchedProduct.category,
                        stock_quantity: item.matchedProduct.stock_quantity + item.quantity,
                        cost_price: item.cost_price,
                        sale_price: item.sale_price > 0 ? item.sale_price : item.matchedProduct.sale_price,
                        card_price: newCardPrice
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

            showAlert('Tüm fatura kalemleri kategorileriyle birlikte veritabanı stoğuna aktarıldı!');
            setParsedItems([]);
            setSelectedFiles([]);
            setFilePreviews([]);
            setStatusMessage('');
        } catch (err: any) {
            showAlert('Stok aktarımında hata: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return {
        selectedFiles, filePreviews, isAnalyzing, statusMessage, setStatusMessage,
        parsedItems, setParsedItems, selectedItemIndex, setSelectedItemIndex,
        isSaving, categoryMargins, availableCategories,
        invoiceServiceFee, totalProductQuantity, serviceFeePerUnit,
        selectedIndices,
        handleSelectAll,
        handleToggleSelectIndex,
        handleBulkCategoryChange,
        handleBulkRemove,
        loadCategoryData, handleFileSelect, handleRemoveFile,
        handleRunAIAnalysis, handleServiceFeeChange, handleCategoryChange,
        handleItemFieldChange, handleCommitStockToDatabase,
        handleRemoveParsedItem, handleAssignScannedBarcode, handleToggleMatchedStatus,
        aiProgress
    };
}
