"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundFX } from '@/lib/sound-effects';
import SalesTab from '@/components/SalesTab';
import ProductsTab from '@/components/ProductsTab';
import AIStockTab from '@/components/AIStockTab';
import AlertsTab from '@/components/AlertsTab';
import RefundsTab from '@/components/RefundsTab';
import ReportsTab from '@/components/ReportsTab';
import SettingsTab from '@/components/SettingsTab';
import UpdateModal from '@/components/UpdateModal';
import { appControl, dbIPC } from '@/lib/ipc';
import { BarcodeAuditor } from '@/lib/barcode-scanner';

import { 
    ShoppingCart, Tag, Cpu, WarningOctagon as AlertOctagon, ArrowUUpLeft as Undo2, 
    ChartBar as BarChart3, Gear as Settings, Minus, X, CornersOut as Maximize2 
} from '@phosphor-icons/react';

import { AIStockProvider } from '@/providers/AIStockProvider';

type TabType = 'sales' | 'products' | 'ai_stock' | 'alerts' | 'refunds' | 'reports' | 'settings';

export default function POSPage() {
    const [activeTab, setActiveTab] = useState<TabType>('sales');
    const [scannedBarcode, setScannedBarcode] = useState<string>('');
    const [theme, setTheme] = useState<'cream' | 'dark'>('cream');
    
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    const barcodeAuditor = useRef<BarcodeAuditor | null>(null);

    // BUG-17: memoize to avoid stale closure in keyboard listener
    const handleTabChange = useCallback((tab: TabType) => {
        soundFX.playClick();
        setActiveTab(tab);
    }, []);

    useEffect(() => {
        // Load initial theme from DB settings
        dbIPC.getSettings().then(s => {
            if (s.app_theme) {
                setTheme(s.app_theme as 'cream' | 'dark');
            }
        });

        // Check for updates
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.updater) {
            // @ts-ignore
            window.electronAPI.updater.check().then((res: any) => {
                if (res.hasUpdate) {
                    setUpdateInfo(res);
                    setShowUpdateModal(true);
                }
            });
        }

        const handleUpdateEvent = (e: Event) => {
            const customEvent = e as CustomEvent;
            setUpdateInfo(customEvent.detail);
            setShowUpdateModal(true);
        };
        window.addEventListener('open-update-modal', handleUpdateEvent);

        if (!barcodeAuditor.current) {
            barcodeAuditor.current = new BarcodeAuditor((code) => {
                setScannedBarcode(code);
                soundFX.playScan();
            }, 120); // 120ms threshold for USB converter compatibility
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            // Function Key Shortcuts
            if (e.key === 'F1') { e.preventDefault(); handleTabChange('sales'); return; }
            if (e.key === 'F2') { e.preventDefault(); handleTabChange('products'); return; }
            if (e.key === 'F3') { e.preventDefault(); handleTabChange('ai_stock'); return; }
            if (e.key === 'F4') { e.preventDefault(); handleTabChange('alerts'); return; }
            if (e.key === 'F5') { e.preventDefault(); handleTabChange('refunds'); return; }
            if (e.key === 'F6') { e.preventDefault(); handleTabChange('reports'); return; }
            if (e.key === 'F7') { e.preventDefault(); handleTabChange('settings'); return; }

            // Delegate hardware barcode scanner detection to auditor
            barcodeAuditor.current?.handleKeyDown(e);
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            window.removeEventListener('open-update-modal', handleUpdateEvent);
        };
    }, [handleTabChange]);

    const resetScannedBarcode = () => setScannedBarcode('');

    const navItems: Array<{ id: TabType; label: string; key: string; icon: any }> = [
        { id: 'sales', label: 'Satış Ekranı', key: 'F1', icon: ShoppingCart },
        { id: 'products', label: 'Ürünler', key: 'F2', icon: Tag },
        { id: 'ai_stock', label: 'AI Stok Girişi', key: 'F3', icon: Cpu },
        { id: 'alerts', label: 'Kritik Stok', key: 'F4', icon: AlertOctagon },
        { id: 'refunds', label: 'İadeler & Fişler', key: 'F5', icon: Undo2 },
        { id: 'reports', label: 'Raporlar', key: 'F6', icon: BarChart3 },
        { id: 'settings', label: 'Ayarlar', key: 'F7', icon: Settings },
    ];

    return (
        <AIStockProvider>
            <div className={`flex flex-col h-screen select-none overflow-hidden transition-colors duration-300 ${
                theme === 'cream' ? 'bg-[#f8f6f0] text-slate-800' : 'bg-black text-white'
            }`}>
                {/* WINDOW TOP TITLEBAR & NAV TABS */}
                <header className={`app-drag h-16 border-b flex items-center justify-between px-4 z-40 transition-all duration-300 ${
                    theme === 'cream'
                        ? 'glass-panel-cream border-[#e2dcd0]'
                        : 'glass-panel-dark border-zinc-800'
                }`}>
                    {/* Store Branding Logo */}
                    <div className="flex items-center space-x-3 no-app-drag">
                        <img 
                            src="/xuxu_logo.png" 
                            alt="ZUZU PET Logo" 
                            className={`h-11 w-auto object-contain transition-all py-0.5 ${
                                theme === 'cream'
                                    ? 'mix-blend-multiply opacity-95'
                                    : 'brightness-0 invert opacity-95 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                            }`} 
                            onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                            }}
                        />
                    </div>

                    {/* Hotkey Nav Bar */}
                    <nav className={`flex items-center space-x-1.5 p-1.5 rounded-2xl no-app-drag transition-all duration-300 ${
                        theme === 'cream' ? 'glass-pill-cream' : 'glass-pill-dark'
                    }`}>
                        {navItems.map(item => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabChange(item.id)}
                                    className={`relative px-3.5 py-1.5 rounded-xl text-xs font-extrabold tracking-tight flex items-center space-x-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                                        isActive
                                            ? theme === 'cream' ? 'text-white' : 'text-white text-glow-sm'
                                            : theme === 'cream'
                                                ? 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
                                                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTabBg"
                                            className={`absolute inset-0 rounded-xl shadow-md ${
                                                theme === 'cream' 
                                                    ? 'bg-amber-600' 
                                                    : 'bg-zinc-800 border border-zinc-700 shadow-[0_0_15px_rgba(255,255,255,0.12)]'
                                            }`}
                                            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center space-x-2">
                                        <Icon className="h-4 w-4" weight="bold" />
                                        <span>{item.label}</span>
                                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded transition-colors ${
                                            isActive
                                                ? theme === 'cream' ? 'bg-amber-700/80 text-amber-100' : 'bg-zinc-950 text-zinc-100 border border-zinc-700'
                                                : theme === 'cream' ? 'bg-black/5 text-slate-600' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                                        }`}>
                                            {item.key}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Window Control Buttons */}
                    <div className="flex items-center space-x-1 no-app-drag">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { soundFX.playClick(); appControl.minimize(); }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                theme === 'cream' ? 'text-slate-600 hover:bg-black/5' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        >
                            <Minus weight="bold" className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { soundFX.playClick(); appControl.maximize(); }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                theme === 'cream' ? 'text-slate-600 hover:bg-black/5' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                        >
                            <Maximize2 weight="bold" className="h-3.5 w-3.5" />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { soundFX.playClick(); appControl.close(); }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                theme === 'cream' ? 'text-slate-600 hover:bg-rose-600 hover:text-white' : 'text-zinc-400 hover:text-white hover:bg-rose-600'
                            }`}
                        >
                            <X weight="bold" className="h-4 w-4" />
                        </motion.button>
                    </div>
                </header>

                {/* TAB CONTENTS WITH SMOOTH ANIMATIONS */}
                <main className="flex-1 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.01 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="h-full w-full"
                        >
                            {activeTab === 'sales' && (
                                <SalesTab 
                                    scannedBarcode={scannedBarcode} 
                                    onResetScannedBarcode={resetScannedBarcode} 
                                    theme={theme}
                                />
                            )}
                            {activeTab === 'products' && (
                                <ProductsTab 
                                    scannedBarcode={scannedBarcode} 
                                    onResetScannedBarcode={resetScannedBarcode} 
                                    theme={theme} 
                                />
                            )}
                            {activeTab === 'ai_stock' && <AIStockTab theme={theme} scannedBarcode={scannedBarcode} onResetScannedBarcode={resetScannedBarcode} />}
                            {activeTab === 'alerts' && <AlertsTab theme={theme} />}
                            {activeTab === 'refunds' && <RefundsTab theme={theme} />}
                            {activeTab === 'reports' && <ReportsTab theme={theme} />}
                            {activeTab === 'settings' && <SettingsTab theme={theme} onThemeChange={setTheme} />}
                        </motion.div>
                    </AnimatePresence>
                </main>

                {/* Auto Update Modal */}
                {showUpdateModal && updateInfo && (
                    <UpdateModal
                        theme={theme}
                        latestVersion={updateInfo.latestVersion}
                        releaseNotes={updateInfo.releaseNotes}
                        releaseDate={updateInfo.releaseDate}
                        downloadUrl={updateInfo.downloadUrl}
                        assetSize={updateInfo.assetSize}
                        onClose={() => setShowUpdateModal(false)}
                    />
                )}
            </div>
        </AIStockProvider>
    );
}
