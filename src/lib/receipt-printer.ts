export interface ReceiptData {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    receiptNo: string;
    dateStr: string;
    logoUrl?: string;
    items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
    taxTotal: number;
    paymentMethod: string;
    paymentAmount1?: number;
    paymentMethod2?: string | null;
    paymentAmount2?: number;
    paidAmount?: number;
    changeAmount?: number;
    footerMsg: string;
}

export function generateReceiptHTML(data: ReceiptData): string {
    const logoHtml = data.logoUrl
        ? `<div style="text-align: center; margin-bottom: 8px;"><img src="${data.logoUrl}" style="max-height: 60px; max-width: 160px; margin: 0 auto; display: block; object-fit: contain;" /></div>`
        : '';

    const itemsHtml = data.items.map(item => `
        <tr>
            <td style="padding: 2px 0;">${item.name}</td>
            <td style="text-align: center; padding: 2px 0;">${item.quantity}</td>
            <td style="text-align: right; padding: 2px 0;">${item.unitPrice.toFixed(2)} TL</td>
            <td style="text-align: right; padding: 2px 0; font-weight: bold;">${item.totalPrice.toFixed(2)} TL</td>
        </tr>
    `).join('');

    return `
        <div style="font-family: 'Courier New', Courier, monospace; width: 100%; max-width: 300px; margin: 0 auto; color: #000; font-size: 12px; padding: 8px;">
            ${logoHtml}
            <div style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 4px;">
                ${data.storeName.toUpperCase()}
            </div>
            ${data.storeAddress ? `<div style="text-align: center; font-size: 10px;">${data.storeAddress}</div>` : ''}
            ${data.storePhone ? `<div style="text-align: center; font-size: 10px;">Tel: ${data.storePhone}</div>` : ''}
            <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
            
            <div style="font-size: 11px; display: flex; justify-content: space-between;">
                <span>Fiş No: <b>${data.receiptNo}</b></span>
                <span>${data.dateStr}</span>
            </div>
            <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>

            <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 1px solid #000;">
                        <th style="text-align: left; padding: 2px 0;">Ürün</th>
                        <th style="text-align: center; padding: 2px 0;">Ad.</th>
                        <th style="text-align: right; padding: 2px 0;">Fiyat</th>
                        <th style="text-align: right; padding: 2px 0;">Tutar</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>

            <table style="width: 100%; font-size: 11px;">
                <tr>
                    <td>Ara Toplam:</td>
                    <td style="text-align: right;">${data.subtotal.toFixed(2)} TL</td>
                </tr>
                ${data.discount > 0 ? `
                <tr>
                    <td>İndirim:</td>
                    <td style="text-align: right; color: red;">-${data.discount.toFixed(2)} TL</td>
                </tr>` : ''}
                <tr>
                    <td>KDV Dahil Toplam:</td>
                    <td style="text-align: right; font-weight: bold; font-size: 13px;">${data.total.toFixed(2)} TL</td>
                </tr>
                <tr>
                    <td style="font-size: 10px; color: #555;">Hesaplanan KDV:</td>
                    <td style="text-align: right; font-size: 10px; color: #555;">${data.taxTotal.toFixed(2)} TL</td>
                </tr>
            </table>

            <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>

            <div style="font-size: 11px;">
                <div>Ödeme Tipi: <b>${data.paymentMethod}</b> ${data.paymentMethod2 ? `+ ${data.paymentMethod2}` : ''}</div>
                ${data.paidAmount ? `<div>Alınan Nakit: ${data.paidAmount.toFixed(2)} TL</div>` : ''}
                ${data.changeAmount !== undefined && data.changeAmount > 0 ? `<div style="font-weight: bold;">Para Üstü: ${data.changeAmount.toFixed(2)} TL</div>` : ''}
            </div>

            <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>

            <div style="text-align: center; font-size: 10px; font-weight: bold; margin-top: 6px;">
                ${data.footerMsg}
            </div>
        </div>
    `;
}
