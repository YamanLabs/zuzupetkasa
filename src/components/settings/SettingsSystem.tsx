import { Palette, Sun, Moon, SpeakerHigh as Volume2, SpeakerX as VolumeX, Database, DownloadSimple as Download, UploadSimple as Upload, Trash as Trash2, Eye } from '@phosphor-icons/react';

interface SettingsSystemProps {
    theme: 'cream' | 'dark';
    settings: Record<string, string>;
    soundEnabled: boolean;
    onThemeSelect: (theme: 'cream' | 'dark') => void;
    onToggleSound: (enabled: boolean) => void;
    onClearDatabase: () => void;
    onExportBackup: () => void;
    onImportBackup: () => void;
}

export default function SettingsSystem({
    theme, settings, soundEnabled, onThemeSelect, onToggleSound, onClearDatabase, onExportBackup, onImportBackup
}: SettingsSystemProps) {
    const isCream = theme === 'cream';

    return (
        <div className="space-y-4">
            {/* Theme Selection Card */}
            <div className={`border rounded-2xl p-4 space-y-3.5 shadow-sm transition-colors duration-150 ${
                isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
            }`}>
                <div className="flex items-center space-x-2 pb-2">
                    <Palette strokeWidth={2} className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                    <h3 className={`font-black text-sm ${isCream ? 'text-slate-950' : 'text-slate-100 text-glow-sm'}`}>
                        Program Teması (Görünüm)
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => onThemeSelect('cream')}
                        className={`p-3.5 rounded-xl border flex items-center space-x-3 transition active:scale-95 text-left ${
                            settings.app_theme === 'cream'
                                ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-black shadow-sm'
                                : isCream
                                    ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-800 hover:border-amber-400'
                                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-500'
                        }`}
                    >
                        <div className="p-2 rounded-lg bg-amber-600 text-white shadow-sm">
                            <Sun strokeWidth={2} className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-xs font-black">Krem / Premium White (Açık Tema)</div>
                            <div className="text-[11px] font-bold opacity-75 mt-0.5">Yumuşak krem tonları ve yüksek kontrastlı modern tasarım</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => onThemeSelect('dark')}
                        className={`p-3.5 rounded-xl border flex items-center space-x-3 transition active:scale-95 text-left ${
                            settings.app_theme === 'dark'
                                ? 'bg-zinc-800 border-zinc-700 text-white font-black shadow-sm text-glow-sm'
                                : isCream
                                    ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-800 hover:border-zinc-400'
                                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-zinc-500'
                        }`}
                    >
                        <div className="p-2 rounded-lg bg-zinc-900 text-zinc-100 border border-zinc-700 shadow-sm">
                            <Moon strokeWidth={2} className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-xs font-black">OLED Pitch Black (Pure Siyah Tema)</div>
                            <div className="text-[11px] font-bold opacity-75 mt-0.5">Sıfır mavi tonu, tam siyah ve gri detaylar</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Sound FX Card */}
            <div className={`border rounded-2xl p-4 space-y-3.5 shadow-sm transition-colors duration-150 ${
                isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
            }`}>
                <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center space-x-2">
                        <Volume2 strokeWidth={2} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <h3 className={`font-black text-sm ${isCream ? 'text-slate-950' : 'text-slate-100 text-glow-sm'}`}>
                            Sesli Geri Bildirim ve Efektler
                        </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => onToggleSound(!soundEnabled)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition active:scale-95 ${
                                soundEnabled
                                    ? 'bg-emerald-700 text-white shadow-sm'
                                    : 'bg-slate-700 text-slate-300'
                            }`}
                        >
                            {soundEnabled ? <Volume2 strokeWidth={2} className="h-4 w-4" /> : <VolumeX strokeWidth={2} className="h-4 w-4" />}
                            <span>{soundEnabled ? 'Sesler Açık' : 'Sesler Kapalı'}</span>
                        </button>
                    </div>
                </div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Satış tamamlandığında kristal çan sesi, barkod okutulduğunda biip ve buton tıklama ses efektleri aktiftir.
                </div>
            </div>

            {/* Database Backup & Maintenance Section */}
            <div className={`border rounded-2xl p-4 space-y-3.5 shadow-sm transition-colors duration-150 ${
                isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
            }`}>
                <div className="flex items-center space-x-2 pb-2">
                    <Database strokeWidth={2} className="h-4 w-4 text-zinc-400 dark:text-zinc-300" />
                    <h3 className={`font-black text-sm ${isCream ? 'text-slate-950' : 'text-slate-100 text-glow-sm'}`}>
                        Veritabanı Yedekleme ve Taşıma (Farklı PC Aktarımı)
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
                    {/* Yedekle / Dışa Aktar */}
                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 ${
                        isCream ? 'bg-[#faf8f2] border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                    }`}>
                        <div>
                            <div className="flex items-center space-x-1.5 font-black text-xs mb-1">
                                <Download strokeWidth={2} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span className={isCream ? 'text-slate-950' : 'text-slate-100'}>Veritabanı Yedekle (Dışa Aktar)</span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Mevcut tüm ürünlerinizi ve satışlarınızı .db dosyası olarak bilgisayarınıza indirir.</p>
                        </div>
                        <button
                            type="button"
                            onClick={onExportBackup}
                            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition active:scale-95"
                        >
                            <Download strokeWidth={2} className="h-4 w-4" />
                            <span>Yedek Dosyası Oluştur</span>
                        </button>
                    </div>

                    {/* Geri Yükle / İçe Aktar */}
                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 ${
                        isCream ? 'bg-[#faf8f2] border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                    }`}>
                        <div>
                            <div className="flex items-center space-x-1.5 font-black text-xs mb-1">
                                <Upload strokeWidth={2} className="h-4 w-4 text-zinc-400 dark:text-zinc-300" />
                                <span className={isCream ? 'text-slate-950' : 'text-slate-100'}>Yedekten Geri Yükle (İçe Aktar)</span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Önceden aldığınız .db yedek dosyasını sisteme geri yükler.</p>
                        </div>
                        <button
                            type="button"
                            onClick={onImportBackup}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 border border-zinc-700 shadow transition active:scale-95"
                        >
                            <Upload strokeWidth={2} className="h-4 w-4" />
                            <span>Yedek Dosyası Yükle</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-rose-500/40 bg-rose-500/5 p-4 rounded-2xl space-y-2.5 shadow-sm">
                <div className="flex items-center space-x-2">
                    <Trash2 strokeWidth={2} className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <h3 className="font-black text-sm text-rose-700 dark:text-rose-400">Tehlikeli Bölge</h3>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-400 font-extrabold">Tüm veritabanı kayıtları (Ürünler, Satış Geçmişi vb.) geri döndürülemez şekilde silinecektir.</p>
                <button
                    type="button"
                    onClick={onClearDatabase}
                    className="bg-rose-700 hover:bg-rose-600 text-white font-black py-2 px-4 rounded-xl text-xs flex items-center space-x-1.5 shadow transition active:scale-95"
                >
                    <Trash2 strokeWidth={2} className="h-4 w-4" />
                    <span>Veritabanını Tamamen Sıfırla</span>
                </button>
            </div>
        </div>
    );
}
