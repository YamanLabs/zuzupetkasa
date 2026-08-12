"use client";

import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Cpu, ShieldCheck, SlidersHorizontal as Sliders, Gear as Settings } from '@phosphor-icons/react';
import { soundFX } from '@/lib/sound-effects';

import AIUploadGallery from './aistock/AIUploadGallery';
import AIParsedTable from './aistock/AIParsedTable';
import AIRulesModal from './aistock/AIRulesModal';
import AIDoubleCheckModal from './aistock/AIDoubleCheckModal';
import AISettingsModal from './aistock/AISettingsModal';
import AICommitModal from './aistock/AICommitModal';

import { useAIStockContext } from '@/providers/AIStockProvider';

interface AIStockTabProps {
    scannedBarcode?: string;
    onResetScannedBarcode?: () => void;
    theme?: 'cream' | 'dark';
}

export default function AIStockTab({ scannedBarcode, onResetScannedBarcode, theme = 'cream' }: AIStockTabProps) {
    const isCream = theme === 'cream';
    const { rulesState, settingsState, analysisState, doubleCheckState } = useAIStockContext();
    const [showCommitModal, setShowCommitModal] = React.useState(false);

    useEffect(() => {
        if (scannedBarcode && scannedBarcode.trim()) {
            const code = scannedBarcode.trim();
            soundFX.playScan();
            analysisState.handleAssignScannedBarcode(code);
            if (onResetScannedBarcode) onResetScannedBarcode();
        }
    }, [scannedBarcode]);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] p-3 space-y-2.5 overflow-hidden">
            {/* Unified Compact Top Header Row */}
            <div className={`p-2.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2 shadow-sm shrink-0 ${
                isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
            }`}>
                <div className="flex items-center space-x-3">
                    <div className={`p-1.5 border rounded-xl ${
                        isCream ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                    }`}>
                        <Cpu strokeWidth={2} className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className={`text-sm font-black tracking-tight ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                            AI Stok Girişi
                        </h2>
                    </div>

                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

                    {/* Compact File Selector Toolbar */}
                    <AIUploadGallery 
                        theme={theme}
                        selectedFiles={analysisState.selectedFiles}
                        filePreviews={analysisState.filePreviews}
                        isAnalyzing={analysisState.isAnalyzing}
                        statusMessage={analysisState.statusMessage}
                        aiProgress={analysisState.aiProgress}
                        onFileSelect={analysisState.handleFileSelect}
                        onRemoveFile={analysisState.handleRemoveFile}
                        onRunAnalysis={analysisState.handleRunAIAnalysis}
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => { soundFX.playClick(); doubleCheckState.setShowDoubleCheckModal(true); }}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-black text-xs shadow-sm transition active:scale-95 ${
                            isCream ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                    >
                        <ShieldCheck strokeWidth={2} className="h-3.5 w-3.5" />
                        <span>Double-Check & Model</span>
                    </button>

                    <button
                        onClick={() => { soundFX.playClick(); rulesState.setShowRulesModal(true); }}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-black text-xs shadow-sm transition active:scale-95 ${
                            isCream ? 'bg-purple-700 hover:bg-purple-600 text-white' : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                    >
                        <Sliders strokeWidth={2} className="h-3.5 w-3.5" />
                        <span>AI Kuralları</span>
                    </button>

                    <button
                        onClick={() => { soundFX.playClick(); settingsState.setShowSettingsModal(true); }}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-black text-xs shadow-sm transition active:scale-95 ${
                            isCream ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-600 hover:bg-slate-500 text-white'
                        }`}
                    >
                        <Settings strokeWidth={2} className="h-3.5 w-3.5" />
                        <span>AI Ayarları</span>
                    </button>
                </div>
            </div>

            {/* 100% Full Width Ultra-Compact AI Parsed Table Grid */}
            <AIParsedTable 
                theme={theme}
                parsedItems={analysisState.parsedItems}
                selectedItemIndex={analysisState.selectedItemIndex}
                isSaving={analysisState.isSaving}
                availableCategories={analysisState.availableCategories}
                categoryMargins={analysisState.categoryMargins}
                invoiceServiceFee={analysisState.invoiceServiceFee}
                totalProductQuantity={analysisState.totalProductQuantity}
                serviceFeePerUnit={analysisState.serviceFeePerUnit}
                selectedIndices={analysisState.selectedIndices}
                onSelectAll={analysisState.handleSelectAll}
                onToggleSelectIndex={analysisState.handleToggleSelectIndex}
                onBulkCategoryChange={analysisState.handleBulkCategoryChange}
                onBulkRemove={analysisState.handleBulkRemove}
                onSelectItem={analysisState.setSelectedItemIndex}
                onServiceFeeChange={analysisState.handleServiceFeeChange}
                onCategoryChange={analysisState.handleCategoryChange}
                onItemFieldChange={analysisState.handleItemFieldChange}
                onCommitStock={() => setShowCommitModal(true)}
                onRemoveItem={analysisState.handleRemoveParsedItem}
                onToggleMatchedStatus={analysisState.handleToggleMatchedStatus}
            />

            {/* Modals */}
            <AnimatePresence>
                {rulesState.showRulesModal && (
                    <AIRulesModal 
                        key="rules-modal"
                        theme={theme}
                        show={rulesState.showRulesModal}
                        onClose={() => { soundFX.playClick(); rulesState.setShowRulesModal(false); }}
                        customRules={rulesState.customRules}
                        customPromptText={rulesState.customPromptText}
                        newKeyword={rulesState.newKeyword}
                        newTargetCategory={rulesState.newTargetCategory}
                        activeRulesTab={rulesState.activeRulesTab}
                        availableCategories={analysisState.availableCategories}
                        onActiveTabChange={(tab) => { soundFX.playClick(); rulesState.setActiveRulesTab(tab); }}
                        onNewKeywordChange={rulesState.setNewKeyword}
                        onNewTargetCategoryChange={rulesState.setNewTargetCategory}
                        onAddRule={rulesState.handleAddRule}
                        onRemoveRule={rulesState.handleRemoveRule}
                        onCustomPromptTextChange={rulesState.setCustomPromptText}
                        onSaveRules={rulesState.handleSaveRules}
                    />
                )}
                
                {showCommitModal && (
                    <AICommitModal 
                        key="commit-modal"
                        theme={theme}
                        show={showCommitModal}
                        onClose={() => setShowCommitModal(false)}
                        onConfirm={analysisState.handleCommitStockToDatabase}
                        parsedItems={analysisState.parsedItems}
                    />
                )}

                {doubleCheckState.showDoubleCheckModal && (
                    <AIDoubleCheckModal 
                        key="doublecheck-modal"
                        theme={theme}
                        show={doubleCheckState.showDoubleCheckModal}
                        onClose={() => { soundFX.playClick(); doubleCheckState.setShowDoubleCheckModal(false); }}
                        geminiModelName={doubleCheckState.geminiModelName}
                        isCheckingDoubleCheck={doubleCheckState.isCheckingDoubleCheck}
                        doubleCheckItems={doubleCheckState.doubleCheckItems}
                        doubleCheckSearch={doubleCheckState.doubleCheckSearch}
                        doubleCheckFilter={doubleCheckState.doubleCheckFilter}
                        onGeminiModelNameChange={doubleCheckState.setGeminiModelName}
                        onSaveModelName={doubleCheckState.handleSaveModelName}
                        onRunDoubleCheck={() => doubleCheckState.handleRunDoubleCheck(analysisState.selectedFiles)}
                        onSearchChange={doubleCheckState.setDoubleCheckSearch}
                        onFilterChange={(filter) => { soundFX.playClick(); doubleCheckState.setDoubleCheckFilter(filter); }}
                    />
                )}

                {settingsState.showSettingsModal && (
                    <AISettingsModal 
                        key="settings-modal"
                        theme={theme}
                        show={settingsState.showSettingsModal}
                        onClose={() => { soundFX.playClick(); settingsState.setShowSettingsModal(false); }}
                        ensembleMode={settingsState.ensembleMode}
                        geminiModel1={settingsState.geminiModel1}
                        geminiModel2={settingsState.geminiModel2}
                        geminiModel3={settingsState.geminiModel3}
                        geminiMergerModel={settingsState.geminiMergerModel}
                        overwriteInvoicePrices={settingsState.overwriteInvoicePrices}
                        onEnsembleModeChange={settingsState.setEnsembleMode}
                        onGeminiModel1Change={settingsState.setGeminiModel1}
                        onGeminiModel2Change={settingsState.setGeminiModel2}
                        onGeminiModel3Change={settingsState.setGeminiModel3}
                        onGeminiMergerModelChange={settingsState.setGeminiMergerModel}
                        onOverwriteInvoicePricesChange={settingsState.setOverwriteInvoicePrices}
                        onSaveSettings={settingsState.handleSaveSettings}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
