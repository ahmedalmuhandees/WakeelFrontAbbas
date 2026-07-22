import { sanitizePdfFileName, saveHtmlStringAsPdf } from './saveHtmlStringAsPdf';
import { amountToArabicIqdWords } from './salesMaterialInvoicePrintHtml';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface DealerCashReceiptRecord {
  subscriberName: string;
  /** تاريخ التسديد (معروض) */
  paymentDateDisplay: string;
  /** يُعرض في عمود «مبلغ السجل» عند تعدد السجلات أو عند اختلافه عن إجمالي التسديد */
  recordAmount?: number;
}

export interface DealerCashReceiptInput {
  dealerFullName: string;
  /** يُعرض كـ «مبلغ الدين» (إجمالي الدين المعني بالسند) */
  paymentAmount: number;
  formatAmount: (n: number) => string;
  records: DealerCashReceiptRecord[];
  subtitle?: string;
  /** «المبلغ المتبقي» في السند؛ يُفضَّل أن يكون لنفس مجموعة السجلات (مثلاً مجموع remainingAmount) */
  totalUnpaidAmount?: number;
  /** اسم ملف التنزيل (يُكمَّل بـ .pdf إن لزم) */
  pdfFileName?: string;
  /** اسم المحاسب (يؤخذ من users/me -> fullName) */
  accountantName?: string;
}

/**
 * سند قبض — خط Cairo؛ يُحفظ كملف PDF في مجلد التنزيلات الافتراضي.
 */
export async function saveDealerCashReceiptPdf(input: DealerCashReceiptInput): Promise<boolean> {
  const now = new Date();
  const issuedDate = now.toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const issuedDateIso = now.toISOString().slice(0, 10);
  const receiptNo = now.getTime().toString().slice(-6);
  const accountantName = (input.accountantName ?? '').trim() || '—';

  const showAmountCol = input.records.some(
    (rec) => rec.recordAmount != null && Number.isFinite(Number(rec.recordAmount))
  );
  const colCount = showAmountCol ? 3 : 2;

  const thead = showAmountCol
    ? `<tr><th>اسم المشترك</th><th>تاريخ التسديد</th><th>مبلغ السجل</th></tr>`
    : `<tr><th>اسم المشترك</th><th>تاريخ التسديد</th></tr>`;

  const rows =
    input.records.length === 0
      ? `<tr><td colspan="${colCount}" class="empty">لا توجد تفاصيل سجلات</td></tr>`
      : input.records
          .map((rec) => {
            const amtCell =
              showAmountCol && rec.recordAmount != null && Number.isFinite(Number(rec.recordAmount))
                ? `<td class="num">${escapeHtml(input.formatAmount(Number(rec.recordAmount)))}</td>`
                : showAmountCol
                  ? `<td class="num">—</td>`
                  : '';
            return `<tr><td>${escapeHtml(rec.subscriberName)}</td><td class="num">${escapeHtml(
              rec.paymentDateDisplay
            )}</td>${amtCell}</tr>`;
          })
          .join('');

  const unpaid =
    input.totalUnpaidAmount != null && Number.isFinite(Number(input.totalUnpaidAmount))
      ? Number(input.totalUnpaidAmount)
      : null;
  const debtAmt = Number(input.paymentAmount);
  const paidSettled =
    unpaid != null && Number.isFinite(debtAmt)
      ? debtAmt - unpaid
      : null;
  const amountWordsLabel = 'مبلغ وقدره';
  const amountInWords =
    paidSettled != null && paidSettled > 0
      ? ` ${amountToArabicIqdWords(paidSettled)
          .replace(/ دينار عراقي /g, ' دينار ')
          .replace(/^فقط\s*/g, '')
          .replace(/\s+لا غير$/g, ' لا غير')}`
      : '';
  const paymentStatement = 'دفعة من الحساب';
  const publicBase =
    typeof process !== 'undefined' && process.env.PUBLIC_URL != null
      ? String(process.env.PUBLIC_URL).replace(/\/$/, '')
      : '';
  const logoSrc = `${publicBase}/activation-invoice-logo.png`;

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>سند قبض</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --ink: #111111;
      --border: #333333;
      --paper: #ffffff;
      --muted: #4b5563;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
      background: var(--paper);
      color: var(--ink);
      padding: 16px;
    }
    .sheet {
      max-width: 980px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      padding: 18px;
      background: #fff;
      position: relative;
    }
    .sheet::after {
      content: '';
      position: absolute;
      inset: 0;
      background: url('${escapeHtml(logoSrc)}') center/44% no-repeat;
      opacity: 0.05;
      pointer-events: none;
      filter: grayscale(100%);
    }
    .head {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr 1.2fr 1fr;
      gap: 14px;
      align-items: start;
      margin-bottom: 14px;
    }
    .logo-box {
      text-align: left;
    }
    .logo-box img {
      max-width: 140px;
      max-height: 70px;
      object-fit: contain;
      filter: grayscale(100%);
    }
    .title-box {
      text-align: center;
      padding-top: 2px;
    }
    .title-box h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: 0;
      direction: rtl;
      unicode-bidi: plaintext;
      font-family: Arial, 'Segoe UI', Tahoma, sans-serif;
      color: #b91c1c;
    }
    .title-box .en {
      margin-top: -2px;
      font-size: 2rem;
      font-weight: 700;
      color: #b91c1c;
    }
    .company-box {
      text-align: right;
      font-size: 1.12rem;
      font-weight: 600;
    }
    .meta-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
    }
    table { width: 100%; border-collapse: collapse; }
    .meta-table td,
    .meta-table th {
      border: 1px solid var(--border);
      padding: 8px 10px;
      font-size: 1.03rem;
    }
    .meta-table .label {
      width: 28%;
      white-space: nowrap;
      font-weight: 600;
      background: #fafafa;
    }
    .meta-table .value {
      text-align: center;
      font-weight: 700;
    }
    .amount-card td,
    .amount-card th {
      border: 1px solid var(--border);
      padding: 8px 10px;
    }
    .amount-card .amt-h {
      background: #fafafa;
      font-weight: 700;
      text-align: center;
    }
    .amount-card .amt-v {
      text-align: center;
      font-size: 2rem;
      font-weight: 700;
    }
    .dealer-table td {
      border: 1px solid var(--border);
      padding: 9px 10px;
      font-size: 1.06rem;
    }
    .dealer-table .label {
      width: 25%;
      font-weight: 600;
      background: #fafafa;
      white-space: nowrap;
    }
    .dealer-table .value {
      text-align: center;
      font-weight: 700;
    }
    .section-title {
      position: relative;
      z-index: 1;
      margin: 16px 0 8px;
      font-size: 1.25rem;
      font-weight: 700;
      border-bottom: 2px solid var(--border);
      padding-bottom: 4px;
    }
    .details-table {
      position: relative;
      z-index: 1;
      width: 100%;
      border-collapse: collapse;
      font-size: 1rem;
    }
    .details-table th,
    .details-table td {
      border: 1px solid var(--border);
      padding: 10px;
    }
    .details-table th {
      background: #fafafa;
      font-weight: 700;
    }
    td.num { direction: ltr; text-align: center; font-variant-numeric: tabular-nums; }
    td.empty { text-align: center; color: var(--muted); padding: 20px; }
    .footer {
      position: relative;
      z-index: 1;
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px dashed #9ca3af;
      font-size: 0.9rem;
      color: #111827;
      text-align: center;
    }
    .accountant-row {
      position: relative;
      z-index: 1;
      margin-top: 8px;
      font-size: 1rem;
      font-weight: 600;
      text-align: right;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { border: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="company-box">سند ديون الوكلاء</div>
      <div class="title-box">
        <h1>سند قبض</h1>
        <div class="en">Receipt Voucher</div>
      </div>
      <div class="logo-box"><img src="${escapeHtml(logoSrc)}" alt="logo" /></div>
    </div>
    <div class="meta-grid">
      <table class="meta-table">
        <tr>
          <td class="label">No:</td>
          <td class="value num">${escapeHtml(receiptNo)}</td>
        </tr>
        <tr>
          <td class="label">Date:</td>
          <td class="value num">${escapeHtml(issuedDateIso)}</td>
        </tr>
      </table>
      <table class="amount-card">
        <tr><th class="amt-h">Amount Received / المبلغ</th></tr>
        <tr><td class="amt-v num">${escapeHtml(input.formatAmount(input.paymentAmount))}</td></tr>
      </table>
    </div>

    <table class="dealer-table">
      <tr>
        <td class="label">استلمنا من السيد:</td>
        <td class="value">${escapeHtml(input.dealerFullName)}</td>
        <td class="label">Received From:</td>
      </tr>
      <tr>
        <td class="label">${escapeHtml(amountWordsLabel)}:</td>
        <td class="value">${escapeHtml(amountInWords)}</td>
        <td class="label">Amount:</td>
      </tr>
      <tr>
        <td class="label">وذلك مقابل:</td>
        <td class="value">${escapeHtml(paymentStatement)}</td>
        <td class="label">Payment:</td>
      </tr>
      <tr>
        <td class="label">المبلغ الكلي:</td>
        <td class="value num">${escapeHtml(input.formatAmount(input.paymentAmount))}</td>
        <td class="label">Total Debt Amount:</td>
      </tr>
      ${
        paidSettled != null
          ? `<tr>
        <td class="label">المبلغ المسدد:</td>
        <td class="value num">${escapeHtml(input.formatAmount(paidSettled))}</td>
        <td class="label">Total Debt Paid:</td>
      </tr>`
          : ''
      }
      ${
        unpaid != null
          ? `<tr>
        <td class="label">المبلغ المتبقي:</td>
        <td class="value num">${escapeHtml(input.formatAmount(unpaid))}</td>
        <td class="label">Total Debt Remaining:</td>
      </tr>`
          : ''
      }
    </table>

    <h2 class="section-title">بيان الديون</h2>
    <table class="details-table">
      <thead>
        ${thead}
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="footer">تم إنشاء هذا السند بتاريخ: ${escapeHtml(issuedDate)}</div>
    <div class="accountant-row">المحاسب: ${escapeHtml(accountantName)}</div>
  </div>
</body>
</html>`;

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const part = sanitizePdfFileName(input.dealerFullName).slice(0, 48);
  const filename = input.pdfFileName ?? `سند-قبض-وكيل-${part}-${stamp}.pdf`;
  return saveHtmlStringAsPdf(html, filename);
}
