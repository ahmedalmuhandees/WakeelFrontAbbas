import fiberxLogo from '../images/receipt-logos/fiberx.png';
import fiberxArLogo from '../images/receipt-logos/fiberx-ar.png';
import ministryLogo from '../images/receipt-logos/ministry.png';
import iraqiyaLogo from '../images/receipt-logos/iraqiya.png';
import otetisLogo from '../images/receipt-logos/otetis.png';
import supportIcon from '../images/receipt-logos/support-icon.png';
import { RECEIPT_80MM_CSS, type Receipt80mmPackage, type Receipt80mmProps } from '../components/Receipt80mm';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absAsset(appOrigin: string, importedPath: string): string {
  const origin = (appOrigin || '').replace(/\/$/, '');
  if (!importedPath) return '';
  if (/^https?:\/\//i.test(importedPath) || importedPath.startsWith('data:')) return importedPath;
  if (importedPath.startsWith('/')) return `${origin}${importedPath}`;
  return `${origin}/${importedPath}`;
}

function formatIqd(n: number): string {
  return `${Number(n || 0).toLocaleString('en-US')} IQD`;
}

const DEFAULT_SUPPORT = '7115848660';
const DEFAULT_PHONES = ['07701808661', '07881417167'];

/**
 * مستند HTML كامل لسند قبض 80mm — للاستخدام مع window.print().
 */
export function buildReceipt80mmDocumentHtml(
  props: Receipt80mmProps,
  opts: { appOrigin: string; documentTitle?: string }
): string {
  const {
    receiptNo,
    userId,
    customerName,
    amount,
    duration,
    packages,
    date = '',
    supportNumber = DEFAULT_SUPPORT,
    phoneLines = DEFAULT_PHONES,
  } = props;

  const origin = opts.appOrigin || '';
  const logos = {
    fiberx: absAsset(origin, fiberxLogo),
    fiberxAr: absAsset(origin, fiberxArLogo),
    ministry: absAsset(origin, ministryLogo),
    iraqiya: absAsset(origin, iraqiyaLogo),
    otetis: absAsset(origin, otetisLogo),
    support: absAsset(origin, supportIcon),
  };

  const pkgs: Receipt80mmPackage[] =
    packages?.length > 0 ? packages : [{ name: '—', price: amount }];
  const total = pkgs.reduce((s, p) => s + (Number(p.price) || 0), 0);

  const packagesHtml = pkgs
    .map((pkg, i) => {
      const dash =
        i < pkgs.length - 1 ? '<div class="r80-dash">------------------------</div>' : '';
      return `<div class="r80-pkg">
        <div class="r80-pkg-label">الباقة</div>
        <div class="r80-pkg-name">${escapeHtml(pkg.name)}</div>
        <div class="r80-pkg-label">السعر</div>
        <div class="r80-pkg-price">${escapeHtml(formatIqd(pkg.price))}</div>
        ${dash}
      </div>`;
    })
    .join('');

  const phonesHtml = (phoneLines.length ? phoneLines : DEFAULT_PHONES)
    .map((p) => `<div>${escapeHtml(p)}</div>`)
    .join('');

  const title = opts.documentTitle || `سند قبض — ${receiptNo || ''}`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=80mm, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&display=swap" rel="stylesheet" />
  <style>${RECEIPT_80MM_CSS}
    html, body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div class="receipt80mm-root">
    <div class="r80-paper">
      <header class="r80-header">
        <div class="r80-logos-top">
          <img src="${escapeHtml(logos.fiberx)}" alt="FiberX" class="r80-logo-fiberx" />
          <div class="r80-brand-center">
            <img src="${escapeHtml(logos.fiberxAr)}" alt="فايبر X" class="r80-logo-x" />
            <div class="r80-title-ar">سند قبض</div>
            <div class="r80-title-en">Receipt voucher</div>
          </div>
          <img src="${escapeHtml(logos.ministry)}" alt="الشركة العامة للاتصالات والمعلوماتية" class="r80-logo-ministry" />
        </div>
        <div class="r80-logos-mid">
          <div class="r80-no">NO: ${escapeHtml(receiptNo || '—')}</div>
          <img src="${escapeHtml(logos.iraqiya)}" alt="العراقية" class="r80-logo-iraqiya" />
        </div>
        <div class="r80-logos-bot">
          <img src="${escapeHtml(logos.otetis)}" alt="EiTiS" class="r80-logo-otetis" />
        </div>
      </header>

      <div class="r80-userid">
        <span class="r80-userid-label">User ID</span>
        <span class="r80-userid-value">${escapeHtml(userId || '—')}</span>
      </div>

      <div class="r80-field">
        <span class="r80-field-label">التاريخ :</span>
        <span class="r80-field-value">${escapeHtml(date || '—')}</span>
      </div>

      <div class="r80-field">
        <span class="r80-field-label">استلمت من السيد / السادة :</span>
        <span class="r80-field-value">${escapeHtml(customerName || '—')}</span>
      </div>

      <div class="r80-field r80-amount-row">
        <span class="r80-field-label">مبلغ القبض :</span>
        <span class="r80-field-value r80-amount">${escapeHtml(formatIqd(amount))}</span>
      </div>

      <div class="r80-packages">
        <div class="r80-sep">========================</div>
        ${packagesHtml}
        <div class="r80-dash">------------------------</div>
        <div class="r80-total">
          <span>الإجمالي</span>
          <strong>${escapeHtml(formatIqd(total))}</strong>
        </div>
        <div class="r80-sep">========================</div>
      </div>

      <div class="r80-sign">
        <div class="r80-sign-label">المستلم</div>
        <div class="r80-sign-line"></div>
      </div>

      <div class="r80-duration">
        <div class="r80-duration-label">الأيام المتبقية من الاشتراك</div>
        <div class="r80-duration-value">${duration > 0 ? `${duration} يوم` : '—'}</div>
        <div class="r80-sign-line"></div>
      </div>

      <footer class="r80-footer">
        <div class="r80-footer-rule"><span class="r80-footer-x">X</span></div>
        <div class="r80-footer-row">
          <div class="r80-support">
            <img src="${escapeHtml(logos.support)}" alt="" class="r80-support-icon" />
            <span>${escapeHtml(supportNumber || DEFAULT_SUPPORT)}</span>
          </div>
          <div class="r80-phones">
            <span class="r80-phones-label">الخط الإلكتروني :</span>
            <div class="r80-phones-list">${phonesHtml}</div>
          </div>
        </div>
        <div class="r80-stamp">الختم</div>
      </footer>
    </div>
  </div>
</body>
</html>`;
}
