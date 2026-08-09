import type { ActivationInvoicePrintSettingsDto } from '../types';
import { buildReceipt80mmDocumentHtml } from './receipt80mmHtml';

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

/** فتح نافذة وطباعة وصل التفعيل — موحّد لطابعات POS الحرارية */
export async function printActivationReceiptDocument(
  html: string,
  existingWindow?: Window | null
): Promise<boolean> {
  const printWindow = existingWindow ?? window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  await new Promise<void>((resolve) => window.setTimeout(resolve, 200));
  await waitForDocumentImages(printWindow.document);
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
  await new Promise<void>((resolve) => window.setTimeout(resolve, 600));

  printWindow.focus();
  printWindow.print();

  const close = () => printWindow.close();
  if (typeof printWindow.onafterprint !== 'undefined') {
    printWindow.onafterprint = close;
  } else {
    window.setTimeout(close, 2000);
  }
  return true;
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
  /** معرف المستخدم / Username للعرض كـ User ID */
  userId?: string | null;
  /** مدة الاشتراك بالأيام */
  durationDays?: number | null;
  /** باقات متعددة للسند (إن وُجدت) */
  packages?: Array<{ name: string; price: number }>;
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
  const userIdRaw =
    r.userId ?? r.UserId ?? r.username ?? r.Username ?? r.subscriberUsername ?? r.SubscriberUsername;
  const durationRaw = r.durationDays ?? r.DurationDays ?? r.renewalPeriod ?? r.RenewalPeriod;
  const durationNum = durationRaw != null && durationRaw !== '' ? Number(durationRaw) : undefined;
  const profileName = String(r.newProfileName ?? r.profileName ?? '');
  const packagesRaw = r.packages ?? r.Packages;
  let packages: Array<{ name: string; price: number }> | undefined;
  if (Array.isArray(packagesRaw)) {
    packages = packagesRaw
      .map((p) => {
        if (!p || typeof p !== 'object') return null;
        const o = p as Record<string, unknown>;
        const name = String(o.name ?? o.Name ?? o.profileName ?? o.ProfileName ?? '').trim();
        const price = Number(o.price ?? o.Price ?? o.amount ?? o.Amount ?? 0);
        if (!name) return null;
        return { name, price: Number.isFinite(price) ? price : 0 };
      })
      .filter((x): x is { name: string; price: number } => x != null);
  }
  if (!packages?.length && profileName) {
    packages = [{ name: profileName, price: Number.isFinite(ap) && ap > 0 ? ap : fp }];
  }
  return {
    receiptNumber: String(r.receiptNumber ?? ''),
    renewalDate: String(r.renewalDate ?? r.issueDate ?? r.createdAt ?? ''),
    subscriberName: String(r.subscriberName ?? ''),
    subscriberPhone: String(r.subscriberPhone ?? ''),
    newProfileName: profileName,
    newExpirationDate: r.newExpirationDate != null ? String(r.newExpirationDate) : null,
    finalPrice: fp,
    amountPaid: ap,
    discountAmount: r.discountAmount != null ? Number(r.discountAmount) : 0,
    discountPercent: r.discountPercent != null ? Number(r.discountPercent) : 0,
    notes: r.notes != null ? String(r.notes) : null,
    subscriberId: r.subscriberId != null ? String(r.subscriberId) : undefined,
    userId: userIdRaw != null ? String(userIdRaw) : undefined,
    durationDays: durationNum != null && Number.isFinite(durationNum) ? durationNum : undefined,
    packages,
    remainingAmount: rem != null && !Number.isNaN(rem) ? rem : undefined,
    organizerName: organizerName || undefined,
  };
}

/**
 * مستند HTML كامل لفاتورة تفعيل / سند قبض POS 80mm (تصميم Fiber X).
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
  const { formatDate, appOrigin } = opts;

  const activationDateStr = receipt.renewalDate
    ? formatDate(receipt.renewalDate, { year: 'numeric', month: 'numeric', day: 'numeric' })
    : '';

  const packages =
    receipt.packages && receipt.packages.length > 0
      ? receipt.packages
      : [
          {
            name: receipt.newProfileName || '—',
            price:
              Number(receipt.amountPaid) > 0
                ? Number(receipt.amountPaid)
                : Number(receipt.finalPrice) || 0,
          },
        ];

  const phonesFromSettings = (settings.companyPhones || '')
    .split(/[\n,،|/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const supportNumber = phonesFromSettings[0];
  const phoneLines = phonesFromSettings.length > 1 ? phonesFromSettings.slice(1) : undefined;

  return buildReceipt80mmDocumentHtml(
    {
      receiptNo: receipt.receiptNumber || '',
      userId: (receipt.userId || '').trim() || receipt.subscriberPhone || '',
      customerName: receipt.subscriberName || '',
      amount: Number(receipt.amountPaid) || Number(receipt.finalPrice) || 0,
      packages,
      date: activationDateStr,
      supportNumber,
      phoneLines,
    },
    {
      appOrigin,
      documentTitle: `سند قبض — ${receipt.receiptNumber || ''}`,
    }
  );
}
