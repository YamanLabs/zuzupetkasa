import React from 'react';
import { Key } from '@phosphor-icons/react';

interface SettingsAIProps {
    theme: 'cream' | 'dark';
    settings: Record<string, string>;
    onSettingsChange: (key: string, value: string) => void;
}

export default function SettingsAI({ theme, settings, onSettingsChange }: SettingsAIProps) {
    const isCream = theme === 'cream';

    return (
        <div className={`border rounded-2xl p-4 space-y-3.5 shadow-sm transition-colors duration-150 ${
            isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
        }`}>
            <div className="flex items-center space-x-2 pb-2">
                <Key strokeWidth={2} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className={`font-black text-sm ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                    Google Gemini AI Servis Entegrasyonu
                </h3>
            </div>

            <div className="text-xs space-y-1.5">
                <label className={`block font-black ${isCream ? 'text-slate-950' : 'text-slate-300'}`}>Gemini API Key</label>
                <input
                    type="password"
                    value={settings.gemini_api_key || ''}
                    onChange={(e) => onSettingsChange('gemini_api_key', e.target.value)}
                    placeholder="AI Fatura Analizi İçin Gemini API Key Girin"
                    className={`w-full border rounded-xl px-3 py-2 font-mono font-bold ${
                        isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950 placeholder-slate-500' : 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                    } focus:ring-2 focus:ring-purple-500 focus:outline-none`}
                />
            </div>
        </div>
    );
}
