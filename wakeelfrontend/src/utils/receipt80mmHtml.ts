import type { Receipt80mmPackage, Receipt80mmProps } from '../components/Receipt80mm';
import type { ReceiptEmbeddedLogos } from './receiptLogosEmbedded';

/** CSS بسيط للطابعات الحرارية 80mm — جداول فقط بدون flex */
export const THERMAL_RECEIPT_CSS = `
@page { size: 80mm auto; margin: 0; }
* { box-sizing: border-box; }
html, body {
  width: 80mm;
  margin: 0;
  padding: 0;
  background: #fff;
  color: #000;
  font-family: Tahoma, Arial, sans-serif;
  font-size: 11px;
  line-height: 1.35;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.receipt {
  width: 76mm;
  margin: 0 auto;
  padding: 2mm;
  direction: rtl;
  text-align: right;
}
.receipt table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.receipt td { vertical-align: middle; padding: 2px 1px; word-wrap: break-word; }
.receipt .c { text-align: center; }
.receipt .b { font-weight: bold; }
.receipt .line { border-bottom: 1px solid #000; min-height: 14px; }
.receipt .sep { text-align: center; font-size: 10px; margin: 4px 0; letter-spacing: -0.5px; }
.receipt img { display: block; max-width: 100%; height: auto; margin: 0 auto; }
.receipt .header-banner { width: 100%; height: auto; margin: 0 auto 4px; }
.receipt .uid { background: #e8e8e8; padding: 4px; margin: 6px 0; }
.receipt .sig { text-align: center; margin: 12px 0 6px; }
.receipt .sig-line { border-bottom: 1px solid #000; width: 70%; margin: 6px auto; height: 14px; }
.receipt .footer { border-top: 2px solid #000; margin-top: 8px; padding-top: 6px; font-size: 10px; }
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatIqd(n: number): string {
  return `${Number(n || 0).toLocaleString('en-US')} IQD`;
}

function publicLogoUrl(appOrigin: string, file: string): string {
  const origin = (appOrigin || '').replace(/\/$/, '');
  const pub =
    typeof process !== 'undefined' && process.env.PUBLIC_URL != null
      ? String(process.env.PUBLIC_URL).replace(/\/$/, '')
      : '';
  return `${origin}${pub}/receipt-logos/${file}`.replace(/([^:]\/)\/+/g, '$1');
}

const DEFAULT_SUPPORT = '7115848660';
const DEFAULT_PHONES = ['07701808661', '07881417167'];

/**
 * مستند HTML كامل لسند قبض 80mm — للاستخدام مع window.print().
 */
export function buildReceipt80mmDocumentHtml(
  props: Receipt80mmProps,
  opts: { appOrigin: string; documentTitle?: string; embeddedLogos?: ReceiptEmbeddedLogos }
): string {
  const {
    receiptNo,
    userId,
    customerName,
    amount,
    packages,
    remainingAmount = 0,
    date = '',
    supportNumber = DEFAULT_SUPPORT,
    phoneLines = DEFAULT_PHONES,
  } = props;

  const origin = opts.appOrigin || '';
  const logos = opts.embeddedLogos ?? {
    header: publicLogoUrl(origin, 'receipt-header.png'),
    support: publicLogoUrl(origin, 'support-icon.png'),
  };

  const pkgs: Receipt80mmPackage[] =
    packages?.length > 0 ? packages : [{ name: '—', price: amount }];
  const total = pkgs.reduce((s, p) => s + (Number(p.price) || 0), 0);

  const packagesHtml = pkgs
    .map((pkg, i) => {
      const dash = i < pkgs.length - 1 ? '<tr><td colspan="2" class="sep">------------------------</td></tr>' : '';
      return `<tr><td colspan="2" class="c b">الباقة</td></tr>
<tr><td colspan="2" class="c b">${escapeHtml(pkg.name)}</td></tr>
<tr><td colspan="2" class="c">السعر</td></tr>
<tr><td colspan="2" class="c b">${escapeHtml(formatIqd(pkg.price))}</td></tr>
${dash}`;
    })
    .join('');

  const phones = (phoneLines.length ? phoneLines : DEFAULT_PHONES)
    .map((p) => escapeHtml(p))
    .join('<br/>');

  const title = opts.documentTitle || `سند قبض — ${receiptNo || ''}`;
  const remainingRow =
    remainingAmount > 0
      ? `<tr><td class="b">المتبقي :</td><td class="line b">${escapeHtml(formatIqd(remainingAmount))}</td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${THERMAL_RECEIPT_CSS}</style>
</head>
<body>
  <div class="receipt">
    <img src="${escapeHtml(logos.header)}" alt="" class="header-banner" />
    <div class="b" style="font-size:10px;text-align:right;margin-bottom:6px">NO: ${escapeHtml(receiptNo || '—')}</div>

    <div class="uid">
      <table>
        <tr>
          <td class="b" style="width:30%">User ID</td>
          <td class="line" style="direction:ltr;text-align:left">${escapeHtml(userId || '—')}</td>
        </tr>
      </table>
    </div>

    <table>
      <tr><td class="b" style="width:38%">التاريخ :</td><td class="line">${escapeHtml(date || '—')}</td></tr>
      <tr><td class="b">استلمت من السيد / السادة :</td><td class="line">${escapeHtml(customerName || '—')}</td></tr>
      <tr><td class="b">مبلغ القبض :</td><td class="line b">${escapeHtml(formatIqd(amount))}</td></tr>
      ${remainingRow}
    </table>

    <div class="sep">========================</div>
    <table>
      ${packagesHtml}
      <tr><td colspan="2" class="sep">------------------------</td></tr>
      <tr class="total-row">
        <td class="b">الإجمالي</td>
        <td class="b" style="text-align:left;direction:ltr">${escapeHtml(formatIqd(total))}</td>
      </tr>
    </table>
    <div class="sep">========================</div>

    <div class="sig">
      <div class="b">المستلم</div>
      <div class="sig-line"></div>
    </div>

    <div class="footer">
      <table>
        <tr>
          <td style="width:50%;vertical-align:top">
            <div class="b">للدفع الإلكتروني :</div>
            <div style="direction:ltr;text-align:right">${escapeHtml(supportNumber || DEFAULT_SUPPORT)}</div>
          </td>
          <td style="width:50%;vertical-align:top">
            <div class="b">للاستفسار :</div>
            <div style="direction:ltr;text-align:right">${phones}</div>
          </td>
        </tr>
      </table>
      <div style="margin-top:10px">الختم</div>
    </div>
  </div>
</body>
</html>`;
}
