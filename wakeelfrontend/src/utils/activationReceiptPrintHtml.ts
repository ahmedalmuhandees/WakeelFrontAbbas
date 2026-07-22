import type { ActivationInvoicePrintSettingsDto } from '../types';
import { DEFAULT_INVOICE_PRINT_FOOTER_LEGAL } from '../types';

/** ملف في `public/` — شعار ثابت لفاتورة التفعيل (لا يُؤخذ من الباكند) */
export const ACTIVATION_INVOICE_LOGO_FILENAME = 'activation-invoice-logo.png';

/** رابط مطلق لشعار الطباعة الثابت (مع `PUBLIC_URL` مثل `/wakeel`). */
export function getActivationInvoiceStaticLogoUrl(appOrigin: string): string {
  const origin = (appOrigin || '').replace(/\/$/, '');
  const publicBase =
    typeof process !== 'undefined' && process.env.PUBLIC_URL != null
      ? String(process.env.PUBLIC_URL).replace(/\/$/, '')
      : '';
  const rel = `${publicBase}/${ACTIVATION_INVOICE_LOGO_FILENAME}`.replace(/\/+/g, '/');
  if (!origin) return rel;
  return `${origin}${rel}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type InvoiceLogoResolveOptions = { appOrigin: string; apiBaseUrl?: string };

/**
 * روابط مطلقة محتملة للشعار (نفس المضيف قد يعرض الملفات تحت بادئة التطبيق مثل /wakeel/uploads وليس /uploads فقط).
 */
export function resolveInvoiceLogoUrlCandidates(
  logoUrl: string | null | undefined,
  options: InvoiceLogoResolveOptions
): string[] {
  const u = (logoUrl ?? '').trim();
  if (!u) return [];
  if (u.startsWith('data:')) return [u];
  if (/^https?:\/\//i.test(u)) {
    const apiBase = options.apiBaseUrl?.trim();
    if (apiBase) {
      try {
        const abs = new URL(u);
        const apiRoot = apiBase.replace(/\/api(\/v\d+)?\/?$/i, '').replace(/\/$/, '');
        if (apiRoot) {
          const rootParsed = new URL(apiRoot.endsWith('/') ? apiRoot : `${apiRoot}/`);
          const prefix = rootParsed.pathname.replace(/\/$/, '') || '';
          if (
            abs.origin === rootParsed.origin &&
            abs.pathname.startsWith('/uploads/') &&
            prefix &&
            !abs.pathname.startsWith(`${prefix}/`)
          ) {
            return [`${apiRoot}${abs.pathname}${abs.search}${abs.hash}`];
          }
        }
      } catch {
        /* keep as-is */
      }
    }
    return [u];
  }
  if (u.startsWith('//')) {
    const proto = typeof window !== 'undefined' ? window.location.protocol : 'https:';
    return [`${proto}${u}`];
  }

  const raw = (options.apiBaseUrl?.trim() || options.appOrigin || '').replace(/\/$/, '');
  let originHost = options.appOrigin.replace(/\/$/, '');
  let pathPrefix = '';
  try {
    const parsed = new URL(raw);
    originHost = parsed.origin;
    let pathname = parsed.pathname.replace(/\/$/, '');
    pathname = pathname.replace(/\/api(\/v\d+)?$/i, '');
    pathPrefix = pathname && pathname !== '/' ? pathname : '';
  } catch {
    /* keep originHost from appOrigin */
  }

  const apiBase = options.apiBaseUrl?.replace(/\/$/, '');
  /** جذر خدمة الـ API بدون لاحقة ‎/api‎ — الملفات الثابتة تحت ‎…/wakeel/uploads وليس ‎…/wakeel/api/uploads */
  const apiStaticRoot = apiBase ? apiBase.replace(/\/api(\/v\d+)?\/?$/i, '').replace(/\/$/, '') : '';
  const out: string[] = [];

  if (u.startsWith('/')) {
    const pfx = pathPrefix.replace(/\/$/, '');
    if (pfx) {
      /** المسار يتضمّن بادئة التطبيق مسبقاً (مثل /wakeel/uploads من الـ API) — لا تكرار /wakeel/wakeel */
      if (u === pfx || u.startsWith(`${pfx}/`)) {
        out.push(`${originHost}${u}`);
      } else {
        out.push(`${originHost}${pathPrefix}${u}`);
      }
    }
    if (apiStaticRoot) {
      if (u.startsWith('/uploads/') && apiStaticRoot === originHost) {
        out.push(`${originHost}/wakeel${u}`);
      }
      out.push(`${apiStaticRoot}${u}`);
    }
    if (!pathPrefix && u.startsWith('/uploads/')) {
      out.push(`${originHost}/wakeel${u}`);
    }
    out.push(`${originHost}${u}`);
  } else {
    out.push(`${originHost}/${u}`);
    if (pathPrefix) out.push(`${originHost}${pathPrefix}/${u}`);
  }

  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const x of out) {
    if (!seen.has(x)) {
      seen.add(x);
      uniq.push(x);
    }
  }
  return uniq;
}

/**
 * يحوّل مسار شعار نسبي إلى رابط مطلق لنافذة الطباعة.
 * يجب تمرير `apiBaseUrl` (مثل REACT_APP_API_URL / getBaseURL()) لأن الشعار يُخدَّم من خادم الـ API
 * وليس من مضيف الواجهة — وإلا يصبح المسار مثل http://localhost:3000/wakeel/... ولا يُوجد الملف.
 */
export function resolveInvoiceLogoUrl(
  logoUrl: string | null | undefined,
  options: InvoiceLogoResolveOptions
): string | null {
  const c = resolveInvoiceLogoUrlCandidates(logoUrl, options);
  return c[0] ?? null;
}

/**
 * يجلب الشعار مع ترويسة المصادقة ويحوّله إلى data URL حتى تظهر في نافذة الطباعة
 * (وسم img لا يرسل Bearer). يجرّب عدة روابط محتملة (بادئة /wakeel وغيرها). عند الفشل تُعاد الإعدادات كما هي.
 */
export async function tryEmbedInvoiceLogoAsDataUrl(
  settings: ActivationInvoicePrintSettingsDto,
  options: InvoiceLogoResolveOptions
): Promise<ActivationInvoicePrintSettingsDto> {
  const raw = settings.logoUrl?.trim();
  if (!raw || raw.startsWith('data:')) return settings;

  const candidates = resolveInvoiceLogoUrlCandidates(raw, options).filter((u) => u && !u.startsWith('data:'));
  if (candidates.length === 0) return settings;

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

  for (const absolute of candidates) {
    try {
      const res = await fetch(absolute, {
        mode: 'cors',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob || blob.size === 0) continue;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error('read'));
        fr.readAsDataURL(blob);
      });
      return { ...settings, logoUrl: dataUrl };
    } catch {
      /* جرّب الرابط التالي */
    }
  }
  return settings;
}

/** انتظار تحميل صور المستند قبل الطباعة (الوسوم img لا تكتمل قبل استدعاء print أحياناً). */
export function waitForDocumentImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images);
  return Promise.all(
    imgs.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            })
    )
  ).then(() => undefined);
}

export type ActivationReceiptPrintPayload = {
  receiptNumber: string;
  renewalDate: string;
  subscriberName: string;
  subscriberPhone: string;
  newProfileName: string;
  newExpirationDate?: string | null;
  finalPrice: number;
  amountPaid: number;
  discountAmount?: number;
  discountPercent?: number;
  notes?: string | null;
  subscriberId?: string;
  /** إن وُجد من الـ API يُفضّل على (finalPrice - amountPaid) */
  remainingAmount?: number;
  /**
   * من قام بالتفعيل — يُملأ من الحقول التي قد يعيدها الخادم (اسم موظف أو حساب وكيل).
   * عند الطباعة من الواجهة يُكمَّل عبر `fallbackOrganizerName` في خيارات البناء إن وُجد.
   */
  organizerName?: string | null;
};

/** يستخرج اسم منظم الوصل من حقول متعددة محتملة (camelCase / PascalCase). */
export function pickOrganizerNameFromRenewalLike(r: Record<string, unknown>): string {
  const keys = [
    'organizerName',
    'OrganizerName',
    'activatedByUserName',
    'ActivatedByUserName',
    'createdByUserName',
    'CreatedByUserName',
    'employeeName',
    'EmployeeName',
    'issuerDisplayName',
    'IssuerDisplayName',
    'performedByName',
    'PerformedByName',
    'issuedByUserName',
    'IssuedByUserName',
    'issuerName',
    'IssuerName',
  ];
  for (const k of keys) {
    const v = r[k];
    if (v != null) {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return '';
}

export function renewalLikeToActivationPrintPayload(r: Record<string, unknown>): ActivationReceiptPrintPayload {
  const fp = Number(r.finalPrice ?? 0);
  const ap = Number(r.amountPaid ?? 0);
  const rem = r.remainingAmount != null && r.remainingAmount !== '' ? Number(r.remainingAmount) : undefined;
  const organizerName = pickOrganizerNameFromRenewalLike(r);
  return {
    receiptNumber: String(r.receiptNumber ?? ''),
    renewalDate: String(r.renewalDate ?? r.issueDate ?? r.createdAt ?? ''),
    subscriberName: String(r.subscriberName ?? ''),
    subscriberPhone: String(r.subscriberPhone ?? ''),
    newProfileName: String(r.newProfileName ?? r.profileName ?? ''),
    newExpirationDate: r.newExpirationDate != null ? String(r.newExpirationDate) : null,
    finalPrice: fp,
    amountPaid: ap,
    discountAmount: r.discountAmount != null ? Number(r.discountAmount) : 0,
    discountPercent: r.discountPercent != null ? Number(r.discountPercent) : 0,
    notes: r.notes != null ? String(r.notes) : null,
    subscriberId: r.subscriberId != null ? String(r.subscriberId) : undefined,
    remainingAmount: rem != null && !Number.isNaN(rem) ? rem : undefined,
    organizerName: organizerName || undefined,
  };
}

/**
 * مستند HTML كامل لفاتورة تفعيل — الشعار ثابت من `public/activation-invoice-logo.png`؛
 * بقية القالب من الإعدادات (عنوان، شركة، تذييل). تصميم POS 80mm حديث.
 */
export function buildActivationReceiptPrintHtml(
  settings: ActivationInvoicePrintSettingsDto,
  receipt: ActivationReceiptPrintPayload,
  opts: {
    /** يمرَّر عادةً من useDigits؛ يدعم خيارات Intl لعرض التاريخ فقط عند الحاجة */
    formatDate: (d: string | Date, options?: Intl.DateTimeFormatOptions) => string;
    locale: string;
    /** عادة window.location.origin — لبناء رابط الشعار الثابت تحت `PUBLIC_URL` */
    appOrigin: string;
    /** إن لم يُرجع الخادم اسم المنفّذ في بيانات الفاتورة — عادة اسم المستخدم الحالي */
    fallbackOrganizerName?: string;
  }
): string {
  const { formatDate, locale, appOrigin, fallbackOrganizerName } = opts;
  const fmtNum = (n: number) => n.toLocaleString(locale);

  const title = settings.invoiceTitle?.trim() || 'فاتورة التفعيل';
  const footerLegal = settings.footerLegalText?.trim() || DEFAULT_INVOICE_PRINT_FOOTER_LEGAL;
  const notesHeading = settings.notesSectionHeading?.trim() || 'ملاحظات';

  const companyName = settings.companyName?.trim() ?? '';
  const companyAddress = settings.companyAddress?.trim() ?? '';
  const companyPhones = settings.companyPhones?.trim() ?? '';

  const logoSrc = getActivationInvoiceStaticLogoUrl(appOrigin);

  /** تاريخ التفعيل — تاريخ فقط بدون وقت */
  const activationDateStr = receipt.renewalDate
    ? formatDate(receipt.renewalDate, { year: 'numeric', month: 'numeric', day: 'numeric' })
    : '';

  const remaining =
    receipt.remainingAmount != null && !Number.isNaN(receipt.remainingAmount)
      ? receipt.remainingAmount
      : Math.max(0, receipt.finalPrice - receipt.amountPaid);

  const disc = Number(receipt.discountAmount ?? 0);
  const hasDisc = disc > 0;

  const notesBlock = receipt.notes?.trim()
    ? `<div class="notes-section"><div class="notes-title">${escapeHtml(notesHeading)}</div><div class="notes-body">${escapeHtml(receipt.notes.trim())}</div></div>`
    : '';

  const organizerDisplay = (
    (receipt.organizerName != null ? String(receipt.organizerName) : '') ||
    (fallbackOrganizerName != null ? String(fallbackOrganizerName) : '')
  ).trim();

  const organizerBlock = organizerDisplay
    ? `<div class="footer-small">منظم الوصل : ${escapeHtml(organizerDisplay)}</div>`
    : '';

  const discountPercentSuffix =
    hasDisc && receipt.discountPercent ? ` (${Number(receipt.discountPercent).toFixed(1)}%)` : '';
  const discountRow = hasDisc
    ? `<div class="row"><span class="label">الخصم :</span><span class="value">-${fmtNum(disc)} د.ع${discountPercentSuffix}</span></div>`
    : '';

  /** عنوان رئيسي كالمرجع: اسم الشركة أو عنوان الفاتورة */
  const headline = companyName || title;
  const subHeadline =
    companyName && title && title.trim() !== companyName.trim() ? title.trim() : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=80mm, initial-scale=1">
  <title>${escapeHtml(title)} — ${escapeHtml(receipt.receiptNumber)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&display=swap" rel="stylesheet" />
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page {
      size: 80mm auto;
      margin: 1.5mm;
    }

    body {
      margin: 0;
      font-family: Cairo, "Segoe UI", Arial, Tahoma, sans-serif;
      font-size: 12px;
      line-height: 1.35;
      color: #000;
      background: #eee;
      direction: rtl;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
    }

    .paper {
      width: 80mm;
      max-width: 80mm;
      background: #fff;
      padding: 2mm 1.5mm;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .receipt {
      page-break-inside: avoid;
    }

    .header {
      text-align: center;
      padding-bottom: 2mm;
    }

    .logo {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;
      max-height: 24mm;
      margin: 0 auto;
      object-fit: contain;
      object-position: center center;
      image-rendering: auto;
    }

    .headline {
      font-family: Cairo, "Segoe UI", Arial, Tahoma, sans-serif;
      font-size: 17px;
      font-weight: 900;
      line-height: 1.25;
      margin: 1.5mm 0 0;
      color: #000;
    }

    .subheadline {
      font-size: 11px;
      font-weight: 800;
      margin-top: 1mm;
      line-height: 1.3;
    }

    .header-line {
      font-size: 10px;
      font-weight: 700;
      margin-top: 2mm;
      line-height: 1.35;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .receipt-meta {
      font-size: 9px;
      font-weight: 700;
      margin: 2mm 0 0;
      font-family: Cairo, "Segoe UI", Arial, Tahoma, sans-serif;
    }

    .rule-thick {
      border: none;
      height: 0;
      border-top: 4px solid #000;
      margin: 2mm 0;
      width: 100%;
    }

    .body-block {
      text-align: right;
      padding: 0 0.5mm;
    }

    /**
     * تسمية + قيمة بمسافة ضيقة بينهما (بدون space-between الذي يفرّغ المنتصف).
     */
    .row {
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      align-items: flex-start;
      gap: 0.4rem;
      margin: 2.5mm 0;
      font-family: Cairo, "Segoe UI", Arial, Tahoma, sans-serif;
      font-weight: 700;
      font-size: 12px;
      line-height: 1.4;
      flex-wrap: wrap;
    }

    .row .label {
      flex: 0 0 auto;
      text-align: right;
      font-weight: 800;
    }

    .row .value {
      flex: 1 1 0;
      min-width: 0;
      text-align: right;
      word-break: break-word;
      overflow-wrap: anywhere;
      font-weight: 700;
    }

    .notes-section {
      margin: 2mm 0;
      text-align: right;
    }

    .notes-title {
      font-size: 11px;
      font-weight: 800;
      margin-bottom: 1mm;
      font-family: Cairo, "Segoe UI", Arial, Tahoma, sans-serif;
    }

    .notes-body {
      border: 1px solid #000;
      padding: 1.5mm;
      font-size: 9.5px;
      line-height: 1.35;
      white-space: pre-wrap;
      word-break: break-word;
      font-weight: 600;
    }

    .footer {
      text-align: center;
      font-size: 8.5px;
      line-height: 1.35;
      margin-top: 1.5mm;
      padding-top: 2mm;
      font-weight: 600;
      font-family: Cairo, "Segoe UI", Arial, Tahoma, sans-serif;
      color: #000;
    }

    .footer-small {
      text-align: center;
      font-size: 8px;
      margin-top: 1.5mm;
      line-height: 1.35;
      font-weight: 600;
      font-family: Cairo, "Segoe UI", Arial, Tahoma, sans-serif;
      color: #000;
    }

    @media print {
      body {
        background: #fff;
        padding: 0;
        display: block;
        min-height: 0;
      }

      .paper {
        box-shadow: none;
        padding: 1mm 1.5mm 2mm;
        margin: 0 auto;
        width: 80mm;
        max-width: 80mm;
      }

      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="paper">
  <div class="receipt">
    <div class="header">
      <img src="${escapeHtml(logoSrc)}" class="logo" alt="" />
      <div class="headline">${escapeHtml(headline)}</div>
      ${subHeadline ? `<div class="subheadline">${escapeHtml(subHeadline)}</div>` : ''}
      ${companyPhones ? `<div class="header-line">${escapeHtml(companyPhones)}</div>` : ''}
      ${companyAddress ? `<div class="header-line">${escapeHtml(companyAddress)}</div>` : ''}
    </div>
    <div class="receipt-meta">رقم الفاتورة : ${escapeHtml(receipt.receiptNumber)}</div>
    <hr class="rule-thick" />

    <div class="body-block">
      <div class="row">
        <span class="label">اسم المشترك :</span>
        <span class="value">${escapeHtml(receipt.subscriberName)}</span>
      </div>
      <div class="row">
        <span class="label">رقم الهاتف :</span>
        <span class="value">${escapeHtml(receipt.subscriberPhone)}</span>
      </div>
      <div class="row">
        <span class="label">الباقة :</span>
        <span class="value">${escapeHtml(receipt.newProfileName)}</span>
      </div>
      ${discountRow}
      <div class="row">
        <span class="label">المبلغ الواصل :</span>
        <span class="value">${fmtNum(receipt.amountPaid)} د.ع</span>
      </div>
      <div class="row">
        <span class="label">المبلغ المتبقي :</span>
        <span class="value">${fmtNum(remaining)} د.ع</span>
      </div>
      <div class="row">
        <span class="label">تاريخ التفعيل :</span>
        <span class="value">${escapeHtml(activationDateStr || '—')}</span>
      </div>
    </div>

    <hr class="rule-thick" />

    ${notesBlock}

    <div class="footer">${escapeHtml(footerLegal)}</div>
    ${organizerBlock}
  </div>
  </div>
</body>
</html>`;
}
