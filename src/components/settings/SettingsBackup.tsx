"use client";

import React, { useState, useEffect } from 'react';
import { Database, CloudArrowUp as HardDriveUpload, ArrowsClockwise as RefreshCw, Clock, ShieldCheck } from '@phosphor-icons/react';
import { dbIPC } from '@/lib/ipc';
import { soundFX } from '@/lib/sound-effects';
import { useModal } from '@/providers/ModalProvider';

interface SettingsBackupProps {
    theme: 'cream' | 'dark';
    settings: Record<string, string>;
    onSettingsChange: (key: string, value: string) => void;
}

export default function SettingsBackup({ theme, settings, onSettingsChange }: SettingsBackupProps) {
    const { showAlert, showConfirm } = useModal();
    const isCream = theme === 'cream';
    const [backups, setBackups] = useState<Array<{ filename: string; filePath: string; sizeBytes: number; mtime: Date }>>([]);
    const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
    const [isRestoring, setIsRestoring] = useState<string | null>(null);
    const [statusMsg, setStatusMsg] = useState<string>('');

    useEffect(() => {
        loadBackupList();
    }, []);

    const loadBackupList = async () => {
        const list = await dbIPC.listBackups();
        setBackups(list);
    };

    const handleBackupNow = async () => {
        soundFX.playClick();
        setIsBackingUp(true);
        setStatusMsg('Yedek alınıyor...');
        try {
            const res = await dbIPC.performBackupNow();
            if (res.success) {
                soundFX.playSuccess();
                setStatusMsg('Yedek başarıyla alındı!');
                await loadBackupList();
            } else {
                setStatusMsg('Yedek alma hatası: ' + (res.error || 'Bilinmeyen hata'));
            }
        } catch (e: any) {
            setStatusMsg('Hata: ' + e.message);
        } finally {
            setIsBackingUp(false);
            setTimeout(() => setStatusMsg(''), 4000);
        }
    };

    const handleRestoreFile = async (filePath: string, filename: string) => {
        if (!(await showConfirm(`${filename} tarihli yedeği geri yüklemek istediğinize emin misiniz? Mevcut verilerin üzerine yazılacaktır!`))) {
            return;
        }

        soundFX.playClick();
        setIsRestoring(filename);
        try {
            const res = await dbIPC.restoreBackupFile(filePath);
            if (res.success) {
                soundFX.playSuccess();
                showAlert('Veritabanı başarıyla eski yedeğe döndürüldü!');
                window.location.reload();
            } else {
                showAlert('Geri yükleme hatası: ' + (res.error || 'Bilinmeyen hata'));
            }
        } catch (e: any) {
            showAlert('Hata: ' + e.message);
        } finally {
            setIsRestoring(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header Status Card */}
            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900 border-slate-800'
            }`}>
                <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-2xl border ${
                        isCream ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                        <Database strokeWidth={2} className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className={`text-base font-black tracking-tight ${isCream ? 'text-slate-900' : 'text-slate-100'}`}>
                            Günlük Veritabanı Yedekleme (Saat 20:00)
                        </h3>
                        <p className={`text-xs font-bold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>
                            Yedekler her gün 20:00'de otomatik olarak <span className="font-mono text-emerald-600 dark:text-emerald-400">Belgelerim/ZuzuKasa_Yedekler</span> klasörüne kaydedilir.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleBackupNow}
                    disabled={isBackingUp}
                    className={`px-4 py-2.5 rounded-xl font-black text-xs shadow-md transition flex items-center space-x-2 active:scale-95 whitespace-nowrap ${
                        isCream ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                >
                    <HardDriveUpload strokeWidth={2} className={`h-4 w-4 ${isBackingUp ? 'animate-spin' : ''}`} />
                    <span>{isBackingUp ? 'Yedek Alınıyor...' : 'Şimdi Yedek Al'}</span>
                </button>
            </div>

            {statusMsg && (
                <div className="p-3 rounded-xl bg-indigo-100 text-indigo-950 border border-indigo-300 text-xs font-black flex items-center space-x-2 animate-pulse">
                    <ShieldCheck strokeWidth={2} className="h-4 w-4 text-indigo-600" />
                    <span>{statusMsg}</span>
                </div>
            )}



            {/* Local Backup History & Restore List */}
            <div className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
                isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900 border-slate-800'
            }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Clock strokeWidth={2} className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <h4 className={`text-sm font-black ${isCream ? 'text-slate-900' : 'text-slate-100'}`}>
                            Kayıtlı Yedek Geçmişi & Geri Yükleme (Restore)
                        </h4>
                    </div>

                    <button
                        type="button"
                        onClick={loadBackupList}
                        className={`p-1.5 rounded-lg border transition ${isCream ? 'bg-slate-100 hover:bg-slate-200' : 'bg-slate-800 hover:bg-slate-700'}`}
                    >
                        <RefreshCw strokeWidth={2} className="h-4 w-4" />
                    </button>
                </div>

                {backups.length === 0 ? (
                    <div className="p-6 text-center text-xs font-bold text-slate-500 border border-dashed rounded-xl">
                        Henüz hiç otomatik veya manuel yedek kaydı bulunmuyor.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {backups.map((b) => {
                            const dateStr = new Date(b.mtime).toLocaleString('tr-TR');
                            const sizeKb = (b.sizeBytes / 1024).toFixed(1);
                            const isThisRestoring = isRestoring === b.filename;

                            return (
                                <div
                                    key={b.filename}
                                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                                        isCream ? 'bg-[#faf8f2] border-[#e2dcd0] hover:border-purple-300' : 'bg-slate-950 border-slate-800 hover:border-purple-600'
                                    }`}
                                >
                                    <div className="flex flex-col space-y-0.5">
                                        <span className="font-mono font-black text-purple-700 dark:text-purple-300">{b.filename}</span>
                                        <span className="text-[11px] font-bold text-slate-500">
                                            Tarih: {dateStr} • Boyut: {sizeKb} KB
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleRestoreFile(b.filePath, b.filename)}
                                        disabled={isThisRestoring}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-black text-[11px] shadow transition active:scale-95 flex items-center space-x-1"
                                    >
                                        <RefreshCw strokeWidth={2} className={`h-3 w-3 ${isThisRestoring ? 'animate-spin' : ''}`} />
                                        <span>Geri Yükle</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
