import React from 'react';
import { DownloadSimple as Download, UploadSimple as Upload, ShieldWarning as ShieldAlert } from '@phosphor-icons/react';

interface SettingsServiceProps {
    theme: 'cream' | 'dark';
    onExportBarcodes: () => void;
    onImportBarcodes: () => void;
}

export default function SettingsService({ theme, onExportBarcodes, onImportBarcodes }: SettingsServiceProps) {
    const isCream = theme === 'cream';

    return (
        <div className="space-y-4">
            <div className={`p-4 rounded-2xl border ${isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'}`}>
                <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-2 rounded-xl ${isCream ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'}`}>
                        <ShieldAlert strokeWidth={2} className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className={`font-black text-lg ${isCream ? 'text-slate-900' : 'text-slate-100'}`}>Servis Ayarları</h2>
                        <p className={`text-xs font-bold ${isCream ? 'text-slate-500' : 'text-slate-400'}`}>Teknik destek ve operasyonel işlemler.</p>
                    </div>
                </div>

                <div className={`p-4 rounded-xl border ${isCream ? 'bg-[#faf8f2] border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="flex flex-col space-y-4">
                        <div>
                            <h3 className={`font-black text-sm mb-1 ${isCream ? 'text-slate-900' : 'text-white'}`}>Barkod Yedekleme ve Kurtarma</h3>
                            <p className={`text-xs font-medium mb-4 ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>
                                Ürünlerin barkodlarını dışa aktarabilir ve isim eşleşmesi (Aynı ürün adı) üzerinden tekrar içe aktarabilirsiniz.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={onExportBarcodes}
                                className={`flex items-center justify-center space-x-2 p-3 rounded-xl border-2 border-dashed transition active:scale-95 ${
                                    isCream 
                                        ? 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100' 
                                        : 'border-blue-800 bg-blue-900/20 text-blue-300 hover:bg-blue-900/40'
                                }`}
                            >
                                <Download strokeWidth={2.5} className="h-5 w-5" />
                                <span className="font-black text-sm">Barkodları Dışa Aktar (JSON)</span>
                            </button>

                            <button
                                onClick={onImportBarcodes}
                                className={`flex items-center justify-center space-x-2 p-3 rounded-xl border-2 border-dashed transition active:scale-95 ${
                                    isCream 
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' 
                                        : 'border-emerald-800 bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/40'
                                }`}
                            >
                                <Upload strokeWidth={2.5} className="h-5 w-5" />
                                <span className="font-black text-sm">Barkodları İçe Aktar (İsimden Eşleştir)</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
