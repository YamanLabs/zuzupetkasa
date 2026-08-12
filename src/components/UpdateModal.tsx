import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadSimple, CheckCircle, Clock, X, CloudArrowDown, ShieldCheck, WarningCircle } from '@phosphor-icons/react';

interface UpdateModalProps {
    theme?: 'cream' | 'dark';
    latestVersion: string;
    releaseNotes: string;
    releaseDate: string;
    downloadUrl: string;
    assetSize: number;
    onClose: () => void;
}

export default function UpdateModal({
    theme = 'cream',
    latestVersion,
    releaseNotes,
    releaseDate,
    downloadUrl,
    assetSize,
    onClose
}: UpdateModalProps) {
    const isCream = theme === 'cream';
    const [status, setStatus] = useState<'idle' | 'downloading' | 'ready' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState('');
    const [downloaded, setDownloaded] = useState('');
    const [total, setTotal] = useState('');
    const [eta, setEta] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [backupPath, setBackupPath] = useState('');

    useEffect(() => {
        // @ts-ignore
        if (window.electronAPI && window.electronAPI.updater) {
            // @ts-ignore
            const unsubscribe = window.electronAPI.updater.onProgress((data: any) => {
                setProgress(data.percent);
                setSpeed(data.speedFormatted);
                setDownloaded(data.downloadedFormatted);
                setTotal(data.totalFormatted);
                setEta(data.etaSeconds);
            });
            return () => unsubscribe();
        }
    }, []);

    const formatETA = (seconds: number) => {
        if (seconds < 60) return `${seconds} saniye`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins} dk ${secs} sn`;
    };

    const handleDownload = async () => {
        if (!downloadUrl) {
            // Preview / test mode simulation
            setStatus('downloading');
            let p = 0;
            const interval = setInterval(() => {
                p += 10;
                setProgress(p);
                setSpeed('12.5 MB/s');
                setDownloaded(`${(p * 0.85).toFixed(1)} MB`);
                setTotal('85.0 MB');
                setEta(Math.max(0, Math.round((100 - p) / 10)));
                if (p >= 100) {
                    clearInterval(interval);
                    setBackupPath('C:\\Users\\...\\Desktop\\guncelleme oncesi database yedek\\pos_backup_preview.db');
                    setStatus('ready');
                }
            }, 300);
            return;
        }

        setStatus('downloading');
        try {
            // @ts-ignore
            const result = await window.electronAPI.updater.startDownload(downloadUrl, assetSize);
            if (result.success) {
                setBackupPath(result.backupPath);
                setStatus('ready');
            } else {
                setStatus('error');
                setErrorMsg(result.error || 'İndirme hatası oluştu.');
            }
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || 'Bilinmeyen bir hata oluştu.');
        }
    };

    const handleInstall = async () => {
        if (!downloadUrl) {
            onClose();
            return;
        }
        // @ts-ignore
        await window.electronAPI.updater.install();
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 15 }}
                    className={`border rounded-3xl shadow-2xl p-6 w-full max-w-lg relative overflow-hidden transition-colors ${
                        isCream
                            ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-900'
                            : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                >
                    {status === 'idle' && (
                        <button
                            onClick={onClose}
                            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
                                isCream
                                    ? 'bg-slate-200/60 hover:bg-slate-300/80 text-slate-700'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                        >
                            <X size={18} weight="bold" />
                        </button>
                    )}

                    <div className="flex items-start gap-4 mb-5">
                        <div className={`p-3.5 rounded-2xl border ${
                            isCream
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-blue-950/80 text-blue-400 border-blue-800/80'
                        }`}>
                            <CloudArrowDown size={32} weight="duotone" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-black ${
                                isCream ? 'text-slate-950' : 'text-white'
                            }`}>
                                Yeni Güncelleme Mevcut
                            </h2>
                            <p className={`text-xs font-bold mt-0.5 ${
                                isCream ? 'text-slate-600' : 'text-slate-400'
                            }`}>
                                Sürüm {latestVersion} • {formatDate(releaseDate)}
                            </p>
                        </div>
                    </div>

                    {status === 'idle' && (
                        <>
                            <div className={`rounded-2xl p-4 mb-5 max-h-[180px] overflow-y-auto border text-xs leading-relaxed ${
                                isCream
                                    ? 'bg-white border-[#e2dcd0] text-slate-800'
                                    : 'bg-slate-950 border-slate-800 text-slate-300'
                            }`}>
                                <h3 className={`font-black mb-1.5 ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                                    Sürüm Notları:
                                </h3>
                                <div className="whitespace-pre-wrap font-medium">
                                    {releaseNotes || 'Bu sürüm için detaylı not girilmemiş.'}
                                </div>
                            </div>

                            <div className="flex gap-2.5 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black border transition active:scale-95 ${
                                        isCream
                                            ? 'bg-white hover:bg-slate-100 border-[#d8d1c2] text-slate-800'
                                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                                    }`}
                                >
                                    Daha Sonra
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    className={`flex-[2] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black text-white transition active:scale-95 shadow-md ${
                                        isCream
                                            ? 'bg-amber-600 hover:bg-amber-700'
                                            : 'bg-blue-600 hover:bg-blue-500'
                                    }`}
                                >
                                    <DownloadSimple size={18} weight="bold" />
                                    <span>Güncellemeyi İndir ve Kur</span>
                                </button>
                            </div>
                        </>
                    )}

                    {status === 'downloading' && (
                        <div className="flex flex-col items-center py-4">
                            <div className="w-full mb-6">
                                <div className={`flex justify-between text-xs font-black mb-1.5 ${
                                    isCream ? 'text-slate-800' : 'text-slate-200'
                                }`}>
                                    <span>İndiriliyor...</span>
                                    <span>%{progress}</span>
                                </div>
                                <div className={`h-3 w-full rounded-full overflow-hidden border ${
                                    isCream ? 'bg-slate-200 border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                                }`}>
                                    <motion.div
                                        className={`h-full rounded-full ${
                                            isCream ? 'bg-amber-600' : 'bg-blue-500'
                                        }`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ ease: "linear" }}
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2.5 w-full">
                                <div className={`rounded-xl p-2.5 border ${
                                    isCream ? 'bg-white border-[#e2dcd0]' : 'bg-slate-950 border-slate-800'
                                }`}>
                                    <div className={`text-[10px] font-bold mb-0.5 ${isCream ? 'text-slate-500' : 'text-slate-400'}`}>İndirilen Boyut</div>
                                    <div className={`font-mono text-xs font-black ${isCream ? 'text-slate-900' : 'text-white'}`}>{downloaded || '0 MB'} / {total || '0 MB'}</div>
                                </div>
                                <div className={`rounded-xl p-2.5 border ${
                                    isCream ? 'bg-white border-[#e2dcd0]' : 'bg-slate-950 border-slate-800'
                                }`}>
                                    <div className={`text-[10px] font-bold mb-0.5 ${isCream ? 'text-slate-500' : 'text-slate-400'}`}>İndirme Hızı</div>
                                    <div className={`font-mono text-xs font-black ${isCream ? 'text-slate-900' : 'text-white'}`}>{speed || '0 MB/s'}</div>
                                </div>
                                <div className={`rounded-xl p-2.5 border col-span-2 flex items-center gap-2 ${
                                    isCream ? 'bg-white border-[#e2dcd0]' : 'bg-slate-950 border-slate-800'
                                }`}>
                                    <Clock size={16} className={isCream ? 'text-amber-700' : 'text-blue-400'} weight="bold" />
                                    <span className={`text-[11px] font-bold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>Kalan Süre:</span>
                                    <span className={`font-mono text-xs font-black ${isCream ? 'text-slate-900' : 'text-white'}`}>{formatETA(eta)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'ready' && (
                        <div className="flex flex-col items-center py-4 text-center">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-3 border border-emerald-300">
                                <CheckCircle size={28} weight="fill" />
                            </div>
                            <h3 className={`text-lg font-black mb-1 ${isCream ? 'text-slate-950' : 'text-white'}`}>
                                Güncelleme Hazır
                            </h3>
                            
                            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 mb-6 text-xs text-emerald-950 flex flex-col gap-1 w-full text-left">
                                <div className="flex items-center gap-1.5 font-black text-emerald-800">
                                    <ShieldCheck size={16} weight="bold" className="text-emerald-700" />
                                    <span>Veritabanı Başarıyla Yedeklendi</span>
                                </div>
                                <span className="text-[10px] font-mono break-all text-emerald-800 opacity-90">{backupPath}</span>
                            </div>

                            <button
                                type="button"
                                onClick={handleInstall}
                                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={18} weight="bold" />
                                <span>Kuruluma Hazır - Yeniden Başlat</span>
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center py-4 text-center">
                            <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mb-3 border border-rose-300">
                                <WarningCircle size={28} weight="fill" />
                            </div>
                            <h3 className={`text-lg font-black mb-1 ${isCream ? 'text-slate-950' : 'text-white'}`}>
                                Güncelleme Başarısız
                            </h3>
                            <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 w-full font-bold mb-5">
                                {errorMsg}
                            </p>
                            <button
                                type="button"
                                onClick={onClose}
                                className={`w-full py-2.5 rounded-xl text-xs font-black border transition active:scale-95 ${
                                    isCream
                                        ? 'bg-white hover:bg-slate-100 border-[#d8d1c2] text-slate-800'
                                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                                }`}
                            >
                                Kapat
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
