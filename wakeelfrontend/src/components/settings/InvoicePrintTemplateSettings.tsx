import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService, ApiService } from '../../services/api';
import { showError, showSuccess } from '../../utils/notifications';
import type { Agent } from '../../types';
import {
  DEFAULT_INVOICE_PRINT_FOOTER_LEGAL,
  type ActivationInvoicePrintSettingsDto,
  type ActivationInvoicePrintSettingsUpdate,
  type SalesInvoicePrintSettingsDto,
  type SalesInvoicePrintSettingsUpdate,
} from '../../types';
import { resolveSalesMaterialPrintTheme } from '../../utils/salesMaterialInvoicePrintHtml';
import { resolveInvoiceLogoUrl } from '../../utils/activationReceiptPrintHtml';
import { FileImage, Loader2, RefreshCw, Save, Trash2, Hash, Eye, X } from 'lucide-react';

const LOGO_MAX_BYTES = 5 * 1024 * 1024;

type Variant = 'activation' | 'sales';

export interface InvoicePrintTemplateSettingsProps {
  variant: Variant;
  /** معرّف الوكيل؛ مطلوب لجلب/حفظ القالب */
  agentId: string | null;
  isAdmin: boolean;
  agents: Agent[];
  adminAgentId: string;
  onAdminAgentIdChange: (id: string) => void;
}

function emptyActivation(): ActivationInvoicePrintSettingsUpdate {
  return {
    invoiceTitle: '',
    companyName: '',
    companyAddress: '',
    companyPhones: '',
    notesSectionHeading: '',
  };
}

function emptySalesExtra(): SalesInvoicePrintSettingsUpdate {
  return {
    columnSerialLabel: '',
    columnProductNameLabel: '',
    columnQuantityLabel: '',
    columnMaterialPriceLabel: '',
    columnMaterialNotesLabel: '',
    columnLineTotalLabel: '',
    summaryTotalAmountLabel: '',
    summaryPaidAmountLabel: '',
    summaryRemainingAmountLabel: '',
    pageSize: 'A4',
    headerLogoPosition: 'left',
    logoPrintGrayscale: true,
    showFooterLegal: true,
  };
}

function parseOptionalMm(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalPx(v: string): number | undefined {
  return parseOptionalMm(v);
}

function normalizeHexColor(v: string | null | undefined): string | undefined {
  const t = (v ?? '').trim();
  if (!t) return undefined;
  return /^#[0-9A-Fa-f]{6}$/.test(t) ? t : undefined;
}

export const InvoicePrintTemplateSettings: React.FC<InvoicePrintTemplateSettingsProps> = ({
  variant,
  agentId,
  isAdmin,
  agents,
  adminAgentId,
  onAdminAgentIdChange,
}) => {
  const queryClient = useQueryClient();
  const effectiveId = isAdmin ? adminAgentId.trim() : agentId?.trim() ?? '';
  const enabled = Boolean(effectiveId);

  const [form, setForm] = useState<ActivationInvoicePrintSettingsUpdate & SalesInvoicePrintSettingsUpdate>(() => ({
    ...emptyActivation(),
    ...emptySalesExtra(),
  }));
  const [sampleInvoiceNo, setSampleInvoiceNo] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const queryKey = ['invoice-print-settings', variant, effectiveId] as const;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      variant === 'activation'
        ? apiService.getActivationInvoicePrintSettings(effectiveId)
        : apiService.getSalesInvoicePrintSettings(effectiveId),
    enabled,
  });

  useEffect(() => {
    if (!data) return;
    const d = data as SalesInvoicePrintSettingsDto;
    setForm({
      invoiceTitle: d.invoiceTitle ?? '',
      companyName: d.companyName ?? '',
      companyAddress: d.companyAddress ?? '',
      companyPhones: d.companyPhones ?? '',
      notesSectionHeading: d.notesSectionHeading ?? '',
      ...(variant === 'sales'
        ? {
            columnSerialLabel: d.columnSerialLabel ?? '',
            columnProductNameLabel: d.columnProductNameLabel ?? '',
            columnQuantityLabel: d.columnQuantityLabel ?? '',
            columnMaterialPriceLabel: d.columnMaterialPriceLabel ?? '',
            columnMaterialNotesLabel: d.columnMaterialNotesLabel ?? '',
            columnLineTotalLabel: d.columnLineTotalLabel ?? '',
            summaryTotalAmountLabel: d.summaryTotalAmountLabel ?? '',
            summaryPaidAmountLabel: d.summaryPaidAmountLabel ?? '',
            summaryRemainingAmountLabel: d.summaryRemainingAmountLabel ?? '',
            pageSize: (d.pageSize ?? 'A4').toString().toUpperCase() === 'A5' ? 'A5' : 'A4',
            marginTopMm: d.marginTopMm,
            marginRightMm: d.marginRightMm,
            marginBottomMm: d.marginBottomMm,
            marginLeftMm: d.marginLeftMm,
            accentColor: d.accentColor ?? '',
            textColor: d.textColor ?? '',
            borderColor: d.borderColor ?? '',
            tableHeaderTextColor: d.tableHeaderTextColor ?? '',
            invoiceNumberColor: d.invoiceNumberColor ?? '',
            baseFontSizePx: d.baseFontSizePx,
            companyNameFontSizePx: d.companyNameFontSizePx,
            logoMaxHeightPx: d.logoMaxHeightPx,
            logoMaxWidthPx: d.logoMaxWidthPx,
            logoPrintGrayscale: d.logoPrintGrayscale !== false,
            headerLogoPosition:
              (d.headerLogoPosition ?? 'left').toLowerCase() === 'right' || d.headerLogoPosition === 'يمين'
                ? 'right'
                : 'left',
            showFooterLegal: d.showFooterLegal !== false,
          }
        : {}),
    });
  }, [data, variant]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const base: ActivationInvoicePrintSettingsUpdate = {
        invoiceTitle: form.invoiceTitle?.trim() || undefined,
        companyName: form.companyName?.trim() || undefined,
        companyAddress: form.companyAddress?.trim() || undefined,
        companyPhones: form.companyPhones?.trim() || undefined,
        notesSectionHeading: form.notesSectionHeading?.trim() || undefined,
      };
      if (variant === 'activation') {
        await apiService.updateActivationInvoicePrintSettings(base, effectiveId);
        return;
      }
      const salesBody: SalesInvoicePrintSettingsUpdate = {
        ...base,
        columnSerialLabel: form.columnSerialLabel?.trim() || undefined,
        columnProductNameLabel: form.columnProductNameLabel?.trim() || undefined,
        columnQuantityLabel: form.columnQuantityLabel?.trim() || undefined,
        columnMaterialPriceLabel: form.columnMaterialPriceLabel?.trim() || undefined,
        columnMaterialNotesLabel: form.columnMaterialNotesLabel?.trim() || undefined,
        columnLineTotalLabel: form.columnLineTotalLabel?.trim() || undefined,
        summaryTotalAmountLabel: form.summaryTotalAmountLabel?.trim() || undefined,
        summaryPaidAmountLabel: form.summaryPaidAmountLabel?.trim() || undefined,
        summaryRemainingAmountLabel: form.summaryRemainingAmountLabel?.trim() || undefined,
        pageSize: form.pageSize === 'A5' ? 'A5' : 'A4',
        marginTopMm: parseOptionalMm(String(form.marginTopMm ?? '')),
        marginRightMm: parseOptionalMm(String(form.marginRightMm ?? '')),
        marginBottomMm: parseOptionalMm(String(form.marginBottomMm ?? '')),
        marginLeftMm: parseOptionalMm(String(form.marginLeftMm ?? '')),
        accentColor: normalizeHexColor(form.accentColor),
        textColor: normalizeHexColor(form.textColor),
        borderColor: normalizeHexColor(form.borderColor),
        tableHeaderTextColor: normalizeHexColor(form.tableHeaderTextColor),
        invoiceNumberColor: normalizeHexColor(form.invoiceNumberColor),
        baseFontSizePx: parseOptionalPx(String(form.baseFontSizePx ?? '')),
        companyNameFontSizePx: parseOptionalPx(String(form.companyNameFontSizePx ?? '')),
        logoMaxHeightPx: parseOptionalPx(String(form.logoMaxHeightPx ?? '')),
        logoMaxWidthPx: parseOptionalPx(String(form.logoMaxWidthPx ?? '')),
        logoPrintGrayscale: form.logoPrintGrayscale !== false,
        headerLogoPosition: form.headerLogoPosition === 'right' ? 'right' : 'left',
        showFooterLegal: form.showFooterLegal !== false,
      };
      await apiService.updateSalesInvoicePrintSettings(salesBody, effectiveId);
    },
    onSuccess: () => {
      showSuccess('تم الحفظ', 'تم تحديث إعدادات القالب.');
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: unknown) => {
      showError('فشل الحفظ', ApiService.showError(err));
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) =>
      variant === 'activation'
        ? apiService.uploadActivationInvoiceLogo(file, effectiveId)
        : apiService.uploadSalesInvoiceLogo(file, effectiveId),
    onSuccess: () => {
      showSuccess('الشعار', 'تم رفع الشعار.');
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: unknown) => showError('رفع الشعار', ApiService.showError(err)),
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () =>
      variant === 'activation'
        ? apiService.deleteActivationInvoiceLogo(effectiveId)
        : apiService.deleteSalesInvoiceLogo(effectiveId),
    onSuccess: () => {
      showSuccess('الشعار', 'تم حذف الشعار.');
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: unknown) => showError('حذف الشعار', ApiService.showError(err)),
  });

  const generateNoMutation = useMutation({
    mutationFn: () => apiService.generateInvoicePrintNumber(),
    onSuccess: (n) => setSampleInvoiceNo(n),
    onError: (err: unknown) => showError('رقم الفاتورة', ApiService.showError(err)),
  });

  const logoUrl = (data as ActivationInvoicePrintSettingsDto | undefined)?.logoUrl?.trim();
  const hasSaved = (data as ActivationInvoicePrintSettingsDto | undefined)?.hasSavedSettings;

  const displayLogoUrl = React.useMemo(() => {
    if (!logoUrl) return null;
    return (
      resolveInvoiceLogoUrl(logoUrl, {
        appOrigin: typeof window !== 'undefined' ? window.location.origin : '',
        apiBaseUrl: apiService.getBaseURL(),
      }) ?? logoUrl
    );
  }, [logoUrl]);

  const title =
    variant === 'activation' ? 'إعدادات قالب فاتورة التفعيل' : 'إعدادات قالب فاتورة المبيعات';

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white text-sm';

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      showError('الشعار', 'يُسمح بملفات الصور فقط.');
      return;
    }
    if (f.size > LOGO_MAX_BYTES) {
      showError('الشعار', 'الحد الأقصى لحجم الملف 5 ميجابايت.');
      return;
    }
    uploadLogoMutation.mutate(f);
  };

  const busy =
    saveMutation.isPending ||
    uploadLogoMutation.isPending ||
    deleteLogoMutation.isPending ||
    generateNoMutation.isPending;

  const previewInvoiceNumber = sampleInvoiceNo?.trim() || 'wk12345678';
  const previewFooterLegal = DEFAULT_INVOICE_PRINT_FOOTER_LEGAL;

  const salesCol = (key: keyof SalesInvoicePrintSettingsUpdate, fallback: string) => {
    const v = (form as Record<string, string | undefined>)[key];
    return (typeof v === 'string' && v.trim() ? v : fallback);
  };

  const previewTheme = React.useMemo(() => {
    if (variant !== 'sales') return null;
    return resolveSalesMaterialPrintTheme({
      ...(data as SalesInvoicePrintSettingsDto | undefined),
      ...form,
    } as SalesInvoicePrintSettingsDto);
  }, [variant, data, form]);

  if (isAdmin && !adminAgentId.trim()) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الوكيل</label>
          <select
            value={adminAgentId}
            onChange={(e) => onAdminAgentIdChange(e.target.value)}
            className={inputCls}
          >
            <option value="">— اختر الوكيل —</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.companyName?.trim() || a.fullName || a.username || a.id}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-amber-800 dark:text-amber-200">
          اختر الوكيل لعرض وتعديل قالب {variant === 'activation' ? 'فاتورة التفعيل' : 'فاتورة المبيعات'}.
        </p>
      </div>
    );
  }

  if (!isAdmin && !agentId?.trim()) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        جاري تحميل بيانات الوكيل…
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">تعذر تحديد الوكيل. يرجى إعادة تحميل الصفحة.</p>
      </div>
    );
  }

  return (
    <>
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      {isAdmin && (
        <div className="max-w-md">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الوكيل</label>
          <select
            value={adminAgentId}
            onChange={(e) => onAdminAgentIdChange(e.target.value)}
            className={inputCls}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.companyName?.trim() || a.fullName || a.username || a.id}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileImage className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            {title}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            يُستخدم القالب عند طباعة الفاتورة من الواجهة. الحقول الديناميكية (اسم العميل، الأسعار، الجدول…) تُملأ عند الطباعة
            ولا تُخزَّن هنا.
          </p>
          {hasSaved === false && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 rounded-md bg-amber-50 dark:bg-amber-900/20 px-2 py-1 inline-block">
              لم تُحفظ إعدادات مخصصة بعد — تُعرض القيم الافتراضية من الخادم حتى تحفظ.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => generateNoMutation.mutate()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {generateNoMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Hash className="h-4 w-4" />
            )}
            توليد رقم فاتورة (wk…)
          </button>
          {sampleInvoiceNo && (
            <code className="text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
              {sampleInvoiceNo}
            </code>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري تحميل الإعدادات…
        </div>
      )}
      {isError && (
        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {ApiService.showError(error)}
          <button
            type="button"
            onClick={() => refetch()}
            className="mr-2 underline"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {!isLoading && (
        <>
          <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">الشعار</h3>
            <div className="flex flex-wrap items-end gap-4">
              {logoUrl ? (
                <div className="relative">
                  <img
                    src={displayLogoUrl ?? logoUrl}
                    alt="شعار الفاتورة"
                    className="h-20 max-w-[200px] object-contain rounded border border-gray-200 dark:border-gray-600 bg-white"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">لا يوجد شعار مرفوع.</span>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary-600 hover:bg-primary-700 text-white cursor-pointer disabled:opacity-50">
                <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={onFile} />
                رفع صورة (حد أقصى 5 ميجابايت)
              </label>
              {logoUrl && (
                <button
                  type="button"
                  disabled={busy || deleteLogoMutation.isPending}
                  onClick={() => deleteLogoMutation.mutate()}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md border border-red-300 text-red-700 dark:border-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف الشعار
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">عنوان الفاتورة</label>
              <input
                className={inputCls}
                value={form.invoiceTitle ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, invoiceTitle: e.target.value }))}
                placeholder="مثال: فاتورة تفعيل"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">اسم الشركة</label>
              <input
                className={inputCls}
                value={form.companyName ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">هواتف الشركة</label>
              <input
                className={inputCls}
                value={form.companyPhones ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, companyPhones: e.target.value }))}
                placeholder="مفصولة بفواصل أو أسطر"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">عنوان الشركة</label>
              <textarea
                className={`${inputCls} min-h-[72px]`}
                value={form.companyAddress ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, companyAddress: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">عنوان قسم الملاحظات</label>
              <input
                className={inputCls}
                value={form.notesSectionHeading ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, notesSectionHeading: e.target.value }))}
              />
            </div>
          </div>

          {variant === 'sales' && (
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 p-4 space-y-4 bg-indigo-50/40 dark:bg-indigo-900/10">
              <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">تسميات أعمدة جدول المواد</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(
                  [
                    ['columnSerialLabel', 'تسلسل'],
                    ['columnProductNameLabel', 'اسم المنتج'],
                    ['columnQuantityLabel', 'الكمية'],
                    ['columnMaterialPriceLabel', 'سعر المادة'],
                    ['columnMaterialNotesLabel', 'ملاحظات المادة'],
                    ['columnLineTotalLabel', 'المبلغ الكلي (السطر)'],
                  ] as const
                ).map(([key, ph]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{ph}</label>
                    <input
                      className={inputCls}
                      value={(form as Record<string, string | undefined>)[key] ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 pt-2">تسميات أسفل الجدول</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    ['summaryTotalAmountLabel', 'المبلغ الكلي'],
                    ['summaryPaidAmountLabel', 'مبلغ الواصل'],
                    ['summaryRemainingAmountLabel', 'مبلغ المتبقي'],
                  ] as const
                ).map(([key, ph]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{ph}</label>
                    <input
                      className={inputCls}
                      value={(form as Record<string, string | undefined>)[key] ?? ''}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {variant === 'sales' && (
            <div className="rounded-lg border border-teal-200 dark:border-teal-800 p-4 space-y-4 bg-teal-50/40 dark:bg-teal-900/10">
              <h3 className="text-sm font-semibold text-teal-900 dark:text-teal-100">مظهر الطباعة (الورقة والألوان)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">حجم الورقة</label>
                  <select
                    className={inputCls}
                    value={form.pageSize === 'A5' ? 'A5' : 'A4'}
                    onChange={(e) => setForm((p) => ({ ...p, pageSize: e.target.value === 'A5' ? 'A5' : 'A4' }))}
                  >
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">هامش علوي (مم)</label>
                  <input
                    type="number"
                    min={4}
                    max={25}
                    step={0.5}
                    className={inputCls}
                    value={form.marginTopMm ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        marginTopMm: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">هامش يمين (مم)</label>
                  <input
                    type="number"
                    min={4}
                    max={25}
                    step={0.5}
                    className={inputCls}
                    value={form.marginRightMm ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        marginRightMm: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">هامش أسفل (مم)</label>
                  <input
                    type="number"
                    min={4}
                    max={25}
                    step={0.5}
                    className={inputCls}
                    value={form.marginBottomMm ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        marginBottomMm: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">هامش يسار (مم)</label>
                  <input
                    type="number"
                    min={4}
                    max={25}
                    step={0.5}
                    className={inputCls}
                    value={form.marginLeftMm ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        marginLeftMm: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">موضع الشعار</label>
                  <select
                    className={inputCls}
                    value={form.headerLogoPosition === 'right' ? 'right' : 'left'}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, headerLogoPosition: e.target.value === 'right' ? 'right' : 'left' }))
                    }
                  >
                    <option value="left">يسار الورقة</option>
                    <option value="right">يمين الورقة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">حجم الخط الأساسي (px)</label>
                  <input
                    type="number"
                    min={9}
                    max={16}
                    className={inputCls}
                    value={form.baseFontSizePx ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        baseFontSizePx: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder="11"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">حجم اسم الشركة (px)</label>
                  <input
                    type="number"
                    min={14}
                    max={36}
                    className={inputCls}
                    value={form.companyNameFontSizePx ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        companyNameFontSizePx: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder="22"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">أقصى ارتفاع للشعار (px)</label>
                  <input
                    type="number"
                    min={40}
                    max={200}
                    className={inputCls}
                    value={form.logoMaxHeightPx ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        logoMaxHeightPx: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder="104"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">أقصى عرض للشعار (px)</label>
                  <input
                    type="number"
                    min={80}
                    max={400}
                    className={inputCls}
                    value={form.logoMaxWidthPx ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        logoMaxWidthPx: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder="220"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={form.logoPrintGrayscale !== false}
                    onChange={(e) => setForm((p) => ({ ...p, logoPrintGrayscale: e.target.checked }))}
                  />
                  طباعة الشعار أبيض وأسود
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={form.showFooterLegal !== false}
                    onChange={(e) => setForm((p) => ({ ...p, showFooterLegal: e.target.checked }))}
                  />
                  إظهار النص القانوني في التذييل
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(
                  [
                    ['accentColor', 'لون التمييز (رأس الجدول)', '#c00000'],
                    ['textColor', 'لون النص', '#111111'],
                    ['borderColor', 'لون الحدود', '#333333'],
                    ['tableHeaderTextColor', 'نص رأس الجدول', '#ffffff'],
                    ['invoiceNumberColor', 'لون سطر رقم الفاتورة', '#c00000'],
                  ] as const
                ).map(([key, label, ph]) => {
                  const raw = (form as Record<string, string | undefined>)[key] ?? '';
                  const safePick = normalizeHexColor(raw) ?? ph;
                  return (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          className="h-10 w-14 rounded border border-gray-300 dark:border-gray-600 cursor-pointer shrink-0"
                          value={safePick}
                          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                          aria-label={label}
                        />
                        <input
                          className={`${inputCls} flex-1 font-mono text-xs`}
                          value={raw}
                          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                          placeholder={ph}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                الألوان بصيغة #RRGGBB (ستُرسل للخادم عند الحفظ). اترك الحقول فارغة لاستخدام الافتراضي بعد الحفظ من الخادم.
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              disabled={busy}
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة التحميل
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            >
              <Eye className="h-4 w-4" />
              معاينة الفاتورة
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => saveMutation.mutate()}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm rounded-md bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ القالب
            </button>
          </div>
        </>
      )}
    </div>

    {previewOpen && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-print-preview-title"
        onClick={() => setPreviewOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setPreviewOpen(false);
        }}
      >
        <div
          className="relative max-h-[92vh] overflow-y-auto w-full max-w-3xl rounded-xl bg-white text-gray-900 shadow-2xl border border-gray-200"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
            <h3 id="invoice-print-preview-title" className="text-sm font-semibold text-gray-800">
              معاينة الفاتورة (بيانات تجريبية)
            </h3>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-200"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 space-y-5 text-sm leading-relaxed">
            <div className="flex flex-col items-center gap-3 border-b border-dashed border-gray-200 pb-4">
              {logoUrl ? (
                <img
                  src={displayLogoUrl ?? logoUrl}
                  alt=""
                  className="h-16 max-w-[220px] object-contain"
                  style={
                    variant === 'sales' && previewTheme && previewTheme.logoGrayscale
                      ? { filter: 'grayscale(100%)' }
                      : undefined
                  }
                />
              ) : (
                <div className="h-14 w-28 rounded border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                  بدون شعار
                </div>
              )}
              <h4 className="text-lg font-bold text-center">
                {(form.invoiceTitle?.trim() || (variant === 'activation' ? 'فاتورة تفعيل' : 'فاتورة مبيعات'))}
              </h4>
              {form.companyName?.trim() && (
                <p
                  className="font-semibold text-center"
                  style={
                    variant === 'sales' && previewTheme ? { color: previewTheme.text, fontSize: previewTheme.companyFs } : undefined
                  }
                >
                  {form.companyName.trim()}
                </p>
              )}
              {form.companyAddress?.trim() && (
                <p className="text-center text-gray-600 whitespace-pre-wrap max-w-lg">{form.companyAddress.trim()}</p>
              )}
              {form.companyPhones?.trim() && (
                <p className="text-center text-gray-600 whitespace-pre-wrap">{form.companyPhones.trim()}</p>
              )}
            </div>

            <div
              className="flex flex-wrap gap-3 justify-between text-gray-700"
              style={variant === 'sales' && previewTheme ? { color: previewTheme.text } : undefined}
            >
              <span>
                <span className="text-gray-500">رقم الفاتورة:</span>{' '}
                <strong
                  className="font-mono"
                  style={variant === 'sales' && previewTheme ? { color: previewTheme.invoiceNum } : undefined}
                >
                  {previewInvoiceNumber}
                </strong>
              </span>
              <span className="text-gray-500">تاريخ: 2026/04/12 (تجريبي)</span>
            </div>

            {variant === 'activation' ? (
              <div className="space-y-3 rounded-lg border border-gray-200 p-4 bg-gray-50/80">
                <p><span className="text-gray-500">اسم العميل:</span> عميل تجريبي</p>
                <p><span className="text-gray-500">هاتف المشترك:</span> 07xx xxx xxxx</p>
                <p><span className="text-gray-500">الباقة:</span> باقة تجريبية</p>
                <p><span className="text-gray-500">تاريخ الانتهاء:</span> 2026-12-31</p>
                <p><span className="text-gray-500">المبلغ الكلي:</span> 50,000 د.ع</p>
                <p><span className="text-gray-500">الواصل:</span> 30,000 د.ع</p>
                <p><span className="text-gray-500">المتبقي:</span> 20,000 د.ع</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[520px] text-right border-collapse">
                    <thead>
                      <tr
                        className="font-medium text-xs"
                        style={
                          previewTheme
                            ? {
                                backgroundColor: previewTheme.accent,
                                color: previewTheme.headerText,
                              }
                            : { backgroundColor: '#f3f4f6', color: '#1f2937' }
                        }
                      >
                        <th className="p-2 border-b border-gray-200">{salesCol('columnSerialLabel', 'تسلسل')}</th>
                        <th className="p-2 border-b border-gray-200">{salesCol('columnProductNameLabel', 'اسم المنتج')}</th>
                        <th className="p-2 border-b border-gray-200">{salesCol('columnQuantityLabel', 'الكمية')}</th>
                        <th className="p-2 border-b border-gray-200">{salesCol('columnMaterialPriceLabel', 'سعر المادة')}</th>
                        <th className="p-2 border-b border-gray-200">{salesCol('columnMaterialNotesLabel', 'ملاحظات المادة')}</th>
                        <th className="p-2 border-b border-gray-200">{salesCol('columnLineTotalLabel', 'المبلغ الكلي')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-800">
                      <tr className="border-b border-gray-100">
                        <td className="p-2">1</td>
                        <td className="p-2">مادة أ</td>
                        <td className="p-2">2</td>
                        <td className="p-2">10,000</td>
                        <td className="p-2">—</td>
                        <td className="p-2 font-medium">20,000</td>
                      </tr>
                      <tr>
                        <td className="p-2">2</td>
                        <td className="p-2">مادة ب</td>
                        <td className="p-2">1</td>
                        <td className="p-2">15,000</td>
                        <td className="p-2">تجريبي</td>
                        <td className="p-2 font-medium">15,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="space-y-1 rounded-lg border border-gray-200 p-4 bg-gray-50/80 max-w-md mr-auto">
                  <p>
                    <span className="text-gray-600">{salesCol('summaryTotalAmountLabel', 'المبلغ الكلي')}:</span>{' '}
                    <strong style={previewTheme ? { color: previewTheme.text } : undefined}>35,000 د.ع</strong>
                  </p>
                  <p>
                    <span className="text-gray-600">{salesCol('summaryPaidAmountLabel', 'مبلغ الواصل')}:</span>{' '}
                    <strong style={previewTheme ? { color: previewTheme.text } : undefined}>20,000 د.ع</strong>
                  </p>
                  <p>
                    <span className="text-gray-600">{salesCol('summaryRemainingAmountLabel', 'مبلغ المتبقي')}:</span>{' '}
                    <strong style={previewTheme ? { color: previewTheme.accent } : undefined}>15,000 د.ع</strong>
                  </p>
                </div>
              </>
            )}

            <div className="rounded-lg border border-gray-200 p-3 bg-white">
              <p className="text-xs font-semibold text-gray-500 mb-1">
                {form.notesSectionHeading?.trim() || 'ملاحظات'}
              </p>
              <p className="text-gray-600 text-xs">نص ملاحظات تجريبي يظهر هنا عند الطباعة الفعلية.</p>
            </div>

            {!(variant === 'sales' && form.showFooterLegal === false) && (
              <p className="text-center text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                {previewFooterLegal}
              </p>
            )}
          </div>
          <div className="sticky bottom-0 flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="px-4 py-2 text-sm rounded-md bg-primary-600 hover:bg-primary-700 text-white"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
