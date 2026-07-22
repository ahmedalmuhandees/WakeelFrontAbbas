/**
 * تقويم العراق (Asia/Baghdad) لتوحيد fromDate/toDate (لوحة التحكم)
 * وحدود createdAtFrom/createdAtTo عندما يختار المستخدم تواريخاً في واجهة التحويلات.
 */

/** اليوم الحالي كـ yyyy-MM-dd بتوقيت بغداد */
export function getBaghdadTodayYmd(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Baghdad',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    /* fall through */
  }
  return new Date().toISOString().split('T')[0];
}

/** حدود يوم تقويمي (Asia/Baghdad) كـ ISO لـ fromDate / toDate في الـ API */
export function getBaghdadDayBoundsIso(yyyyMmDd: string): { fromDate: string; toDate: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((yyyyMmDd || '').trim());
  if (!m) {
    const t = new Date();
    return { fromDate: t.toISOString(), toDate: t.toISOString() };
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    fromDate: `${y}-${pad(mo)}-${pad(d)}T00:00:00.000+03:00`,
    toDate: `${y}-${pad(mo)}-${pad(d)}T23:59:59.999+03:00`,
  };
}

/** فترة من يومين (أو يوم واحد مكرر) بنفس تنسيق +03:00 */
export function getBaghdadRangeBoundsIso(fromYmd: string, toYmd: string): { fromDate: string; toDate: string } {
  const a = (fromYmd || '').trim();
  const b = (toYmd || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(a) && /^\d{4}-\d{2}-\d{2}$/.test(b)) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const [y1, m1, d1] = a.split('-').map(Number);
    const [y2, m2, d2] = b.split('-').map(Number);
    return {
      fromDate: `${y1}-${pad(m1)}-${pad(d1)}T00:00:00.000+03:00`,
      toDate: `${y2}-${pad(m2)}-${pad(d2)}T23:59:59.999+03:00`,
    };
  }
  return getBaghdadDayBoundsIso(getBaghdadTodayYmd());
}

/** إضافة/طرح أيام تقويمية بتوقيت بغداد على yyyy-MM-dd */
export function addCalendarDaysBaghdad(ymd: string, deltaDays: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((ymd || '').trim());
  if (!m) return getBaghdadTodayYmd();
  const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+03:00`);
  dt.setDate(dt.getDate() + deltaDays);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(dt);
  const y = parts.find((p) => p.type === 'year')?.value;
  const mo = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return y && mo && d ? `${y}-${mo}-${d}` : getBaghdadTodayYmd();
}

/** افتراضي تقرير التصدير: آخر 30 يوماً تقويمياً (بغداد) شاملاً اليوم */
export function getBaghdadDefaultExportRangeLast30Days(): { fromYmd: string; toYmd: string } {
  const toYmd = getBaghdadTodayYmd();
  const fromYmd = addCalendarDaysBaghdad(toYmd, -29);
  return { fromYmd, toYmd };
}
