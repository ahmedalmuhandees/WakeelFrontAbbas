import fiberxLogo from '../images/receipt-logos/fiberx.png';
import fiberxArLogo from '../images/receipt-logos/fiberx-ar.png';
import ministryLogo from '../images/receipt-logos/ministry.png';
import iraqiyaLogo from '../images/receipt-logos/iraqiya.png';
import otetisLogo from '../images/receipt-logos/otetis.png';
import supportLogo from '../images/receipt-logos/support-icon.png';

export type ReceiptEmbeddedLogos = {
  fiberx: string;
  fiberxAr: string;
  ministry: string;
  iraqiya: string;
  otetis: string;
  support: string;
};

const LOGO_SOURCES: ReceiptEmbeddedLogos = {
  fiberx: fiberxLogo,
  fiberxAr: fiberxArLogo,
  ministry: ministryLogo,
  iraqiya: iraqiyaLogo,
  otetis: otetisLogo,
  support: supportLogo,
};

let cached: ReceiptEmbeddedLogos | null = null;
let loading: Promise<ReceiptEmbeddedLogos> | null = null;

async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const res = await fetch(url);
  if (!res.ok) return url;
  const blob = await res.blob();
  if (!blob.size) return url;
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('read'));
    fr.readAsDataURL(blob);
  });
}

/** يحوّل شعارات الوصل إلى data URL مرة واحدة لتظهر فوراً في نافذة الطباعة */
export function ensureReceiptLogosEmbedded(): Promise<ReceiptEmbeddedLogos> {
  if (cached) return Promise.resolve(cached);
  if (!loading) {
    loading = (async () => {
      const entries = await Promise.all(
        (Object.entries(LOGO_SOURCES) as [keyof ReceiptEmbeddedLogos, string][]).map(
          async ([key, url]) => [key, await urlToDataUrl(url)] as const
        )
      );
      cached = Object.fromEntries(entries) as ReceiptEmbeddedLogos;
      return cached;
    })();
  }
  return loading;
}

/** تحميل مسبق عند بدء التطبيق — يقلّل انتظار أول طباعة */
export function preloadReceiptLogos(): void {
  void ensureReceiptLogosEmbedded();
}
