import React from 'react';
import { UploadCloud, FileText, X, Sparkles } from 'lucide-react';

interface AIUploadGalleryProps {
    theme: 'cream' | 'dark';
    selectedFiles: File[];
    filePreviews: string[];
    isAnalyzing: boolean;
    statusMessage: string;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: (index: number) => void;
    onRunAnalysis: () => void;
}

export default function AIUploadGallery({
    theme, selectedFiles, filePreviews, isAnalyzing, statusMessage,
    onFileSelect, onRemoveFile, onRunAnalysis
}: AIUploadGalleryProps) {
    const isCream = theme === 'cream';

    return (
        <div className="flex items-center space-x-2">
            {/* File Upload Button */}
            <label className={`cursor-pointer px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 transition active:scale-95 flex-shrink-0 ${
                isCream
                    ? 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-purple-300 font-extrabold'
                    : 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border-purple-500/40 font-bold'
            }`}>
                <UploadCloud strokeWidth={2} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs">Fatura / PDF Ekle</span>
                <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={onFileSelect}
                    className="hidden"
                />
            </label>

            {/* Selected File Badges (Horizontal Row) */}
            <div className="flex items-center space-x-1.5 overflow-x-auto max-w-md no-scrollbar">
                {filePreviews.map((src, i) => {
                    const file = selectedFiles[i];
                    const isPdf = file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf');
                    
                    return (
                        <div key={i} className={`flex items-center space-x-1.5 px-2 py-1 rounded-xl border text-xs font-bold transition flex-shrink-0 ${
                            isCream ? 'bg-white border-[#d8d1c2] text-slate-950 shadow-sm' : 'bg-slate-900 border-slate-700 text-slate-100'
                        }`}>
                            {isPdf ? (
                                <FileText strokeWidth={2} className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                            ) : (
                                <div className="w-4 h-4 rounded overflow-hidden flex-shrink-0 border border-slate-300">
                                    <img src={src} alt="fatura" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <span className="truncate max-w-[90px] text-[11px] font-mono">
                                {file?.name || `#${i+1}`}
                            </span>
                            <button
                                type="button"
                                onClick={() => onRemoveFile(i)}
                                className="p-0.5 rounded hover:bg-rose-500/20 text-rose-500 transition active:scale-90"
                            >
                                <X strokeWidth={2.5} className="h-3 w-3" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Run Analysis Button & Status */}
            {selectedFiles.length > 0 && !isAnalyzing && (
                <button
                    onClick={onRunAnalysis}
                    className={`font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition active:scale-95 flex-shrink-0 ${
                        isCream ? 'bg-purple-700 hover:bg-purple-600 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'
                    }`}
                >
                    <Sparkles strokeWidth={2} className="h-3.5 w-3.5" />
                    <span>Faturayı AI ile Tara</span>
                </button>
            )}

            {statusMessage && (
                <div className={`text-xs px-2.5 py-1 rounded-xl font-extrabold flex items-center space-x-1 flex-shrink-0 ${
                    isCream ? 'bg-purple-100 text-purple-950 border border-purple-300' : 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                }`}>
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                    <span className="text-[11px]">{statusMessage}</span>
                </div>
            )}
        </div>
    );
}
