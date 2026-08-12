import { useState, useRef, useEffect } from 'react';
import { dbIPC, Product } from '@/lib/ipc';
import { soundFX } from '@/lib/sound-effects';

export function useProductSearch(onProductSelected: (product: Product) => void) {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedQuery, setDebouncedQuery] = useState<string>('');
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectedRowRef = useRef<HTMLTableRowElement>(null);

    // IMP-25: Arama Debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 150); // 150ms gecikme
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        if (products.length > 0) {
            setSelectedIndex(0);
        } else {
            setSelectedIndex(-1);
        }
    }, [products]);

    useEffect(() => {
        if (selectedRowRef.current) {
            selectedRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedIndex]);

    const loadData = async () => {
        const [cats] = await Promise.all([
            dbIPC.getCategories()
        ]);
        setCategories(cats);

        if (debouncedQuery.trim() === '' && selectedCategory === 'Tümü') {
            setProducts([]);
        } else {
            const prods = await dbIPC.getProducts(debouncedQuery, selectedCategory);
            setProducts(prods);
        }
    };

    // Reload data when debounced query or category changes
    useEffect(() => {
        loadData();
    }, [debouncedQuery, selectedCategory]);

    const handleBarcodeScanned = async (code: string) => {
        const cleanCode = code.trim();
        if (!cleanCode) return;

        setSearchQuery('');
        if (searchInputRef.current) searchInputRef.current.value = '';

        const prod = await dbIPC.getProductByBarcode(cleanCode);
        if (prod) {
            onProductSelected(prod);
        } else {
            soundFX.playError();
        }
    };

    const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            if (products.length === 0) return;
            e.preventDefault();
            setSelectedIndex(prev => (prev < products.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            if (products.length === 0) return;
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : products.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchQuery.trim();
            setSearchQuery('');
            if (searchInputRef.current) searchInputRef.current.value = '';

            if (query) {
                const prodByBarcode = await dbIPC.getProductByBarcode(query);
                if (prodByBarcode) {
                    onProductSelected(prodByBarcode);
                    return;
                }
            }

            if (products.length > 0) {
                const targetItem = products[selectedIndex >= 0 && selectedIndex < products.length ? selectedIndex : 0];
                if (targetItem) {
                    onProductSelected(targetItem);
                }
            }
        }
    };

    return {
        products, categories, selectedCategory, setSelectedCategory,
        searchQuery, setSearchQuery, selectedIndex, setSelectedIndex,
        searchInputRef, selectedRowRef,
        loadData, handleBarcodeScanned, handleSearchKeyDown
    };
}
