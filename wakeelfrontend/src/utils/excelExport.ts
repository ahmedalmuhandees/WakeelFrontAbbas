import * as XLSX from 'xlsx-js-style';
import { subscriberNoteTypeLabelAr } from './subscriberNoteTypeLabels';

const CENTER_ALIGN = {
  horizontal: 'center' as const,
  vertical: 'center' as const,
};

/**
 * إنشاء ملف Excel (xlsx) من مصفوفة صفوف
 * @param data مصفوفة ثنائية: الصف الأول = الرؤوس، الباقي = البيانات
 * @param sheetName اسم الورقة (افتراضي: Sheet1)
 * @param options تنسيق اختياري: محاذاة في الوسط وعرض الأعمدة
 */
export function createXlsxBlob(
  data: (string | number)[][],
  sheetName = 'Sheet1',
  options?: { alignCenter?: boolean; colWidths?: number[] }
): Blob {
  const ws = XLSX.utils.aoa_to_sheet(data);

  if (options?.alignCenter) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellRef];
        if (cell) {
          ws[cellRef] = {
            ...cell,
            s: {
              ...(typeof cell.s === 'object' ? cell.s : {}),
              alignment: CENTER_ALIGN,
            },
          };
        }
      }
    }
  }

  if (options?.colWidths && options.colWidths.length > 0) {
    ws['!cols'] = options.colWidths.map((w) => ({ wch: Math.max(w, 8) }));
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

const THIN_BORDER = {
  top: { style: 'thin' as const, color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin' as const, color: { rgb: 'CBD5E1' } },
  left: { style: 'thin' as const, color: { rgb: 'CBD5E1' } },
  right: { style: 'thin' as const, color: { rgb: 'CBD5E1' } },
};

const RTL = { horizontal: 'right' as const, vertical: 'center' as const, wrapText: true };
const CTR = { horizontal: 'center' as const, vertical: 'center' as const };

const SUMMARY_TOP_BORDER = {
  top: { style: 'medium' as const, color: { rgb: 'B45309' } },
  bottom: { style: 'thin' as const, color: { rgb: 'CBD5E1' } },
  left: { style: 'thin' as const, color: { rgb: 'CBD5E1' } },
  right: { style: 'thin' as const, color: { rgb: 'CBD5E1' } },
};

/**
 * تصدير «حسابات مشتركين الوكلاء»: صف عنوان (دمج A–D) عريض ووسط، صف رؤوس ملوّن، بيانات بخط عريض وحدود ومحاذاة وسط.
 * عند تمرير `bodyDataRowCount` يُفترض أن الصفوف بعد بيانات الجدول = فاصل ثم صف تذييل (مجموع الدين) في النهاية.
 */
export function createAccountsOtherDealerExcelBlob(
  data: (string | number)[][],
  options?: { sheetName?: string; colWidths?: number[]; bodyDataRowCount?: number }
): Blob {
  const sheetName = options?.sheetName ?? 'حساب';
  const bodyDataRowCount = options?.bodyDataRowCount;
  const ws = XLSX.utils.aoa_to_sheet(data);
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const maxC = Math.max(range.e.c, 3);
  const maxR = range.e.r;

  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
  ];
  let summaryRow: number | null = null;
  /** آخر صف بيانات (يشمل صف البيانات الأخير؛ إن لم توجد بيانات = 1 أي صف الرؤوس) */
  let lastDataRow = 1;

  if (bodyDataRowCount != null && data.length >= 3) {
    lastDataRow = bodyDataRowCount > 0 ? 1 + bodyDataRowCount : 1;
    summaryRow = data.length - 1;
    if (summaryRow > lastDataRow) {
      merges.push({ s: { r: summaryRow, c: 0 }, e: { r: summaryRow, c: 1 } });
    }
  }

  ws['!merges'] = merges;

  for (let R = range.s.r; R <= maxR; R += 1) {
    const isTitle = R === 0;
    const isHeader = R === 1;
    const isSummary = summaryRow != null && R === summaryRow;
    const isSpacer = summaryRow != null && R > lastDataRow && R < summaryRow;
    const isData =
      bodyDataRowCount != null
        ? R >= 2 && R <= lastDataRow && bodyDataRowCount > 0
        : R >= 2;
    const zebra = isData && (R - 2) % 2 === 1;

    for (let C = 0; C <= maxC; C += 1) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];

      let s: Record<string, unknown>;
      if (isTitle) {
        s = {
          font: { bold: true, sz: 14, color: { rgb: '0F172A' } },
          fill: { patternType: 'solid', fgColor: { rgb: 'E0E7FF' } },
          alignment: CTR,
          border: THIN_BORDER,
        };
      } else if (isHeader) {
        s = {
          font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
          fill: { patternType: 'solid', fgColor: { rgb: '1D4ED8' } },
          alignment: CTR,
          border: THIN_BORDER,
        };
      } else if (isSpacer) {
        s = {
          alignment: CTR,
          fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
        };
      } else if (isSummary) {
        const amberFill = { patternType: 'solid' as const, fgColor: { rgb: 'FEF3C7' } };
        if (C <= 1) {
          s = {
            font: { bold: true, sz: 12, color: { rgb: '78350F' }, underline: true },
            fill: amberFill,
            alignment: CTR,
            border: SUMMARY_TOP_BORDER,
          };
        } else if (C === 2) {
          s = {
            font: { bold: true, sz: 13, color: { rgb: '92400E' } },
            fill: amberFill,
            alignment: CTR,
            border: SUMMARY_TOP_BORDER,
          };
        } else {
          s = {
            fill: amberFill,
            alignment: CTR,
            border: SUMMARY_TOP_BORDER,
          };
        }
      } else {
        s = {
          font: { bold: true, sz: 11, color: { rgb: '1E293B' } },
          fill: { patternType: 'solid', fgColor: { rgb: zebra ? 'F1F5F9' : 'FFFFFF' } },
          alignment: CTR,
          border: THIN_BORDER,
        };
      }

      if (cell) {
        ws[cellRef] = {
          ...cell,
          s: {
            ...(typeof cell.s === 'object' && cell.s ? cell.s : {}),
            ...s,
          },
        };
      }
    }
  }

  if (options?.colWidths && options.colWidths.length > 0) {
    ws['!cols'] = options.colWidths.map((w) => ({ wch: Math.max(w, 8) }));
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * تقرير ديون الوكلاء: رأس ملوّن وعريض، صفوف متناوبة، صف إجمالي بلون مميز.
 * الصف الأخير = صف الإجمالي (مجموع المتبقي ومجموع الدين في العمودين الأخيرين).
 */
export function createDealerDebtsExcelBlob(
  data: (string | number)[][],
  options?: { sheetName?: string; colWidths?: number[] }
): Blob {
  const sheetName = options?.sheetName ?? 'ديون الوكيل';
  const footerRowIndex = data.length - 1;

  const ws = XLSX.utils.aoa_to_sheet(data);
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const maxC = range.e.c;

  for (let R = range.s.r; R <= range.e.r; R += 1) {
    const isHeader = R === 0;
    const isFooter = footerRowIndex >= 1 && R === footerRowIndex;
    const isData = R > 0 && !isFooter;
    const zebra = isData && R % 2 === 1;

    for (let C = 0; C <= maxC; C += 1) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      const numCol = C === 2 || C === 4 || C === 5 || C === 6;

      let s: Record<string, unknown>;

      if (isHeader) {
        s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
          fill: { patternType: 'solid', fgColor: { rgb: '1D4ED8' } },
          alignment: CTR,
          border: THIN_BORDER,
        };
      } else if (isFooter) {
        s = {
          font: { bold: true, sz: 11, color: { rgb: '78350F' } },
          fill: { patternType: 'solid', fgColor: { rgb: 'FEF3C7' } },
          alignment: numCol ? CTR : RTL,
          border: THIN_BORDER,
        };
      } else {
        s = {
          font: { bold: false, sz: 11, color: { rgb: '1E293B' } },
          fill: { patternType: 'solid', fgColor: { rgb: zebra ? 'F1F5F9' : 'FFFFFF' } },
          alignment: numCol ? CTR : RTL,
          border: THIN_BORDER,
        };
      }

      if (cell) {
        ws[cellRef] = {
          ...cell,
          s: {
            ...(typeof cell.s === 'object' && cell.s ? cell.s : {}),
            ...s,
          },
        };
      } else if (isHeader || isFooter) {
        ws[cellRef] = { t: 's', v: '', s: s as import('xlsx-js-style').CellStyle };
      }
    }
  }

  if (options?.colWidths && options.colWidths.length > 0) {
    ws['!cols'] = options.colWidths.map((w) => ({ wch: Math.max(w, 8) }));
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** نفس لون التمييز الأخضر الافتراضي في Excel (مثل الباكند: RGB 198,239,206) */
const CASHBACK_HIGHLIGHT_FILL = { patternType: 'solid' as const, fgColor: { rgb: 'C6EFCE' } };
const RTL_ALIGN = { horizontal: 'right' as const, vertical: 'center' as const };
const ACTIVATION_TYPE_COL = 1; // عمود «نوع التفعيل» (B)
const LAST_DATA_COL = 8; // I

/**
 * تقرير كاش باك من aoa: يُلوّن الصفوف حيث عمود نوع التفعيل = تطبيق الوطني او ماستر (أعمدة A–I) — نفس ftth_cashback_report.py.
 * الصف 0 = رؤوس؛ الصفوف التالية حتى نهاية المصفوفة تُعالج للتلوين حسب عمود B.
 */
export function createCashbackReportXlsxBlob(
  data: (string | number)[][],
  sheetName = 'تقرير الكاش باك',
  options?: { colWidths?: number[]; subscriberMasterActivationLabel?: string }
): Blob {
  const label = options?.subscriberMasterActivationLabel ?? 'تطبيق الوطني او ماستر';
  const ws = XLSX.utils.aoa_to_sheet(data);
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  for (let R = range.s.r; R <= range.e.r; R += 1) {
    const bRef = XLSX.utils.encode_cell({ r: R, c: ACTIVATION_TYPE_COL });
    const bCell = ws[bRef];
    const bVal = bCell?.v != null ? String(bCell.v).trim() : '';
    const highlight = R > 0 && bVal === label;

    for (let C = 0; C <= LAST_DATA_COL; C += 1) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      const baseStyle = {
        alignment: RTL_ALIGN,
        ...(R === 0 ? { font: { bold: true } } : {}),
        ...(highlight ? { fill: CASHBACK_HIGHLIGHT_FILL } : {}),
      };
      if (cell) {
        ws[cellRef] = {
          ...cell,
          s: {
            ...(typeof cell.s === 'object' && cell.s ? cell.s : {}),
            ...baseStyle,
          },
        };
      } else if (highlight) {
        ws[cellRef] = { t: 's', v: '', s: baseStyle };
      }
    }
  }

  if (options?.colWidths && options.colWidths.length > 0) {
    ws['!cols'] = options.colWidths.map((w) => ({ wch: Math.max(w, 8) }));
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function isAccountsExportSubscriberNoteTypeHeader(v: unknown): boolean {
  const s = String(v ?? '')
    .trim()
    .replace(/\s+/g, '_');
  if (!s) return false;
  const lower = s.toLowerCase();
  return lower === 'subscribernotetype' || lower === 'subscriber_note_type';
}

/** عنوان عربي لرأس العمود إن وُجد الاسم الإنجليزي من الباكند */
function accountsExportHeaderDisplayAr(v: unknown): string | undefined {
  const raw = String(v ?? '').trim();
  if (!raw) return undefined;
  const compact = raw.replace(/\s+/g, '');
  const lower = compact.toLowerCase();
  if (lower === 'subscribernotetype' || lower === 'subscriber_note_type') return 'جهة المبلغ الواصل';
  if (lower === 'subscriptiontype' || lower === 'subscription_type') return 'نوع الاشتراك';
  return undefined;
}

function formatAccountsExportSubscriberNoteTypeCell(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') {
    const t = v.trim();
    if (t !== '' && !/^\d+(\.\d+)?$/.test(t)) return t;
  }
  const n = typeof v === 'number' ? Math.round(v) : Number.parseInt(String(v).trim(), 10);
  if (Number.isFinite(n) && n >= 1 && n <= 6) return subscriberNoteTypeLabelAr(n) ?? String(v);
  return String(v);
}

/**
 * إعادة تنسيق ملف Excel القادم من GET /Accounts/export/excel: رأس أزرق، بيانات عريضة ووسط وحدود وصفوف متناوبة.
 * يتوقع الباكند عمود SubscriberNoteType (بدلاً من subscriptionType سابقاً)؛ يُعرّب عنوان العمود ويحوّل القيم 1–6 إلى نصوص عند الحاجة.
 */
export async function styleAccountsExportExcelBlob(blob: Blob): Promise<Blob> {
  const buf = await blob.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellStyles: true });
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws['!ref']) continue;
    const range = XLSX.utils.decode_range(ws['!ref']);
    const maxC = range.e.c;
    const maxR = range.e.r;

    const subscriberNoteTypeColIndices = new Set<number>();
    for (let C = range.s.c; C <= maxC; C += 1) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
      const h = ws[cellRef];
      if (h && isAccountsExportSubscriberNoteTypeHeader(h.v)) subscriberNoteTypeColIndices.add(C);
    }
    for (let C = range.s.c; C <= maxC; C += 1) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
      const cell = ws[cellRef];
      if (!cell) continue;
      const ar = accountsExportHeaderDisplayAr(cell.v);
      if (ar) {
        ws[cellRef] = { ...cell, v: ar, t: 's' };
      }
    }
    const noteTypeColsList = Array.from(subscriberNoteTypeColIndices);
    for (let R = 1; R <= maxR; R += 1) {
      for (let i = 0; i < noteTypeColsList.length; i += 1) {
        const C = noteTypeColsList[i];
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellRef];
        if (!cell || cell.v == null || cell.v === '') continue;
        const prev = cell.v;
        const next = formatAccountsExportSubscriberNoteTypeCell(prev);
        const prevComparable =
          prev == null || prev === ''
            ? ''
            : typeof prev === 'string'
              ? prev.trim()
              : String(prev);
        if (next !== prevComparable) {
          ws[cellRef] = { ...cell, v: next, t: 's' };
        }
      }
    }

    const colWch: number[] = [];
    for (let R = range.s.r; R <= maxR; R += 1) {
      const isHeader = R === 0;
      const zebra = !isHeader && R % 2 === 0;
      for (let C = range.s.c; C <= maxC; C += 1) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellRef];
        const s = isHeader
          ? {
              font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
              fill: { patternType: 'solid' as const, fgColor: { rgb: '1D4ED8' } },
              alignment: CTR,
              border: THIN_BORDER,
            }
          : {
              font: { bold: true, sz: 11, color: { rgb: '1E293B' } },
              fill: { patternType: 'solid' as const, fgColor: { rgb: zebra ? 'F1F5F9' : 'FFFFFF' } },
              alignment: CTR,
              border: THIN_BORDER,
            };
        const len = cell?.v != null ? String(cell.v).length : 0;
        colWch[C] = Math.min(52, Math.max(colWch[C] ?? 10, len + 3));
        if (cell) {
          ws[cellRef] = {
            ...cell,
            s: {
              ...(typeof cell.s === 'object' && cell.s ? cell.s : {}),
              ...s,
            },
          };
        } else {
          ws[cellRef] = { t: 's', v: '', s };
        }
      }
    }
    ws['!cols'] = colWch.map((wch) => ({ wch: Math.max(wch, 10) }));
  }
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
