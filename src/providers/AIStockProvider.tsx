"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useAIRules } from '@/hooks/useAIRules';
import { useAISettings } from '@/hooks/useAISettings';
import { useAIDoubleCheck } from '@/hooks/useAIDoubleCheck';

const AIStockContext = createContext<any>(null);

export const AIStockProvider = ({ children }: { children: React.ReactNode }) => {
    const rulesState = useAIRules();
    const settingsState = useAISettings();
    
    const analysisState = useAIAnalysis({
        customRules: rulesState.customRules,
        overwriteInvoicePrices: settingsState.overwriteInvoicePrices
    });

    const doubleCheckState = useAIDoubleCheck();

    useEffect(() => {
        analysisState.loadCategoryData();
        rulesState.loadRules();
        doubleCheckState.loadSettings();
        settingsState.loadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AIStockContext.Provider value={{ rulesState, settingsState, analysisState, doubleCheckState }}>
            {children}
        </AIStockContext.Provider>
    );
};

export const useAIStockContext = () => useContext(AIStockContext);
