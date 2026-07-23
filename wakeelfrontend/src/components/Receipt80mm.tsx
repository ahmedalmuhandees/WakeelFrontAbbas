import React from 'react';
import fiberxLogo from '../images/receipt-logos/fiberx.png';
import ministryLogo from '../images/receipt-logos/ministry.png';
import iraqiyaLogo from '../images/receipt-logos/iraqiya.png';
import otetisLogo from '../images/receipt-logos/otetis.png';
import centerXLogo from '../images/receipt-logos/center-x.png';
import supportIcon from '../images/receipt-logos/support-icon.png';

export type Receipt80mmPackage = {
  name: string;
  price: number;
};

export type Receipt80mmProps = {
  receiptNo: string;
  userId: string;
  customerName: string;
  amount: number;
  duration: number;
  packages: Receipt80mmPackage[];
  /** تاريخ السند — نص جاهز للعرض */
  date?: string;
  /** أرقام الدعم / الخط الإلكتروني (اختياري) */
  supportNumber?: string;
  phoneLines?: string[];
  className?: string;
};

const DEFAULT_SUPPORT = '7115848660';
const DEFAULT_PHONES = ['07701808661', '07881417167'];

function formatIqd(n: number): string {
  return `${Number(n || 0).toLocaleString('en-US')} IQD`;
}

/**
 * سند قبض POS 80mm (302px) — مطابق لتصميم الطابعة الحرارية.
 * للطباعة عبر react-to-print أو تضمين HTML عبر buildReceipt80mmDocumentHtml.
 */
export const Receipt80mm: React.FC<Receipt80mmProps> = ({
  receiptNo,
  userId,
  customerName,
  amount,
  duration,
  packages,
  date = '',
  supportNumber = DEFAULT_SUPPORT,
  phoneLines = DEFAULT_PHONES,
  className = '',
}) => {
  const pkgs = packages?.length
    ? packages
    : [{ name: '—', price: amount }];
  const total = pkgs.reduce((s, p) => s + (Number(p.price) || 0), 0);

  return (
    <div className={`receipt80mm-root ${className}`.trim()} dir="rtl" lang="ar">
      <style>{RECEIPT_80MM_CSS}</style>
      <div className="r80-paper">
        <header className="r80-header">
          <div className="r80-logos-top">
            <img src={fiberxLogo} alt="FiberX" className="r80-logo-fiberx" />
            <div className="r80-brand-center">
              <img src={centerXLogo} alt="" className="r80-logo-x" />
              <div className="r80-brand-ar">فايبر X</div>
              <div className="r80-brand-sub">لخدمات الانترنت الضوئي</div>
              <div className="r80-title-ar">سند قبض</div>
              <div className="r80-title-en">Receipt voucher</div>
            </div>
            <img src={ministryLogo} alt="وزارة الاتصالات" className="r80-logo-ministry" />
          </div>
          <div className="r80-logos-mid">
            <div className="r80-no">NO: {receiptNo || '—'}</div>
            <img src={iraqiyaLogo} alt="العراقية" className="r80-logo-iraqiya" />
          </div>
          <div className="r80-logos-bot">
            <img src={otetisLogo} alt="OTETIS" className="r80-logo-otetis" />
          </div>
        </header>

        <div className="r80-userid">
          <span className="r80-userid-label">User ID</span>
          <span className="r80-userid-value">{userId || '—'}</span>
        </div>

        <div className="r80-field">
          <span className="r80-field-label">التاريخ :</span>
          <span className="r80-field-value">{date || '—'}</span>
        </div>

        <div className="r80-field">
          <span className="r80-field-label">استلمت من السيد / السادة :</span>
          <span className="r80-field-value">{customerName || '—'}</span>
        </div>

        <div className="r80-field r80-amount-row">
          <span className="r80-field-label">مبلغ القبض :</span>
          <span className="r80-field-value r80-amount">{formatIqd(amount)}</span>
        </div>

        <div className="r80-packages">
          <div className="r80-sep">========================</div>
          {pkgs.map((pkg, i) => (
            <div key={`${pkg.name}-${i}`} className="r80-pkg">
              <div className="r80-pkg-label">الباقة</div>
              <div className="r80-pkg-name">{pkg.name}</div>
              <div className="r80-pkg-label">السعر</div>
              <div className="r80-pkg-price">{formatIqd(pkg.price)}</div>
              {i < pkgs.length - 1 ? <div className="r80-dash">------------------------</div> : null}
            </div>
          ))}
          <div className="r80-dash">------------------------</div>
          <div className="r80-total">
            <span>الإجمالي</span>
            <strong>{formatIqd(total)}</strong>
          </div>
          <div className="r80-sep">========================</div>
        </div>

        <div className="r80-sign">
          <div className="r80-sign-label">المستلم</div>
          <div className="r80-sign-line" />
        </div>

        <div className="r80-duration">
          <div className="r80-duration-label">مدة الاشتراك</div>
          <div className="r80-duration-value">{duration > 0 ? `${duration} يوم` : '—'}</div>
          <div className="r80-sign-line" />
        </div>

        <footer className="r80-footer">
          <div className="r80-footer-rule">
            <span className="r80-footer-x">X</span>
          </div>
          <div className="r80-footer-row">
            <div className="r80-support">
              <img src={supportIcon} alt="" className="r80-support-icon" />
              <span>{supportNumber}</span>
            </div>
            <div className="r80-phones">
              <span className="r80-phones-label">الخط الإلكتروني :</span>
              <div className="r80-phones-list">
                {phoneLines.map((p) => (
                  <div key={p}>{p}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="r80-stamp">الختم</div>
        </footer>
      </div>
    </div>
  );
};

export default Receipt80mm;

/** CSS مشترك للعرض والطباعة — عرض 302px / 80mm */
export const RECEIPT_80MM_CSS = `
.receipt80mm-root {
  --r80-blue: #1a5fb4;
  --r80-orange: #e67e22;
  font-family: Cairo, "Noto Kufi Arabic", Tahoma, Arial, sans-serif;
  color: #111;
  background: #eee;
  padding: 12px;
  display: flex;
  justify-content: center;
  direction: rtl;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.receipt80mm-root *, .receipt80mm-root *::before, .receipt80mm-root *::after {
  box-sizing: border-box;
}
.r80-paper {
  width: 302px;
  max-width: 80mm;
  background: #fff;
  padding: 10px 8px 12px;
  box-shadow: 0 0 8px rgba(0,0,0,.15);
}
.r80-header { text-align: center; margin-bottom: 6px; }
.r80-logos-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
}
.r80-logo-fiberx { width: 72px; height: auto; object-fit: contain; }
.r80-logo-ministry { width: 64px; height: auto; object-fit: contain; }
.r80-brand-center { flex: 1; min-width: 0; padding-top: 2px; }
.r80-logo-x { width: 42px; height: auto; margin: 0 auto 2px; display: block; object-fit: contain; }
.r80-brand-ar { color: var(--r80-blue); font-weight: 800; font-size: 15px; line-height: 1.2; }
.r80-brand-sub { color: var(--r80-blue); font-weight: 700; font-size: 9px; line-height: 1.25; margin-top: 1px; }
.r80-title-ar { font-weight: 900; font-size: 18px; margin-top: 4px; line-height: 1.15; }
.r80-title-en { font-weight: 700; font-size: 10px; letter-spacing: 0.02em; margin-top: 1px; }
.r80-logos-mid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}
.r80-no { font-weight: 800; font-size: 12px; color: #222; }
.r80-logo-iraqiya { width: 58px; height: auto; object-fit: contain; }
.r80-logos-bot { display: flex; justify-content: flex-start; margin-top: 2px; }
.r80-logo-otetis { width: 70px; height: auto; object-fit: contain; }

.r80-userid {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #dbe4f0;
  padding: 5px 8px;
  margin: 8px 0 6px;
  font-weight: 800;
  font-size: 11px;
}
.r80-userid-label { color: #333; flex-shrink: 0; }
.r80-userid-value {
  flex: 1;
  border-bottom: 1.5px solid #333;
  min-height: 14px;
  text-align: left;
  direction: ltr;
  font-family: Cairo, monospace;
}

.r80-field {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 7px 0;
  font-size: 11px;
  font-weight: 700;
  text-align: right;
}
.r80-field-label { flex-shrink: 0; white-space: nowrap; }
.r80-field-value {
  flex: 1;
  border-bottom: 1px solid #444;
  min-height: 15px;
  padding-bottom: 1px;
  word-break: break-word;
}
.r80-amount { font-weight: 900; font-size: 12px; }

.r80-packages { margin: 10px 0 8px; text-align: center; }
.r80-sep { font-family: monospace; font-size: 10px; letter-spacing: -0.5px; color: #333; margin: 4px 0; }
.r80-dash { font-family: monospace; font-size: 10px; color: #555; margin: 6px 0; }
.r80-pkg { padding: 2px 0; }
.r80-pkg-label { font-size: 10px; font-weight: 700; color: #444; margin-top: 2px; }
.r80-pkg-name { font-size: 13px; font-weight: 900; margin: 2px 0 4px; }
.r80-pkg-price { font-size: 12px; font-weight: 800; margin-bottom: 2px; }
.r80-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 900;
  padding: 4px 4px 2px;
}

.r80-sign, .r80-duration { text-align: center; margin: 14px 0 8px; }
.r80-sign-label, .r80-duration-label { font-weight: 800; font-size: 12px; margin-bottom: 6px; }
.r80-sign-line {
  width: 70%;
  margin: 0 auto;
  border-bottom: 1.5px solid #222;
  height: 18px;
}
.r80-duration-value { font-weight: 900; font-size: 14px; margin: 4px 0 6px; }

.r80-footer { margin-top: 10px; }
.r80-footer-rule {
  border-top: 3px solid var(--r80-blue);
  position: relative;
  margin: 8px 0 10px;
}
.r80-footer-x {
  position: absolute;
  left: 0;
  top: -11px;
  background: #fff;
  color: var(--r80-blue);
  font-weight: 900;
  font-size: 16px;
  padding: 0 4px;
  font-family: Arial, sans-serif;
}
.r80-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
}
.r80-support { display: flex; align-items: center; gap: 4px; direction: ltr; }
.r80-support-icon { width: 22px; height: 22px; object-fit: contain; }
.r80-phones { text-align: right; }
.r80-phones-label { display: block; margin-bottom: 2px; }
.r80-phones-list { direction: ltr; text-align: right; line-height: 1.35; }
.r80-stamp {
  margin-top: 14px;
  text-align: left;
  font-weight: 800;
  font-size: 12px;
  padding-left: 8px;
}

@media print {
  @page { size: 80mm auto; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    width: 80mm;
  }
  .receipt80mm-root {
    background: #fff !important;
    padding: 0 !important;
    display: block !important;
  }
  .r80-paper {
    box-shadow: none !important;
    width: 80mm !important;
    max-width: 80mm !important;
    margin: 0 auto;
    page-break-inside: avoid;
  }
}
`;
