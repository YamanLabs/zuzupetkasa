import React from 'react';
import { CreditCard, Link2 } from 'lucide-react';

interface SettingsPOSProps {
    theme: 'cream' | 'dark';
    settings: Record<string, string>;
    onSettingsChange: (key: string, value: string) => void;
    onOpenPairingModal: () => void;
}

export default function SettingsPOS({ theme, settings, onSettingsChange, onOpenPairingModal }: SettingsPOSProps) {
    const isCream = theme === 'cream';

    return (
        <div className={`border rounded-2xl p-4 space-y-3.5 shadow-sm transition-colors duration-150 ${
            isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
        }`}>
            <div className="flex items-center space-x-2 pb-2">
                <CreditCard strokeWidth={2} className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className={`font-black text-sm ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                    Fiziksel POS Cihazı Sinyal Entegrasyonu (GMP3 Protokolü)
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                    <label className={`block font-black mb-1 ${isCream ? 'text-slate-950' : 'text-slate-300'}`}>Bağlantı Modu</label>
                    <select
                        value={settings.pos_connection_type || 'ethernet'}
                        onChange={(e) => onSettingsChange('pos_connection_type', e.target.value)}
                        className={`w-full border rounded-xl px-3 py-1.5 font-bold ${
                            isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-white'
                        } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                    >
                        <option value="ethernet">Ethernet / TCP Soket (Ağ)</option>
                        <option value="serial">Seri Port (COM / USB)</option>
                    </select>
                </div>

                <div>
                    <label className={`block font-black mb-1 ${isCream ? 'text-slate-950' : 'text-slate-300'}`}>POS Cihazı IP Adresi</label>
                    <input
                        type="text"
                        placeholder="192.168.1.100"
                        value={settings.pos_ip_address || ''}
                        onChange={(e) => onSettingsChange('pos_ip_address', e.target.value)}
                        className={`w-full border rounded-xl px-3 py-1.5 font-mono font-bold ${
                            isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-white'
                        } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                    />
                </div>

                <div>
                    <label className={`block font-black mb-1 ${isCream ? 'text-slate-950' : 'text-slate-300'}`}>ECR/Veri Portu</label>
                    <input
                        type="number"
                        value={settings.pos_network_port || '59000'}
                        onChange={(e) => onSettingsChange('pos_network_port', e.target.value)}
                        className={`w-full border rounded-xl px-3 py-1.5 font-mono font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-950' : 'bg-slate-950 border-slate-700 text-white'
                        } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                    />
                </div>
            </div>

            <div className="pt-1">
                <button
                    type="button"
                    onClick={onOpenPairingModal}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition active:scale-95"
                >
                    <Link2 strokeWidth={2} className="h-4 w-4" />
                    <span>inPOS GMP3 Cihaz Eşleme Uygulamasını Aç</span>
                </button>
            </div>
        </div>
    );
}
