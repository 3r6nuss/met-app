import React, { useRef } from 'react';
import { FileDown, Printer } from 'lucide-react';

/**
 * PDF Export Utility Component
 * Uses browser print functionality with custom CSS for PDF generation
 */

// Print styles that will be injected
const printStyles = `
@media print {
    body * {
        visibility: hidden;
    }
    .pdf-export-content, .pdf-export-content * {
        visibility: visible;
    }
    .pdf-export-content {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        background: white !important;
        color: black !important;
        padding: 40px;
    }
    .no-print {
        display: none !important;
    }
    @page {
        size: A4;
        margin: 20mm;
    }
    table {
        border-collapse: collapse;
        width: 100%;
    }
    th, td {
        border: 1px solid #333;
        padding: 8px;
        text-align: left;
    }
    th {
        background: #f0f0f0 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    h1, h2, h3 {
        color: #333 !important;
    }
}
`;

// Inject print styles once
if (typeof document !== 'undefined') {
    const styleId = 'pdf-export-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = printStyles;
        document.head.appendChild(style);
    }
}

/**
 * PDF Export Button Component
 */
export function PDFExportButton({ onClick, label = "PDF Export", className = "" }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white font-medium transition-colors ${className}`}
        >
            <FileDown className="w-4 h-4" />
            {label}
        </button>
    );
}

/**
 * Print Button Component
 */
export function PrintButton({ onClick, label = "Drucken", className = "" }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-xl text-white font-medium transition-colors ${className}`}
        >
            <Printer className="w-4 h-4" />
            {label}
        </button>
    );
}

/**
 * PDF Export Wrapper Component
 * Wrap content that should be exported as PDF
 */
export function PDFExportWrapper({ children, title, subtitle, logo = true, className = "" }) {
    const contentRef = useRef(null);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div ref={contentRef} className={`pdf-export-content ${className}`}>
            {/* Header - visible in print */}
            <div className="hidden print:block mb-8">
                <div className="flex items-center justify-between border-b-2 border-gray-300 pb-4">
                    <div>
                        {logo && (
                            <div className="text-2xl font-bold text-gray-800">MET System</div>
                        )}
                        {title && <h1 className="text-xl font-bold mt-2">{title}</h1>}
                        {subtitle && <p className="text-gray-600">{subtitle}</p>}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                        <div>Erstellt: {new Date().toLocaleDateString('de-DE')}</div>
                        <div>{new Date().toLocaleTimeString('de-DE')}</div>
                    </div>
                </div>
            </div>

            {children}

            {/* Footer - visible in print */}
            <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
                <p>MET System - Automatisch generierter Bericht</p>
                <p>Seite <span className="page-number"></span></p>
            </div>
        </div>
    );
}

/**
 * Generates a printable payslip / Lohnzettel
 */
export function generatePayslip(employee, period, productions, payouts, totals) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Lohnzettel - ${employee}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
        .info { text-align: right; color: #666; font-size: 14px; }
        .employee-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .employee-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .period { color: #666; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; color: #374151; }
        .amount { text-align: right; font-family: monospace; }
        .total-row { font-weight: bold; background: #f3f4f6; }
        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 30px; }
        .summary-box { padding: 20px; border-radius: 8px; text-align: center; }
        .summary-box.earned { background: #d1fae5; }
        .summary-box.paid { background: #dbeafe; }
        .summary-box.balance { background: ${totals.balance >= 0 ? '#fef3c7' : '#fee2e2'}; }
        .summary-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
        .summary-value { font-size: 24px; font-weight: bold; font-family: monospace; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">MET System</div>
        <div class="info">
            <div>Lohnzettel</div>
            <div>${new Date().toLocaleDateString('de-DE')}</div>
        </div>
    </div>

    <div class="employee-box">
        <div class="employee-name">${employee}</div>
        <div class="period">Zeitraum: ${period}</div>
    </div>

    <h3 style="margin-bottom: 15px;">Produktionen</h3>
    <table>
        <thead>
            <tr>
                <th>Datum</th>
                <th>Produkt</th>
                <th class="amount">Menge</th>
                <th class="amount">Stückpreis</th>
                <th class="amount">Summe</th>
            </tr>
        </thead>
        <tbody>
            ${productions.map(p => `
                <tr>
                    <td>${new Date(p.timestamp).toLocaleDateString('de-DE')}</td>
                    <td>${p.item}</td>
                    <td class="amount">${p.quantity}</td>
                    <td class="amount">${p.unitPrice.toFixed(2)} €</td>
                    <td class="amount">${p.value.toFixed(2)} €</td>
                </tr>
            `).join('')}
            <tr class="total-row">
                <td colspan="4">Summe Produktionen</td>
                <td class="amount">${totals.earned.toFixed(2)} €</td>
            </tr>
        </tbody>
    </table>

    ${payouts.length > 0 ? `
    <h3 style="margin-bottom: 15px;">Auszahlungen</h3>
    <table>
        <thead>
            <tr>
                <th>Datum</th>
                <th class="amount">Betrag</th>
            </tr>
        </thead>
        <tbody>
            ${payouts.map(p => `
                <tr>
                    <td>${new Date(p.timestamp).toLocaleDateString('de-DE')}</td>
                    <td class="amount">${p.amount.toFixed(2)} €</td>
                </tr>
            `).join('')}
            <tr class="total-row">
                <td>Summe Auszahlungen</td>
                <td class="amount">${totals.paid.toFixed(2)} €</td>
            </tr>
        </tbody>
    </table>
    ` : ''}

    <div class="summary">
        <div class="summary-box earned">
            <div class="summary-label">Bruttolohn</div>
            <div class="summary-value">${totals.earned.toFixed(2)} €</div>
        </div>
        <div class="summary-box paid">
            <div class="summary-label">Ausgezahlt</div>
            <div class="summary-value">${totals.paid.toFixed(2)} €</div>
        </div>
        <div class="summary-box balance">
            <div class="summary-label">${totals.balance >= 0 ? 'Offen' : 'Überzahlt'}</div>
            <div class="summary-value">${Math.abs(totals.balance).toFixed(2)} €</div>
        </div>
    </div>

    <div class="footer">
        <p>MET System - Automatisch generierter Lohnzettel</p>
        <p>Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}</p>
    </div>

    <script>window.onload = () => window.print();</script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
}

/**
 * Generate a generic report PDF
 */
export function generateReportPDF(title, subtitle, tableHeaders, tableRows, summary = null) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #6366f1; }
        .title { font-size: 20px; margin-top: 10px; }
        .subtitle { color: #666; font-size: 14px; }
        .info { text-align: right; color: #666; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
        th { background: #f9fafb; font-weight: 600; }
        .amount { text-align: right; font-family: monospace; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 20px; }
        .summary-item { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
        .summary-label { font-size: 11px; color: #666; text-transform: uppercase; }
        .summary-value { font-size: 18px; font-weight: bold; margin-top: 5px; }
        .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 11px; }
        @media print { body { padding: 15px; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="logo">MET System</div>
            <div class="title">${title}</div>
            ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
        </div>
        <div class="info">
            <div>${new Date().toLocaleDateString('de-DE')}</div>
            <div>${new Date().toLocaleTimeString('de-DE')}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                ${tableHeaders.map(h => `<th class="${h.align === 'right' ? 'amount' : ''}">${h.label}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${tableRows.map(row => `
                <tr>
                    ${row.map((cell, i) => `<td class="${tableHeaders[i]?.align === 'right' ? 'amount' : ''}">${cell}</td>`).join('')}
                </tr>
            `).join('')}
        </tbody>
    </table>

    ${summary ? `
    <div class="summary-grid">
        ${summary.map(s => `
            <div class="summary-item">
                <div class="summary-label">${s.label}</div>
                <div class="summary-value" style="color: ${s.color || '#333'}">${s.value}</div>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="footer">
        <p>MET System - Automatisch generierter Bericht</p>
    </div>

    <script>window.onload = () => window.print();</script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
}

export default {
    PDFExportButton,
    PrintButton,
    PDFExportWrapper,
    generatePayslip,
    generateReportPDF
};
