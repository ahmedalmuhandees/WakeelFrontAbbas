import type { SalesInvoicePrintSettingsDto } from '../types';
import { DEFAULT_INVOICE_PRINT_FOOTER_LEGAL } from '../types';
import { resolveInvoiceLogoUrl } from './activationReceiptPrintHtml';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** تحويل مبلغ صحيح (دينار) إلى نص عربي تقريبي للفاتورة — يصلح للمبالغ الشائعة */
export function amountToArabicIqdWords(n: number): string {
  const v = Math.floor(Math.abs(n));
  if (v === 0) return 'صفر دينار عراقي';

  const w1 = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const w11 = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const w10 = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const w100 = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  const under100 = (x: number): string => {
    if (x < 10) return w1[x];
    if (x < 20) return w11[x - 10];
    const t = Math.floor(x / 10);
    const o = x % 10;
    if (o === 0) return w10[t];
    return `${w1[o]} و${w10[t]}`;
  };

  const under1000 = (x: number): string => {
    if (x < 100) return under100(x);
    const h = Math.floor(x / 100);
    const r = x % 100;
    const head = w100[h];
    if (r === 0) return head;
    return `${head} و${under100(r)}`;
  };

  const parts: string[] = [];
  let rest = v;

  const m = Math.floor(rest / 1000000);
  rest %= 1000000;
  if (m > 0) {
    parts.push(m === 1 ? 'مليون' : m === 2 ? 'مليونان' : `${under1000(m)} مليون`);
  }

  const th = Math.floor(rest / 1000);
  rest %= 1000;
  if (th > 0) {
    if (th === 1) parts.push('ألف');
    else if (th === 2) parts.push('ألفان');
    else if (th >= 3 && th <= 10) parts.push(`${under1000(th)} آلاف`);
    else parts.push(`${under1000(th)} ألف`);
  }

  if (rest > 0) parts.push(under1000(rest));

  return `${parts.join(' و')} دينار عراقي فقط لا غير`;
}

export type SalesMaterialInvoicePrintRow = {
  serial: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitLabel: string;
  unitPrice: number;
  lineTotal: number;
};

export type SalesMaterialInvoicePrintInput = {
  /** رقم الفاتورة من الباكند */
  invoiceNumber?: string;
  customerName: string;
  customerAddress?: string;
  invoiceTypeLabel: string;
  dateStr: string;
  rows: SalesMaterialInvoicePrintRow[];
  /** إجمالي قبل خصم */
  grossTotal: number;
  netTotal: number;
  amountPaid: number;
  previousBalance?: number;
  /** المتبقي على العميل بعد الفاتورة (دين المواد) */
  materialDebt?: number;
  /** نص ملاحظات الفاتورة (يُعرض أسفل الصفحة) */
  notesText?: string;
};

function col(
  settings: SalesInvoicePrintSettingsDto,
  key: keyof SalesInvoicePrintSettingsDto,
  fallback: string
): string {
  const v = settings[key];
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function safeHex(s: string | null | undefined, fallback: string): string {
  const t = (s ?? '').trim();
  return HEX_COLOR.test(t) ? t : fallback;
}

function clampNum(n: number | null | undefined, lo: number, hi: number, def: number): number {
  if (n == null || !Number.isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, n));
}

/** قيم مظهر الطباعة بعد دمج الإعدادات مع الافتراضيات (للفاتورة ومعاينة الإعدادات) */
export function resolveSalesMaterialPrintTheme(settings: SalesInvoicePrintSettingsDto) {
  const accent = safeHex(settings.accentColor, '#c00000');
  const text = safeHex(settings.textColor, '#111111');
  const border = safeHex(settings.borderColor, '#333333');
  const headerText = safeHex(settings.tableHeaderTextColor, '#ffffff');
  const invoiceNum = safeHex(settings.invoiceNumberColor, accent);
  const pageSize = (settings.pageSize ?? 'A4').trim().toUpperCase() === 'A5' ? 'A5' : 'A4';
  const mt = clampNum(settings.marginTopMm, 4, 25, 10);
  const mr = clampNum(settings.marginRightMm, 4, 25, 10);
  const mb = clampNum(settings.marginBottomMm, 4, 25, 10);
  const ml = clampNum(settings.marginLeftMm, 4, 25, 10);
  const baseFs = clampNum(settings.baseFontSizePx, 9, 16, 11);
  const companyFs = clampNum(settings.companyNameFontSizePx, 14, 36, 22);
  const logoH = clampNum(settings.logoMaxHeightPx, 40, 200, 104);
  const logoW = clampNum(settings.logoMaxWidthPx, 80, 400, 220);
  const logoRight =
    (settings.headerLogoPosition ?? 'left').trim().toLowerCase() === 'right' ||
    (settings.headerLogoPosition ?? '').trim().toLowerCase() === 'يمين';
  const logoGrayscale = settings.logoPrintGrayscale !== false;
  const showFooterLegal = settings.showFooterLegal !== false;

  return {
    pageSize,
    marginTopMm: mt,
    marginRightMm: mr,
    marginBottomMm: mb,
    marginLeftMm: ml,
    accent,
    text,
    border,
    headerText,
    invoiceNum,
    baseFs,
    companyFs,
    logoH,
    logoW,
    logoRight,
    logoGrayscale,
    showFooterLegal,
  };
}

/**
 * فاتورة بيع مواد — تصميم A4 قريب من النموذج التجاري (رأس، جدول بوردر، ملخص مالي).
 */
export function buildSalesMaterialInvoicePrintHtml(
  settings: SalesInvoicePrintSettingsDto,
  data: SalesMaterialInvoicePrintInput,
  opts: {
    appOrigin: string;
    apiBaseUrl?: string;
    formatNumber: (n: number, o?: { suffix?: string }) => string;
  }
): string {
  const logoSrc = resolveInvoiceLogoUrl(settings.logoUrl, {
    appOrigin: opts.appOrigin,
    apiBaseUrl: opts.apiBaseUrl,
  });

  const title = settings.invoiceTitle?.trim() || 'فاتورة بيع';
  const companyName = settings.companyName?.trim() || '';
  const companyAddress = settings.companyAddress?.trim() || '';
  const companyPhones = settings.companyPhones?.trim() || '';
  const footerLegal = settings.footerLegalText?.trim() || DEFAULT_INVOICE_PRINT_FOOTER_LEGAL;

  const L = {
    serial: col(settings, 'columnSerialLabel', 'ت'),
    productCode: 'رمز المنتج',
    productName: col(settings, 'columnProductNameLabel', 'اسم المنتج'),
    qty: col(settings, 'columnQuantityLabel', 'العدد'),
    unit: 'الوحدة',
    price: col(settings, 'columnMaterialPriceLabel', 'السعر'),
    lineTotal: col(settings, 'columnLineTotalLabel', 'الإجمالي'),
    sumTotal: col(settings, 'summaryTotalAmountLabel', 'المبلغ الإجمالي'),
    sumNet: 'المبلغ الصافي',
    sumPaid: col(settings, 'summaryPaidAmountLabel', 'المبلغ الواصل'),
    sumRem: col(settings, 'summaryRemainingAmountLabel', 'المبلغ المتبقي'),
  };

  const invNo =
    String(
      data.invoiceNumber ??
        (data as SalesMaterialInvoicePrintInput & { InvoiceNumber?: string }).InvoiceNumber ??
        ''
    ).trim() || '—';
  const verbal = amountToArabicIqdWords(Math.floor(data.netTotal));

  const rowsHtml = data.rows
    .map(
      (r) => `
    <tr>
      <td>${r.serial}</td>
      <td>${escapeHtml(r.productCode || '—')}</td>
      <td>${escapeHtml(r.productName)}</td>
      <td>${escapeHtml(String(r.quantity))}</td>
      <td>${escapeHtml(r.unitLabel)}</td>
      <td>${opts.formatNumber(r.unitPrice, { suffix: '' })}</td>
      <td>${opts.formatNumber(r.lineTotal, { suffix: '' })}</td>
    </tr>`
    )
    .join('');

  const addr = (data.customerAddress ?? '').trim();
  const prevBal = data.previousBalance ?? 0;
  const debt = data.materialDebt ?? Math.max(0, data.netTotal - data.amountPaid);
  const curBal = debt;

  const rawNotesHeading = settings.notesSectionHeading?.trim();
  const notesTitle = rawNotesHeading || 'ملاحظات';
  const notesBody = (data.notesText ?? '').trim();
  const showNotesBottom = notesBody.length > 0 || Boolean(rawNotesHeading);
  const notesSectionBottom = showNotesBottom
    ? `<section class="invoice-notes-bottom" dir="rtl">
      <h3 class="invoice-notes-title">${escapeHtml(notesTitle)}</h3>
      ${notesBody ? `<div class="invoice-notes-body">${escapeHtml(notesBody)}</div>` : ''}
    </section>`
    : '';

  const theme = resolveSalesMaterialPrintTheme(settings);
  const tableFs = Math.max(9, Math.round(theme.baseFs * 0.95 * 10) / 10);
  const notesFs = Math.max(9, Math.round(theme.baseFs * 0.95 * 10) / 10);
  const logoPlaceholderH = Math.max(48, Math.round(theme.logoH * 0.85));

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: ${theme.pageSize}; margin: ${theme.marginTopMm}mm ${theme.marginRightMm}mm ${theme.marginBottomMm}mm ${theme.marginLeftMm}mm; }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      font-weight: 700;
      margin: 0;
      padding: 0;
      background: #fff;
      color: ${theme.text};
      font-size: ${theme.baseFs}px;
      line-height: 1.45;
    }
    .sheet {
      max-width: 190mm;
      margin: 0 auto;
      padding: 4mm 2mm 8mm;
    }
    /* الرأس: LTR؛ header-logo-right يعكس الترتيب فيضع الشعار يمين الورقة */
    .inv-header {
      direction: ltr;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 10px;
    }
    .inv-header.header-logo-right { flex-direction: row-reverse; }
    .logo-block {
      text-align: center;
      flex: 0 0 auto;
      min-width: 130px;
      max-width: 46%;
    }
    .inv-logo-gray .logo-block img {
      filter: grayscale(100%);
      -webkit-filter: grayscale(100%);
    }
    .inv-logo-color .logo-block img {
      filter: none;
      -webkit-filter: none;
    }
    .logo-block img {
      max-height: ${theme.logoH}px;
      max-width: ${theme.logoW}px;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
      margin: 0 auto 8px;
    }
    .inv-num {
      color: ${theme.invoiceNum};
      font-weight: 800;
      font-size: 13px;
      margin: 0;
    }
    .company-block {
      flex: 1;
      text-align: right;
      direction: rtl;
      min-width: 0;
    }
    .company-name {
      font-size: ${theme.companyFs}px;
      font-weight: 800;
      margin: 0 0 8px;
      color: ${theme.text};
      line-height: 1.35;
      letter-spacing: 0.02em;
    }
    .company-addr {
      font-size: ${theme.baseFs}px;
      font-weight: 700;
      color: ${theme.text};
      margin: 12px 0 4px;
      white-space: pre-wrap;
      line-height: 1.5;
    }
    .company-tel {
      font-size: ${theme.baseFs}px;
      font-weight: 700;
      color: ${theme.text};
      margin: 0 0 4px;
      white-space: pre-wrap;
      line-height: 1.5;
    }
    .company-name + .company-tel {
      margin-top: 12px;
    }
    .rule { border: none; border-top: 1px solid ${theme.border}; margin: 10px 0 12px; }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      margin-bottom: 14px;
      font-size: ${theme.baseFs}px;
    }
    .meta-grid .cell { display: flex; gap: 6px; justify-content: flex-start; flex-wrap: wrap; }
    .meta-grid .k { font-weight: 700; color: ${theme.text}; opacity: 0.92; }
    .meta-grid .v { color: ${theme.text}; opacity: 0.88; }
    table.inv-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: ${tableFs}px;
    }
    table.inv-table th {
      background: ${theme.accent};
      color: ${theme.headerText};
      font-weight: 700;
      padding: 8px 4px;
      border: 1px solid ${theme.border};
      text-align: center;
    }
    table.inv-table td {
      border: 1px solid ${theme.border};
      padding: 7px 4px;
      text-align: center;
      vertical-align: middle;
    }
    table.inv-table tbody tr:nth-child(even) td { background: #fafafa; }
    .foot-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      align-items: start;
      margin-top: 6px;
    }
    .money-box {
      background: #f2f2f2;
      border: 1px solid #ccc;
      border-radius: 2px;
      padding: 6px 10px;
      margin: 4px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: ${theme.baseFs}px;
    }
    .money-box .lbl { font-weight: 600; }
    .money-box .lbl .cur { color: ${theme.accent}; font-weight: 700; }
    .money-box .val { font-weight: 700; direction: ltr; unicode-bidi: embed; color: ${theme.text}; }
    .money-box.net .val { color: ${theme.accent}; font-size: ${Math.min(16, theme.baseFs + 2)}px; }
    .thick { border: none; border-top: 2px solid ${theme.border}; margin: 8px 0; }
    .side-lines { font-size: ${tableFs}px; line-height: 1.7; color: ${theme.text}; }
    .side-lines div { margin: 2px 0; }
    .verbal {
      margin-top: 10px;
      padding: 8px 10px;
      border: 1px dashed ${theme.border};
      font-size: ${theme.baseFs}px;
      font-weight: 600;
      color: ${theme.text};
      text-align: center;
    }
    .legal {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px dashed #bbb;
      text-align: center;
      font-size: 9px;
      color: #555;
    }
    .invoice-notes-bottom {
      margin-top: 16px;
      padding: 10px 12px;
      border: 1px solid #ccc;
      background: #fafafa;
      border-radius: 4px;
      text-align: right;
    }
    .invoice-notes-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 800;
      color: ${theme.text};
      border-bottom: 1px solid #ddd;
      padding-bottom: 6px;
    }
    .invoice-notes-body {
      font-size: ${notesFs}px;
      font-weight: 700;
      color: ${theme.text};
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; }
      .inv-logo-gray .logo-block img {
        filter: grayscale(100%) !important;
        -webkit-filter: grayscale(100%) !important;
      }
      .inv-logo-color .logo-block img {
        filter: none !important;
        -webkit-filter: none !important;
      }
    }
  </style>
</head>
<body class="${theme.logoGrayscale ? 'inv-logo-gray' : 'inv-logo-color'}">
  <div class="sheet">
    <header class="inv-header${theme.logoRight ? ' header-logo-right' : ''}">
      <div class="logo-block">
        ${logoSrc ? `<img src="${escapeHtml(logoSrc)}" alt="" />` : `<div style="height:${logoPlaceholderH}px"></div>`}
        <p class="inv-num">Invoice : #${escapeHtml(invNo)}</p>
      </div>
      <div class="company-block">
        <h1 class="company-name">${escapeHtml(companyName || title)}</h1>
        ${companyAddress ? `<p class="company-addr">${escapeHtml(companyAddress)}</p>` : ''}
        ${companyPhones ? `<p class="company-tel">${escapeHtml(companyPhones)}</p>` : ''}
      </div>
    </header>
    <hr class="rule" />
    <div class="meta-grid">
      <div class="cell"><span class="k">اسم العميل :</span><span class="v">${escapeHtml(data.customerName || '—')}</span></div>
      <div class="cell"><span class="k">نوع الفاتورة :</span><span class="v">${escapeHtml(data.invoiceTypeLabel)}</span></div>
      <div class="cell"><span class="k">العنوان :</span><span class="v">${addr ? escapeHtml(addr) : '—'}</span></div>
      <div class="cell"><span class="k">التاريخ :</span><span class="v">${escapeHtml(data.dateStr)}</span></div>
    </div>

    <table class="inv-table" role="grid">
      <thead>
        <tr>
          <th>${escapeHtml(L.serial)}</th>
          <th>${escapeHtml(L.productCode)}</th>
          <th>${escapeHtml(L.productName)}</th>
          <th>${escapeHtml(L.qty)}</th>
          <th>${escapeHtml(L.unit)}</th>
          <th>${escapeHtml(L.price)}</th>
          <th>${escapeHtml(L.lineTotal)}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="foot-grid">
      <div>
        <div class="money-box">
          <span class="lbl">${escapeHtml(L.sumTotal)} : <span class="cur">دينار</span></span>
          <span class="val">${opts.formatNumber(data.grossTotal, { suffix: '' })}</span>
        </div>
        <hr class="thick" />
        <div class="money-box net">
          <span class="lbl">${escapeHtml(L.sumNet)} :</span>
          <span class="val">${opts.formatNumber(data.netTotal, { suffix: '' })}</span>
        </div>
      </div>
      <div class="side-lines">
        <div>رصيد العميل السابق : ${opts.formatNumber(prevBal, { suffix: '' })}</div>
        <div>${escapeHtml(L.sumPaid)} : ${opts.formatNumber(data.amountPaid, { suffix: ' د.ع' })}</div>
        <div>رصيد العميل الحالي (المتبقي) : ${opts.formatNumber(curBal, { suffix: ' د.ع' })}</div>
      </div>
    </div>

    ${notesSectionBottom}

    <div class="verbal">${escapeHtml(verbal)}</div>
    <div class="legal">${escapeHtml(footerLegal)}</div>
  </div>
</body>
</html>`;
}
