import React from 'react';
import { Store, Eye } from 'lucide-react';

interface SettingsCompanyProps {
    theme: 'cream' | 'dark';
    settings: Record<string, string>;
    onSettingsChange: (key: string, value: string) => void;
    onPreviewReceipt: () => void;
}

export default function SettingsCompany({ theme, settings, onSettingsChange, onPreviewReceipt }: SettingsCompanyProps) {
    const isCream = theme === 'cream';

    return (
        <div className={`border rounded-2xl p-4 space-y-3.5 shadow-sm transition-colors duration-150 ${
            isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
        }`}>
            <div className="flex items-center justify-between pb-2">
                <div className="flex items-center space-x-2">
                    <Store strokeWidth={2} className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                    <h3 className={`font-black text-sm ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                        Mağaza ve Fiş Bilgileri
                    </h3>
                </div>

                <button
                    type="button"
                    onClick={onPreviewReceipt}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 shadow transition active:scale-95"
                >
                    <Eye strokeWidth={2} className="h-4 w-4" />
                    <span>Fiş Önizleme</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                    <label className={`block font-black mb-1 ${isCream ? 'text-slate-950' : 'text-slate-300'}`}>Mağaza Unvanı (Fiş Başlığı)</label>
                    <input
                        type="text"
                        value={settings.company_name || ''}
                        onChange={(e) => onSettingsChange('company_name', e.target.value)}
                        className={`w-full border rounded-xl px-3 py-1.5 font-bold ${
                            isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950 focus:ring-amber-500' : 'bg-slate-950 border-slate-700 text-white focus:ring-blue-500'
                        } focus:ring-2 focus:outline-none`}
                    />
                </div>

                <div>
                    <label className={`block font-black mb-1 ${isCream ? 'text-slate-950' : 'text-slate-300'}`}>Telefon Numarası</label>
                    <input
                        type="text"
                        value={settings.company_phone || ''}
                        onChange={(e) => onSettingsChange('company_phone', e.target.value)}
                        className={`w-full border rounded-xl px-3 py-1.5 font-bold ${
                            isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950 focus:ring-amber-500' : 'bg-slate-950 border-slate-700 text-white focus:ring-blue-500'
                        } focus:ring-2 focus:outline-none`}
                    />
                </div>

                <div className="md:col-span-2">
                    <label className={`block font-black mb-1 ${isCream ? 'text-slate-950' : 'text-slate-300'}`}>Mağaza Adresi</label>
                    <input
                        type="text"
                        value={settings.company_address || ''}
                        onChange={(e) => onSettingsChange('company_address', e.target.value)}
                        className={`w-full border rounded-xl px-3 py-1.5 font-bold ${
                            isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950 focus:ring-amber-500' : 'bg-slate-950 border-slate-700 text-white focus:ring-blue-500'
                        } focus:ring-2 focus:outline-none`}
                    />
                </div>

                <div className="md:col-span-2">
                    <label className={`block font-black mb-1 ${isCream ? 'text-slate-950' : 'text-slate-300'}`}>Fiş Altı Teşekkür Mesajı</label>
                    <input
                        type="text"
                        value={settings.receipt_footer || ''}
                        onChange={(e) => onSettingsChange('receipt_footer', e.target.value)}
                        className={`w-full border rounded-xl px-3 py-1.5 font-bold ${
                            isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950 focus:ring-amber-500' : 'bg-slate-950 border-slate-700 text-white focus:ring-blue-500'
                        } focus:ring-2 focus:outline-none`}
                    />
                </div>
            </div>
        </div>
    );
}
