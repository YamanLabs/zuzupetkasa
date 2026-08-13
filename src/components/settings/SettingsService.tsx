import React from 'react';
import { DownloadSimple as Download, UploadSimple as Upload, ShieldWarning as ShieldAlert, Eye } from '@phosphor-icons/react';
import { useModal } from '@/providers/ModalProvider';

interface SettingsServiceProps {
    theme: 'cream' | 'dark';
    onExportBarcodes: () => void;
    onImportBarcodes: () => void;
}

export default function SettingsService({ theme, onExportBarcodes, onImportBarcodes }: SettingsServiceProps) {
    const { showAlert } = useModal();
    const isCream = theme === 'cream';
    const [currentVersion, setCurrentVersion] = React.useState<string>('3.7.0');

    React.useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            if ((window as any).electronAPI.updater?.getVersion) {
                (window as any).electronAPI.updater.getVersion().then((v: string) => {
                    if (v) setCurrentVersion(v);
                });
            } else if ((window as any).electronAPI.updater?.check) {
                (window as any).electronAPI.updater.check().then((res: any) => {
                    if (res?.currentVersion) setCurrentVersion(res.currentVersion);
                });
            }
        }
    }, []);

    return (
        <div className="space-y-4">
            {/* Auto Update / Güncelleme Section */}
            <div className={`border rounded-2xl p-4 space-y-3.5 shadow-sm transition-colors duration-150 ${
                isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
            }`}>
                <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center space-x-2">
                        <Download strokeWidth={2} className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                        <h3 className={`font-black text-sm ${isCream ? 'text-slate-950' : 'text-slate-100 text-glow-sm'}`}>
                            Yazılım Güncellemeleri
                        </h3>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-black border flex items-center space-x-1.5 ${
                        isCream 
                            ? 'bg-blue-50 border-blue-200 text-blue-800' 
                            : 'bg-blue-950/60 border-blue-800/80 text-blue-300'
                    }`}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Mevcut Sürüm: v{currentVersion}</span>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 w-full sm:w-1/2">
                        ZUZU PET Kasa POS yazılımının yeni sürümünü kontrol edebilir veya güncelleme ekranının tasarımını önizleyebilirsiniz.
                    </p>
                    <div className="flex gap-2 w-full sm:w-1/2">
                        <button
                            type="button"
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent('open-update-modal', {
                                    detail: {
                                        latestVersion: 'v1.0.4-preview',
                                        releaseNotes: '- Tema Uyumu: Krem & Siyah Tema entegre edildi.\n- Performans: Hızlı ve hafif arayüz sağlandı.\n- Güvenlik: Otomatik veritabanı yedeği altyapısı aktif.',
                                        releaseDate: new Date().toISOString(),
                                        downloadUrl: '',
                                        assetSize: 85000000
                                    }
                                }));
                            }}
                            className={`flex-1 font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 border transition active:scale-95 ${
                                isCream
                                    ? 'bg-[#faf8f2] hover:bg-slate-100 border-[#d8d1c2] text-slate-800'
                                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                            }`}
                        >
                            <Eye strokeWidth={2} className="h-4 w-4" />
                            <span>Önizleme</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                // @ts-ignore
                                if (window.electronAPI && window.electronAPI.updater) {
                                    // @ts-ignore
                                    window.electronAPI.updater.check().then((res: any) => {
                                        if (!res.hasUpdate) {
                                            showAlert(res.error ? `Hata: ${res.error}` : 'Zaten en güncel sürümü kullanıyorsunuz.');
                                        } else {
                                            window.dispatchEvent(new CustomEvent('open-update-modal', { detail: res }));
                                        }
                                    });
                                }
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition active:scale-95"
                        >
                            <Download strokeWidth={2} className="h-4 w-4" />
                            <span>Güncellemeleri Kontrol Et</span>
                        </button>
                    </div>
                </div>
            </div>

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
