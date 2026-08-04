import { useState, useEffect, useRef } from 'react';
import { dbIPC, Product } from '@/lib/ipc';
import { soundFX } from '@/lib/sound-effects';

export function useProducts(scannedBarcode?: string, onResetScannedBarcode?: () => void) {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [categoryMargins, setCategoryMargins] = useState<Record<string, { cash: number; card: number }>>({});
    const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterOnlyNoBarcode, setFilterOnlyNoBarcode] = useState<boolean>(false);

    // Selected Row Navigation & Instant Barcode Assignment State
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [toastNotice, setToastNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToastNotice({ message, type });
        setTimeout(() => setToastNotice(null), 4000);
    };

    // Modal State & Ref
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        barcode: '',
        name: '',
        category: 'Genel',
        cost_price: '' as string | number,
        sale_price: '' as string | number,
        stock_quantity: '' as string | number,
        min_stock_alert: 5 as string | number,
        unit: 'Adet',
        vat_rate: 20
    });

    useEffect(() => {
        loadData();
    }, [searchQuery, selectedCategory, filterOnlyNoBarcode]);

    useEffect(() => {
        if (showModal) {
            const timer = setTimeout(() => nameInputRef.current?.focus(), 80);
            return () => clearTimeout(timer);
        }
    }, [showModal]);

    // Keyboard Arrow Navigation (ArrowUp / ArrowDown)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showModal) return;
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                // If focus is in search input, allow ArrowDown to enter table navigation
                if (e.key !== 'ArrowDown') return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (products.length === 0) return;
                setSelectedProductId(prevId => {
                    const idx = products.findIndex(p => p.id === prevId);
                    const nextIdx = idx < products.length - 1 ? idx + 1 : 0;
                    return products[nextIdx].id;
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (products.length === 0) return;
                setSelectedProductId(prevId => {
                    const idx = products.findIndex(p => p.id === prevId);
                    const prevIdx = idx > 0 ? idx - 1 : products.length - 1;
                    return products[prevIdx].id;
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showModal, products]);

    // Handle Barcode Scanned Event
    useEffect(() => {
        if (scannedBarcode) {
            const code = scannedBarcode.trim();
            if (showModal) {
                setFormData(prev => ({ ...prev, barcode: code }));
            } else if (selectedProductId !== null) {
                const targetProduct = products.find(p => p.id === selectedProductId);
                if (targetProduct) {
                    assignBarcodeInstantly(targetProduct, code);
                } else {
                    setSearchQuery(code);
                }
            } else if (products.length > 0) {
                assignBarcodeInstantly(products[0], code);
            } else {
                setSearchQuery(code);
            }

            if (onResetScannedBarcode) onResetScannedBarcode();
        }
    }, [scannedBarcode]);

    const loadData = async () => {
        let prods = await dbIPC.getProducts(searchQuery, selectedCategory);
        if (filterOnlyNoBarcode) {
            prods = prods.filter(p => !p.barcode);
        }
        const cats = await dbIPC.getCategories();
        const margins = await dbIPC.getCategoryMargins();
        setProducts(prods);
        setCategories(cats);
        setCategoryMargins(margins);

        if (prods.length > 0) {
            setSelectedProductId(prev => {
                if (prev && prods.some(p => p.id === prev)) return prev;
                return prods[0].id;
            });
        } else {
            setSelectedProductId(null);
        }
    };

    const autoCalculateSalePrice = (costVal: string | number, catName: string) => {
        const cost = parseFloat(costVal ? costVal.toString() : '0') || 0;
        if (cost <= 0) return '';
        const marginObj = categoryMargins[catName];
        const cashMargin = marginObj ? (typeof marginObj === 'object' ? marginObj.cash : Number(marginObj)) : 30;
        return Math.round(cost * (1 + cashMargin / 100));
    };

    const handleCostPriceChange = (val: string) => {
        const newSale = autoCalculateSalePrice(val, formData.category);
        setFormData(prev => ({
            ...prev,
            cost_price: val,
            sale_price: newSale !== '' ? newSale : prev.sale_price
        }));
    };

    const handleCategoryChange = (catVal: string) => {
        const newSale = autoCalculateSalePrice(formData.cost_price, catVal);
        setFormData(prev => ({
            ...prev,
            category: catVal,
            sale_price: newSale !== '' ? newSale : prev.sale_price
        }));
    };

    const assignBarcodeInstantly = async (product: Product, newBarcode: string) => {
        try {
            const existing = await dbIPC.getProductByBarcode(newBarcode);
            if (existing && existing.id !== product.id) {
                soundFX.playError();
                showToast(`Bu barkod [${newBarcode}] ZATEN "${existing.name}" ürünümüzde var!`, 'error');
                return;
            }

            await dbIPC.updateProduct(product.id, {
                ...product,
                barcode: newBarcode
            });

            soundFX.playSuccess();
            showToast(`"${product.name}" ürününe [${newBarcode}] barkodu atandı!`, 'success');

            const currentIdx = products.findIndex(p => p.id === product.id);
            if (currentIdx >= 0 && currentIdx < products.length - 1) {
                setSelectedProductId(products[currentIdx + 1].id);
            }

            await loadData();
        } catch (err: any) {
            soundFX.playError();
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                showToast(`Bu barkod [${newBarcode}] ZATEN başka bir üründe kayıtlı!`, 'error');
            } else {
                showToast(`Barkod atanırken hata: ${err.message}`, 'error');
            }
        }
    };

    const handleOpenAddModal = () => {
        setEditingProduct(null);
        setFormData({
            barcode: '',
            name: '',
            category: 'Genel',
            cost_price: '',
            sale_price: '',
            stock_quantity: '',
            min_stock_alert: 5,
            unit: 'Adet',
            vat_rate: 20
        });
        setShowModal(true);
    };

    const handleOpenEditModal = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            barcode: product.barcode || '',
            name: product.name,
            category: product.category,
            cost_price: product.cost_price !== undefined && product.cost_price !== null ? product.cost_price : '',
            sale_price: product.sale_price !== undefined && product.sale_price !== null ? product.sale_price : '',
            stock_quantity: product.stock_quantity !== undefined && product.stock_quantity !== null ? product.stock_quantity : '',
            min_stock_alert: product.min_stock_alert !== undefined ? product.min_stock_alert : 5,
            unit: product.unit,
            vat_rate: product.vat_rate || 20
        });
        setShowModal(true);
    };

    const handleDeleteProduct = async (id: number) => {
        if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
            await dbIPC.deleteProduct(id);
            loadData();
        }
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const costPrice = parseFloat(formData.cost_price.toString()) || 0;
        const salePrice = parseFloat(formData.sale_price.toString()) || 0;
        const stockQty = parseInt(formData.stock_quantity.toString()) || 0;
        const minAlert = parseInt(formData.min_stock_alert.toString()) || 5;
        const bcodeClean = formData.barcode.trim() || null;

        if (!formData.name.trim()) {
            alert('Lütfen ürün adını girin.');
            return;
        }
        if (salePrice <= 0) {
            alert('Lütfen geçerli bir satış fiyatı girin.');
            return;
        }

        if (bcodeClean) {
            const existing = await dbIPC.getProductByBarcode(bcodeClean);
            if (existing && (!editingProduct || existing.id !== editingProduct.id)) {
                soundFX.playError();
                showToast(`Bu barkod [${bcodeClean}] ZATEN "${existing.name}" ürünümüzde var!`, 'error');
                return;
            }
        }

        try {
            if (editingProduct) {
                await dbIPC.updateProduct(editingProduct.id, {
                    barcode: bcodeClean,
                    name: formData.name.trim(),
                    category: formData.category,
                    cost_price: costPrice,
                    sale_price: salePrice,
                    stock_quantity: stockQty,
                    min_stock_alert: minAlert,
                    unit: formData.unit,
                    vat_rate: formData.vat_rate
                });
                showToast(`"${formData.name.trim()}" ürünü güncellendi!`, 'success');
            } else {
                await dbIPC.addProduct({
                    barcode: bcodeClean,
                    name: formData.name.trim(),
                    category: formData.category,
                    cost_price: costPrice,
                    sale_price: salePrice,
                    stock_quantity: stockQty,
                    min_stock_alert: minAlert,
                    unit: formData.unit,
                    vat_rate: formData.vat_rate
                });
                showToast(`Yeni ürün "${formData.name.trim()}" eklendi!`, 'success');
            }

            setShowModal(false);
            loadData();
        } catch (err: any) {
            soundFX.playError();
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                showToast(`Bu barkod [${bcodeClean}] ZATEN başka bir üründe var!`, 'error');
            } else {
                showToast(`Hata: ${err.message}`, 'error');
            }
        }
    };

    return {
        products, categories, categoryMargins,
        selectedCategory, setSelectedCategory,
        searchQuery, setSearchQuery,
        filterOnlyNoBarcode, setFilterOnlyNoBarcode,
        selectedProductId, setSelectedProductId,
        toastNotice, showModal, setShowModal,
        editingProduct, formData, setFormData,
        nameInputRef, handleCostPriceChange, handleCategoryChange,
        handleOpenAddModal, handleOpenEditModal, handleDeleteProduct, handleSaveProduct,
        unbarcodedCount: products.filter(p => !p.barcode).length
    };
}
