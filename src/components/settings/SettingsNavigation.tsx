import React from 'react';
import { Tag, CreditCard, Store, Key, Database } from 'lucide-react';

interface SettingsNavigationProps {
    theme: 'cream' | 'dark';
    activeTab: 'categories' | 'pos' | 'company' | 'ai' | 'system';
    onTabSelect: (tab: 'categories' | 'pos' | 'company' | 'ai' | 'system') => void;
}

export default function SettingsNavigation({ theme, activeTab, onTabSelect }: SettingsNavigationProps) {
    const isCream = theme === 'cream';

    const getTabClass = (tabName: string) => {
        const isActive = activeTab === tabName;
        if (isActive) {
            return isCream
                ? 'bg-amber-600 text-white shadow-md font-black'
                : 'bg-zinc-800 text-white border border-zinc-700 shadow-md font-black text-glow-sm';
        }
        return isCream
            ? 'bg-white border border-[#d8d1c2] text-slate-900 hover:bg-amber-50 font-extrabold'
            : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 font-extrabold';
    };

    return (
        <div className="flex items-center space-x-2 pb-2.5 overflow-x-auto no-scrollbar">
            <button
                type="button"
                onClick={() => onTabSelect('categories')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs transition-all active:scale-95 whitespace-nowrap ${getTabClass('categories')}`}
            >
                <Tag strokeWidth={2} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Kategoriler & Marjlar</span>
            </button>

            <button
                type="button"
                onClick={() => onTabSelect('pos')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs transition-all active:scale-95 whitespace-nowrap ${getTabClass('pos')}`}
            >
                <CreditCard strokeWidth={2} className="h-4 w-4 text-zinc-400 dark:text-zinc-300" />
                <span>POS Cihaz Entegrasyonu</span>
            </button>

            <button
                type="button"
                onClick={() => onTabSelect('company')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs transition-all active:scale-95 whitespace-nowrap ${getTabClass('company')}`}
            >
                <Store strokeWidth={2} className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                <span>Firma & Fiş Bilgileri</span>
            </button>

            <button
                type="button"
                onClick={() => onTabSelect('ai')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs transition-all active:scale-95 whitespace-nowrap ${getTabClass('ai')}`}
            >
                <Key strokeWidth={2} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Gemini AI Entegrasyonu</span>
            </button>

            <button
                type="button"
                onClick={() => onTabSelect('system')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs transition-all active:scale-95 whitespace-nowrap ${getTabClass('system')}`}
            >
                <Database strokeWidth={2} className="h-4 w-4 text-zinc-400 dark:text-zinc-300" />
                <span>Yedekleme & Sistem</span>
            </button>
        </div>
    );
}
