"use client";

import React, { useState, useEffect } from 'react';
import { dbIPC, printerIPC, DailySummary, EndOfDayReport } from '@/lib/ipc';
import { generateReceiptHTML } from '@/lib/receipt-printer';
import { ChartBar as BarChart3, TrendUp as TrendingUp, CurrencyDollar as DollarSign, CreditCard, Money as Banknote, Calendar, Printer, Trophy as Award, FileCsv as FileSpreadsheet } from '@phosphor-icons/react';
import { useModal } from '@/providers/ModalProvider';

interface ReportsTabProps {
    theme?: 'cream' | 'dark';
}

export default function ReportsTab({ theme = 'cream' }: ReportsTabProps) {
    const { showAlert } = useModal();
    const isCream = theme === 'cream';
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().substring(0, 10));
    const [summary, setSummary] = useState<DailySummary | null>(null);
    const [zReport, setZReport] = useState<EndOfDayReport | null>(null);
    const [isPrinting, setIsPrinting] = useState<boolean>(false);

    useEffect(() => {
        loadReport();
    }, [selectedDate]);

    const loadReport = async () => {
        const [sum, zRep] = await Promise.all([
            dbIPC.getDailySummary(selectedDate),
            dbIPC.getEndOfDayReport(selectedDate)
        ]);
        setSummary(sum);
        setZReport(zRep);
    };

    const handlePrintZReport = async () => {
        if (!summary || !zReport || isPrinting) return;
        setIsPrinting(true);
        try {
            const settings = await dbIPC.getSettings();

            const itemsHtml = zReport.items_sold.map(item => `
                <tr>
                    <td style="padding: 2px 0;">${item.name}</td>
                    <td style="text-align: center;">${item.total_qty}</td>
                    <td style="text-align: right; font-weight: bold;">${item.total_revenue.toFixed(2)} TL</td>
                </tr>
            `).join('');

            const fullZHtml = `
                <div style="font-family: 'Courier New', Courier, monospace; width: 100%; max-width: 300px; margin: 0 auto; color: #000; font-size: 11px;">
                    <div style="text-align: center; font-size: 14px; font-weight: bold;">
                        GUN SONU (Z) RAPORU
                    </div>
                    <div style="text-align: center; font-size: 10px;">${settings.company_name || 'ZUZU PET'}</div>
                    <div style="text-align: center; font-size: 10px;">Tarih: ${selectedDate}</div>
                    <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>

                    <table style="width: 100%;">
                        <tr><td>Toplam Satis Adedi:</td><td style="text-align: right; font-weight: bold;">${summary.total_sales_count}</td></tr>
                        <tr><td>Toplam Ciro:</td><td style="text-align: right; font-weight: bold;">${summary.total_turnover.toFixed(2)} TL</td></tr>
                        <tr><td>Nakit Toplam:</td><td style="text-align: right;">${summary.cash_turnover.toFixed(2)} TL</td></tr>
                        <tr><td>Kredi Kartı Toplam:</td><td style="text-align: right;">${summary.card_turnover.toFixed(2)} TL</td></tr>
                        <tr><td>Hesaplanan KDV:</td><td style="text-align: right;">${summary.total_tax.toFixed(2)} TL</td></tr>
                        <tr style="border-top: 1px solid #000;"><td>Tahmini Net Kar:</td><td style="text-align: right; font-weight: bold;">${summary.net_profit.toFixed(2)} TL</td></tr>
                    </table>

                    <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
                    <div style="font-weight: bold; text-align: center; margin-bottom: 4px;">SATILAN URUNLER</div>
                    <table style="width: 100%; font-size: 10px;">
                        <thead>
                            <tr style="border-bottom: 1px solid #000;">
                                <th style="text-align: left;">Urun</th>
                                <th style="text-align: center;">Ad.</th>
                                <th style="text-align: right;">Tutar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
                    <div style="text-align: center; font-size: 9px;">Rapor Oluşturulma: ${new Date().toLocaleString('tr-TR')}</div>
                </div>
            `;

            await printerIPC.printThermalReceipt(fullZHtml);
        } catch (err: any) {
            console.error('Z Report print error:', err);
            // BUG-13 FIX: Show error to user instead of silently failing
            showAlert(`Z Raporu yazdırma hatası: ${err.message || 'Bilinmeyen hata'}. Termal yazıcı bağlantısını kontrol edin.`);
        } finally {
            setIsPrinting(false);
        }
    };

    const handleExportCSV = () => {
        if (!summary || !zReport) return;
        
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        
        // Header
        csvContent += `Tarih,${selectedDate}\n`;
        csvContent += `Toplam Satis Adedi,${summary.total_sales_count}\n`;
        csvContent += `Toplam Ciro,${summary.total_turnover.toFixed(2)} TL\n`;
        csvContent += `Nakit Toplam,${summary.cash_turnover.toFixed(2)} TL\n`;
        csvContent += `Kredi Karti Toplam,${summary.card_turnover.toFixed(2)} TL\n`;
        csvContent += `Hesaplanan KDV,${summary.total_tax.toFixed(2)} TL\n`;
        csvContent += `Tahmini Net Kar,${summary.net_profit.toFixed(2)} TL\n\n`;
        
        // Items Header
        csvContent += "Urun Adi,Satilan Adet,Toplam Tutar (TL)\n";
        
        // Items Data
        zReport.items_sold.forEach(item => {
            const name = item.name.replace(/"/g, '""'); // escape quotes
            csvContent += `"${name}",${item.total_qty},${item.total_revenue.toFixed(2)}\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `kasa_rapor_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] p-4 space-y-3 overflow-hidden">
            {/* Header & Date / Z-Report Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                    <div className={`p-1.5 border rounded-xl ${
                        isCream ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                    }`}>
                        <BarChart3 strokeWidth={2} className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className={`text-lg font-black tracking-tight ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                            Raporlar ve Analizler
                        </h2>
                        <p className={`text-[11px] font-bold ${isCream ? 'text-slate-600' : 'text-slate-400'}`}>
                            Günlük ciro, net kâr hesabı ve ürün satış istatistikleri
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {/* Date Selector */}
                    <div className={`flex items-center space-x-2 text-xs border rounded-xl px-3 py-1.5 shadow-sm ${
                        isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900 border-slate-800'
                    }`}>
                        <Calendar strokeWidth={2} className={`h-4 w-4 ${isCream ? 'text-amber-800' : 'text-blue-400'}`} />
                        <span className={`font-bold ${isCream ? 'text-slate-700' : 'text-slate-300'}`}>Tarih:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className={`bg-transparent font-black focus:outline-none ${isCream ? 'text-slate-950' : 'text-slate-100'}`}
                        />
                    </div>

                    {/* CSV Export Button */}
                    <button
                        onClick={handleExportCSV}
                        disabled={!summary || !zReport}
                        className={`font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition active:scale-95 disabled:opacity-50 ${
                            isCream ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                        title="CSV Olarak Dışa Aktar"
                    >
                        <FileSpreadsheet strokeWidth={2} className="h-4 w-4" />
                        <span>CSV Aktar</span>
                    </button>

                    {/* Print Z-Report Button */}
                    <button
                        onClick={handlePrintZReport}
                        disabled={!summary || !zReport || isPrinting}
                        className={`font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition active:scale-95 disabled:opacity-50 ${
                            isCream ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                    >
                        <Printer strokeWidth={2} className="h-4 w-4" />
                        <span>{isPrinting ? 'Yazdırılıyor...' : 'Gün Sonu Z Raporu Yazdır'}</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Toplam Günlük Ciro */}
                    <div className={`border rounded-2xl p-3.5 flex flex-col justify-between shadow-sm transition-colors duration-150 ${
                        isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
                    }`}>
                        <div className="flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400">
                            <span>Toplam Günlük Ciro</span>
                            <div className="p-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                <DollarSign strokeWidth={2.5} className="h-4 w-4" />
                            </div>
                        </div>
                        <div className={`text-xl font-black font-mono mt-1.5 ${isCream ? 'text-emerald-950' : 'text-emerald-400'}`}>
                            {summary.total_turnover.toFixed(2)} TL
                        </div>
                        <div className="text-[11px] font-bold mt-1 text-slate-600 dark:text-slate-400">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-950 font-extrabold border border-emerald-300">
                                {summary.total_sales_count} Satış Fişi
                            </span>
                        </div>
                    </div>

                    {/* Tahmini Net Kâr */}
                    <div className={`border rounded-2xl p-3.5 flex flex-col justify-between shadow-sm transition-colors duration-150 ${
                        isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
                    }`}>
                        <div className="flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400">
                            <span>Tahmini Net Kâr</span>
                            <div className={`p-1 rounded-lg ${isCream ? 'bg-amber-500/15 text-amber-800' : 'bg-blue-500/15 text-blue-400'}`}>
                                <TrendingUp strokeWidth={2.5} className="h-4 w-4" />
                            </div>
                        </div>
                        <div className={`text-xl font-black font-mono mt-1.5 ${isCream ? 'text-amber-900' : 'text-blue-400'}`}>
                            {summary.net_profit.toFixed(2)} TL
                        </div>
                        <div className="text-[11px] font-bold mt-1 text-slate-600 dark:text-slate-400">
                            Maliyet: <span className="font-mono font-black">{summary.total_cost.toFixed(2)} TL</span>
                        </div>
                    </div>

                    {/* Nakit Ciro */}
                    <div className={`border rounded-2xl p-3.5 flex flex-col justify-between shadow-sm transition-colors duration-150 ${
                        isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
                    }`}>
                        <div className="flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400">
                            <span>Nakit Ciro</span>
                            <div className="p-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-400">
                                <Banknote strokeWidth={2.5} className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-xl font-black font-mono mt-1.5 text-amber-800 dark:text-amber-400">
                            {summary.cash_turnover.toFixed(2)} TL
                        </div>
                        <div className="text-[11px] font-bold mt-1 text-slate-600 dark:text-slate-400">Fiziki Kasa Girişi</div>
                    </div>

                    {/* Kredi Kartı Ciro */}
                    <div className={`border rounded-2xl p-3.5 flex flex-col justify-between shadow-sm transition-colors duration-150 ${
                        isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
                    }`}>
                        <div className="flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400">
                            <span>Kredi Kartı Ciro</span>
                            <div className="p-1 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-400">
                                <CreditCard strokeWidth={2.5} className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="text-xl font-black font-mono mt-1.5 text-purple-900 dark:text-purple-400">
                            {summary.card_turnover.toFixed(2)} TL
                        </div>
                        <div className="text-[11px] font-bold mt-1 text-slate-600 dark:text-slate-400">POS Banka Akışı</div>
                    </div>
                </div>
            )}

            {/* Best Selling Products Table */}
            <div className={`flex-1 border rounded-2xl p-3 flex flex-col space-y-2.5 overflow-hidden shadow-sm transition-colors duration-150 ${
                isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-900/90 border-slate-800'
            }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Award strokeWidth={2} className={`h-4 w-4 ${isCream ? 'text-amber-800' : 'text-blue-400'}`} />
                        <h3 className={`font-black text-sm ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>
                            En Çok Satılan Ürünler Listesi
                        </h3>
                    </div>
                    {zReport?.items_sold && zReport.items_sold.length > 0 && (
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                            isCream ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                        }`}>
                            {zReport.items_sold.length} Çeşit Ürün Satıldı
                        </span>
                    )}
                </div>

                <div className={`flex-1 overflow-y-auto border rounded-xl shadow-sm ${
                    isCream ? 'bg-white border-[#d8d1c2]' : 'bg-slate-950 border-slate-800'
                }`}>
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className={`font-black uppercase tracking-wider sticky top-0 border-b text-[11px] z-10 ${
                            isCream ? 'bg-[#f4f0e6] border-[#d8d1c2] text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}>
                            <tr>
                                <th className="px-3 py-2 w-12 text-center">Derece</th>
                                <th className="px-3 py-2">Ürün Adı</th>
                                <th className="px-3 py-2 font-mono">Barkod</th>
                                <th className="px-3 py-2 text-center">Satılan Miktar</th>
                                <th className="px-3 py-2 text-right">Toplam Ciro</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y text-xs ${isCream ? 'divide-[#ece6da]' : 'divide-slate-800/80'}`}>
                            {zReport?.items_sold.map((item, idx) => (
                                <tr key={idx} className={`transition-colors duration-75 ${
                                    isCream ? 'hover:bg-amber-500/10 text-slate-900 font-extrabold' : 'hover:bg-slate-800/70 text-slate-100 font-extrabold'
                                }`}>
                                    <td className="px-3 py-1.5 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                            idx === 0
                                                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                                : idx === 1
                                                    ? 'bg-slate-200 text-slate-950 border border-slate-300'
                                                    : idx === 2
                                                        ? 'bg-orange-100 text-orange-950 border border-orange-300'
                                                        : 'text-slate-500'
                                        }`}>
                                            #{idx + 1}
                                        </span>
                                    </td>
                                    <td className={`px-3 py-1.5 font-extrabold ${isCream ? 'text-slate-950' : 'text-slate-100'}`}>{item.name}</td>
                                    <td className="px-3 py-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 font-bold">{item.barcode || '—'}</td>
                                    <td className={`px-3 py-1.5 text-center font-black ${isCream ? 'text-slate-950' : 'text-blue-400'}`}>{item.total_qty} Adet</td>
                                    <td className={`px-3 py-1.5 text-right font-black font-mono ${isCream ? 'text-emerald-800' : 'text-emerald-400'}`}>{item.total_revenue.toFixed(2)} TL</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {(!zReport || zReport.items_sold.length === 0) && (
                        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                            <FileSpreadsheet strokeWidth={1.5} className="h-10 w-10 opacity-30 text-amber-600" />
                            <p className="font-extrabold text-xs text-slate-600 dark:text-slate-400">Seçili tarihte herhangi bir ürün satışı yapılmadı.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
