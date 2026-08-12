"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ModalType = 'alert' | 'confirm' | 'prompt' | null;

interface ModalState {
    type: ModalType;
    message: string;
    resolve?: (value: any) => void;
}

interface ModalContextType {
    showAlert: (message: string) => void;
    showConfirm: (message: string) => Promise<boolean>;
    showPrompt: (message: string) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [modal, setModal] = useState<ModalState>({ type: null, message: '' });
    const [promptInputValue, setPromptInputValue] = useState<string>('');

    // Try to detect theme context. Defaulting to cream if unsure, but we can match dark mode class on document.
    const [isCream, setIsCream] = useState(true);

    React.useEffect(() => {
        // Detect current theme by looking at html/body classes if needed. 
        // Our app handles theme usually in components, but a simple class check on html is fine.
        if (document.documentElement.classList.contains('dark')) {
            setIsCream(false);
        } else {
            setIsCream(true);
        }

        const observer = new MutationObserver(() => {
            setIsCream(!document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const showAlert = (message: string) => {
        setModal({ type: 'alert', message });
    };

    const showConfirm = (message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setModal({ type: 'confirm', message, resolve });
        });
    };

    const showPrompt = (message: string): Promise<string | null> => {
        setPromptInputValue('');
        return new Promise((resolve) => {
            setModal({ type: 'prompt', message, resolve });
        });
    };

    const handleConfirm = (value: boolean) => {
        if (modal.resolve) {
            modal.resolve(value);
        }
        setModal({ type: null, message: '' });
    };

    const handlePrompt = (submit: boolean) => {
        if (modal.resolve) {
            modal.resolve(submit ? promptInputValue : null);
        }
        setModal({ type: null, message: '' });
    };

    const handleAlertClose = () => {
        setModal({ type: null, message: '' });
    };

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
            {children}

            {/* Global Modal Overlay */}
            {modal.type && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`w-full max-w-sm rounded-2xl border shadow-2xl p-5 flex flex-col space-y-4 relative overflow-hidden transition-all transform scale-100 ${
                        isCream ? 'bg-[#faf8f2] border-[#d8d1c2] text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}>
                        <div className="flex flex-col space-y-2 text-center">
                            <h3 className={`text-base font-black tracking-tight ${modal.type === 'confirm' ? 'text-red-500' : (isCream ? 'text-blue-600' : 'text-blue-400')}`}>
                                {modal.type === 'confirm' ? 'DİKKAT' : (modal.type === 'prompt' ? 'GİRDİ BEKLENİYOR' : 'BİLGİLENDİRME')}
                            </h3>
                            <p className={`text-xs font-bold leading-relaxed whitespace-pre-wrap ${isCream ? 'text-slate-800' : 'text-slate-200'}`}>
                                {modal.message}
                            </p>
                        </div>

                        {modal.type === 'prompt' && (
                            <div className="pt-2">
                                <input 
                                    type="text"
                                    autoFocus
                                    value={promptInputValue}
                                    onChange={(e) => setPromptInputValue(e.target.value)}
                                    className={`w-full border rounded-xl px-3 py-2 text-sm font-bold ${
                                        isCream ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                                    } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                                />
                            </div>
                        )}
                        
                        {(modal.type === 'confirm' || modal.type === 'prompt') && (
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => modal.type === 'prompt' ? handlePrompt(false) : handleConfirm(false)}
                                    className={`font-black py-2.5 rounded-xl text-xs transition active:scale-95 ${
                                        isCream ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                    }`}
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => modal.type === 'prompt' ? handlePrompt(true) : handleConfirm(true)}
                                    className="font-black py-2.5 rounded-xl text-xs transition active:scale-95 bg-red-600 hover:bg-red-500 text-white"
                                >
                                    {modal.type === 'prompt' ? 'Onayla' : 'Evet, Onaylıyorum'}
                                </button>
                            </div>
                        )}

                        {modal.type === 'alert' && (
                            <div className="flex justify-center pt-2">
                                <button
                                    type="button"
                                    onClick={handleAlertClose}
                                    className={`w-full font-black py-2.5 rounded-xl text-xs transition active:scale-95 ${
                                        isCream ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                                >
                                    Tamam
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}
