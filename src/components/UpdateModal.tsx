import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadSimple, CheckCircle, Clock, X, CloudArrowDown } from '@phosphor-icons/react';

interface UpdateModalProps {
    latestVersion: string;
    releaseNotes: string;
    releaseDate: string;
    downloadUrl: string;
    assetSize: number;
    onClose: () => void;
}

export default function UpdateModal({
    latestVersion,
    releaseNotes,
    releaseDate,
    downloadUrl,
    assetSize,
    onClose
}: UpdateModalProps) {
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
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-6 w-full max-w-xl text-white relative overflow-hidden"
                >
                    {status === 'idle' && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}

                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-4 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-500/30">
                            <CloudArrowDown size={40} weight="duotone" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                                Yeni Güncelleme Mevcut!
                            </h2>
                            <p className="text-white/60 text-sm mt-1">
                                Sürüm {latestVersion} • {formatDate(releaseDate)}
                            </p>
                        </div>
                    </div>

                    {status === 'idle' && (
                        <>
                            <div className="bg-black/30 rounded-2xl p-4 mb-6 max-h-[200px] overflow-y-auto border border-white/10 scrollbar-thin scrollbar-thumb-white/20">
                                <h3 className="text-sm font-semibold text-white/80 mb-2">Sürüm Notları:</h3>
                                <div className="text-sm text-white/70 whitespace-pre-wrap font-light leading-relaxed">
                                    {releaseNotes || 'Bu sürüm için not girilmemiş.'}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all font-medium border border-white/10"
                                >
                                    Daha Sonra
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-[2] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all shadow-lg font-medium"
                                >
                                    <DownloadSimple size={20} weight="bold" />
                                    Güncellemeyi İndir ve Kur
                                </button>
                            </div>
                        </>
                    )}

                    {status === 'downloading' && (
                        <div className="flex flex-col items-center py-6">
                            <div className="w-full mb-8">
                                <div className="flex justify-between text-sm mb-2 text-white/70">
                                    <span>İndiriliyor...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/10">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ ease: "linear" }}
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                    <div className="text-xs text-white/50 mb-1">Boyut</div>
                                    <div className="font-mono text-sm">{downloaded} / {total}</div>
                                </div>
                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                    <div className="text-xs text-white/50 mb-1">İndirme Hızı</div>
                                    <div className="font-mono text-sm">{speed}</div>
                                </div>
                                <div className="bg-black/20 rounded-xl p-3 border border-white/5 col-span-2 flex items-center gap-2">
                                    <Clock size={16} className="text-blue-300" />
                                    <span className="text-xs text-white/50">Kalan Süre:</span>
                                    <span className="font-mono text-sm">{formatETA(eta)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'ready' && (
                        <div className="flex flex-col items-center py-8 text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-500/30">
                                <CheckCircle size={32} className="text-green-400" weight="fill" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Güncelleme Hazır!</h3>
                            
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-8 text-sm text-green-200 flex flex-col gap-1 w-full text-left">
                                <span className="font-semibold text-green-300">✅ Veritabanı Yedeklendi</span>
                                <span className="text-xs break-all text-green-200/70">{backupPath}</span>
                            </div>

                            <button
                                onClick={handleInstall}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={20} weight="bold" />
                                Kuruluma Hazır - Yeniden Başlat
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center py-8 text-center">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/30 text-red-400 text-2xl font-bold">
                                !
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Güncelleme Başarısız</h3>
                            <p className="text-red-300/80 text-sm mb-6 bg-red-500/10 p-4 rounded-xl border border-red-500/20 w-full">
                                {errorMsg}
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20 transition-all"
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
