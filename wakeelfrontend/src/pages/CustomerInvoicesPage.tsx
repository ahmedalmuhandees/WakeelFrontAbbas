import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useDigits } from '../contexts/DigitsContext';
import { apiService, ApiService } from '../services/api';
import { showError, showSuccess } from '../utils/notifications';
import { saveCustomerInvoiceCashReceiptPdf } from '../utils/customerCashReceiptPrint';
import {
  Agent,
  CustomerInvoiceCustomerCreateDto,
  CustomerInvoiceCustomerDto,
  CustomerInvoiceCustomerGroupDto,
  CustomerInvoiceCustomerType,
  CustomerInvoiceCompanyDebtCreateDto,
  CustomerInvoiceJournalEntryCreateDto,
  CustomerInvoiceDetailDto,
  CustomerInvoicePaymentMethod,
  CustomerInvoiceRecordCreateDto,
  CustomerInvoiceRecordDto,
  CustomerInvoiceStatisticsDto,
  TenantPlanType,
  UserRole,
} from '../types';
import WifiLoaderComponent from '../components/WifiLoaderComponent';
import Pagination from '../components/Pagination';
import {
  Banknote,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Filter,
  Landmark,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  X,
} from 'lucide-react';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCustomerInvoicePrintHtml(
  invoice: CustomerInvoiceRecordDto,
  customer: Pick<CustomerInvoiceCustomerDto, 'customerName' | 'phoneNumber' | 'address' | 'customerType'>,
  formatDate: (d: Date | string, options?: Intl.DateTimeFormatOptions) => string,
  formatNumber: (n: number, o?: { suffix?: string }) => string,
  customerTypeLabel: string,
  paymentLabel: string
): string {
  const dateStr = invoice.createdAt
    ? formatDate(invoice.createdAt, { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '—';
  const bal = formatNumber(invoice.balanceAmount ?? 0, { suffix: ' د.ع' });
  const tr = formatNumber(invoice.transferAmount ?? 0, { suffix: ' د.ع' });
  const debt = formatNumber(invoice.debtAmount ?? 0, { suffix: ' د.ع' });
  const paid = formatNumber(invoice.debtPaid ?? 0, { suffix: ' د.ع' });
  const rem = formatNumber(invoice.debtRemaining ?? 0, { suffix: ' د.ع' });
  const notesRaw = (invoice.notes ?? '').trim();
  const notesSection = notesRaw
    ? `<div class="section"><h3>ملاحظات</h3><p class="notes-text">${escapeHtml(notesRaw)}</p></div>`
    : '';

  const styles = `
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: white;
              color: #333;
              direction: rtl;
              font-size: 7px;
              line-height: 1.2;
            }
            .receipt {
              width: 46mm;
              max-width: 46mm;
              padding: 1.5mm;
              background: white;
              border: none;
            }
            .header {
              text-align: center;
              border-bottom: 1px solid #333;
              padding-bottom: 2mm;
              margin-bottom: 2mm;
            }
            .header h1 { margin: 0; font-size: 9px; font-weight: bold; }
            .header p { margin: 1px 0; font-size: 6px; }
            .section { margin-bottom: 2mm; }
            .section h3 { margin: 0 0 1mm 0; font-size: 7px; border-bottom: 1px solid #ddd; padding-bottom: 0.5mm; }
            .info-row { display: flex; justify-content: space-between; margin: 0.5mm 0; padding: 0; font-size: 6px; gap: 1mm; }
            .info-row:nth-child(even) { background: #f5f5f5; }
            .label { font-weight: bold; flex-shrink: 0; }
            .value { text-align: left; word-break: break-word; }
            .pricing { background: #eee; padding: 1.5mm; border-radius: 1px; margin: 1.5mm 0; }
            .pricing .info-row { margin: 0.3mm 0; }
            .notes-text { margin: 0; font-size: 6px; white-space: pre-wrap; word-break: break-word; }
            .footer { text-align: center; margin-top: 2mm; padding-top: 1mm; border-top: 1px solid #ddd; font-size: 5px; }
            .footer p { margin: 0.5px 0; }
            @media print {
              @page { size: 50mm 80mm; margin: 1mm; }
              body { margin: 0; padding: 0; width: 50mm; min-height: 80mm; max-width: 50mm; overflow: hidden; font-size: 6px; }
              .receipt { width: 48mm; max-width: 48mm; padding: 1mm; font-size: 6px; }
              .header h1 { font-size: 8px; }
              .header p { font-size: 5px; }
              .section h3 { font-size: 6px; }
              .info-row { font-size: 5px; }
              .pricing { padding: 1mm; }
              .footer { font-size: 5px; margin-top: 1mm; }
            }
  `;

  const addr = (customer.address ?? '').trim();
  const phone = (customer.phoneNumber ?? '').trim();

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة عميل — ${escapeHtml(invoice.id)}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>فاتورة عميل</h1>
      <p><strong>رقم المرجع:</strong> ${escapeHtml(invoice.id)}</p>
      <p><strong>التاريخ:</strong> ${escapeHtml(dateStr)}</p>
    </div>
    <div class="section">
      <h3>بيانات العميل</h3>
      <div class="info-row"><span class="label">الاسم:</span><span class="value">${escapeHtml(customer.customerName)}</span></div>
      ${phone ? `<div class="info-row"><span class="label">الهاتف:</span><span class="value">${escapeHtml(phone)}</span></div>` : ''}
      ${addr ? `<div class="info-row"><span class="label">العنوان:</span><span class="value">${escapeHtml(addr)}</span></div>` : ''}
      <div class="info-row"><span class="label">نوع العميل:</span><span class="value">${escapeHtml(customerTypeLabel)}</span></div>
      <div class="info-row"><span class="label">طريقة الدفع:</span><span class="value">${escapeHtml(paymentLabel)}</span></div>
    </div>
    <div class="pricing">
      <h3>المبالغ</h3>
      <div class="info-row"><span class="label"> المبلغ:</span><span class="value">${escapeHtml(bal)}</span></div>
      <div class="info-row"><span class="label">مبلغ الواصل:</span><span class="value">${escapeHtml(tr)}</span></div>
      <div class="info-row"><span class="label">مبلغ الدين:</span><span class="value">${escapeHtml(debt)}</span></div>
      <div class="info-row"><span class="label">المسدد من الدين:</span><span class="value">${escapeHtml(paid)}</span></div>
      <div class="info-row"><span class="label">متبقي الدين:</span><span class="value">${escapeHtml(rem)}</span></div>
    </div>
    ${notesSection}
    <div class="footer">
      <p>فاتورة عملاء — نفس قياس فاتورة التفعيل</p>
    </div>
  </div>
</body>
</html>`;
}

const CUSTOMER_TYPE_LABELS: Record<number, string> = {
  [CustomerInvoiceCustomerType.NewCustomer]: 'عميل جديد',
  [CustomerInvoiceCustomerType.Agent]: 'وكيل',
};

const PAYMENT_METHOD_LABELS: Record<number, string> = {
  [CustomerInvoicePaymentMethod.Cash]: 'نقد',
  [CustomerInvoicePaymentMethod.MasterCard]: 'Master Card',
  [CustomerInvoicePaymentMethod.ZainCash]: 'Zain Cash',
  [CustomerInvoicePaymentMethod.Other]: 'أخرى',
};

function emptyCustomerForm(): CustomerInvoiceCustomerCreateDto {
  return {
    customerName: '',
    phoneNumber: '',
    address: '',
    customerType: CustomerInvoiceCustomerType.NewCustomer,
  };
}

function customerToForm(c: CustomerInvoiceCustomerDto): CustomerInvoiceCustomerCreateDto {
  return {
    customerName: c.customerName,
    phoneNumber: c.phoneNumber ?? '',
    address: c.address ?? '',
    customerType: Number(c.customerType) as CustomerInvoiceCustomerType,
  };
}

function emptyInvoiceForm(): CustomerInvoiceRecordCreateDto {
  return {
    balanceAmount: 0,
    transferAmount: 0,
    paymentMethod: CustomerInvoicePaymentMethod.Cash,
    notes: '',
  };
}

function emptyCompanyDebtForm(): CustomerInvoiceCompanyDebtCreateDto {
  return {
    customerName: '',
    debtAmount: 0,
    debtDate: new Date().toISOString().split('T')[0],
    notes: '',
  };
}

const JOURNAL_ENTRY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type JournalEntryModalForm = {
  fromCustomerId: string;
  toCustomerId: string;
  amount: number;
  dateLocal: string;
  notes: string;
};

function emptyJournalEntryForm(): JournalEntryModalForm {
  return {
    fromCustomerId: '',
    toCustomerId: '',
    amount: 0,
    dateLocal: toDatetimeLocalValue(new Date()),
    notes: '',
  };
}

type JournalComboOption = {
  id: string;
  label: string;
  hint?: string;
  searchText: string;
  /** عرض إجمالي الدين والمتبقي (عملاء القيد المحاسبي فقط) */
  debtCaption?: string;
};

type JournalComboFieldProps = {
  label: string;
  value: string;
  onChange: (nextId: string) => void;
  options: JournalComboOption[];
  disabled?: boolean;
  placeholder?: string;
  emptyListText?: string;
  /** عند الكتابة يُلغى المعرف المختار (مناسب لاختيار العميل) */
  clearIdOnType?: boolean;
  allowClear?: boolean;
};

function JournalComboField({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder = 'ابحث بالاسم...',
  emptyListText = 'لا توجد نتائج',
  clearIdOnType = true,
  allowClear = true,
}: JournalComboFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = useMemo(() => options.find((o) => o.id === value), [options, value]);

  useEffect(() => {
    if (!open) {
      setQuery(selected?.label ?? '');
    }
  }, [open, selected?.label, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.searchText.includes(q));
  }, [options, query]);

  const displayValue = open ? query : (selected?.label ?? '');
  const showList = open && !disabled;

  return (
    <div ref={rootRef} className="relative">
      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onFocus={() => {
            setOpen(true);
            if (clearIdOnType) {
              setQuery(selected?.label ?? '');
            } else {
              setQuery('');
            }
          }}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setOpen(true);
            if (clearIdOnType && value) onChange('');
          }}
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-10 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        {allowClear && value && !disabled && (
          <button
            type="button"
            aria-label="مسح الاختيار"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange('');
              setQuery('');
              setOpen(false);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-600 dark:hover:text-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {showList && (
        <ul
          className="absolute z-[60] mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-600 dark:bg-gray-800"
          dir="rtl"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-gray-500 dark:text-gray-400">{emptyListText}</li>
          ) : (
            filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(o.id);
                    setQuery(o.label);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-right hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{o.label}</span>
                  {o.debtCaption ? (
                    <span className="text-xs font-medium tabular-nums text-amber-700 dark:text-amber-300">
                      {o.debtCaption}
                    </span>
                  ) : null}
                  {o.hint ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{o.hint}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function groupToCustomerRow(g: CustomerInvoiceCustomerGroupDto): CustomerInvoiceCustomerDto {
  const cid = g.customerId.trim();
  if (g.invoiceType != null && Number.isFinite(Number(g.invoiceType))) {
    return {
      id: cid,
      agentId: g.agentId ?? '',
      customerId: cid,
      customerName: g.customerName,
      customerUsername: g.customerUsername,
      address: g.address,
      phoneNumber: g.phoneNumber,
      customerType: g.customerType,
      createdAt: g.createdAt ?? undefined,
      updatedAt: g.updatedAt,
      balanceAmount: g.totalDebtAmount,
      debtPaid: g.totalDebtPaid,
      debtRemaining: g.totalDebtRemaining,
      invoiceType: Number(g.invoiceType),
      notes: null,
    };
  }

  const invoiceKinds = new Set(
    (g.invoices ?? [])
      .map((inv) => inv.invoiceType)
      .map((v) => (v == null || String(v).trim() === '' ? null : String(v).trim().toLowerCase()))
      .filter((v): v is string => v != null)
      .map((v) => {
        if (v === '0' || v === 'standard' || v === 'customer') return '0';
        if (v === '1' || v === 'companydebt' || v === 'company_debt') return '1';
        return v;
      })
  );
  const normalizedType = invoiceKinds.size === 1 ? Array.from(invoiceKinds)[0] : null;
  const groupedInvoiceType: number | null =
    normalizedType === '1' || normalizedType === 'companydebt' || normalizedType === 'company_debt'
      ? 1
      : normalizedType === '0' || normalizedType === 'standard' || normalizedType === 'customer'
        ? 0
        : null;

  return {
    id: cid,
    agentId: g.agentId ?? '',
    customerId: cid,
    customerName: g.customerName,
    customerUsername: g.customerUsername,
    address: g.address,
    phoneNumber: g.phoneNumber,
    customerType: g.customerType,
    createdAt: g.createdAt ?? undefined,
    updatedAt: g.updatedAt,
    balanceAmount: g.totalDebtAmount,
    debtPaid: g.totalDebtPaid,
    debtRemaining: g.totalDebtRemaining,
    invoiceType: groupedInvoiceType,
    notes: null,
  };
}

function notesFromGroupInvoices(g: CustomerInvoiceCustomerGroupDto): string {
  const parts = g.invoices.map((i) => (i.notes ?? '').trim()).filter(Boolean);
  if (parts.length) return parts.join('؛ ');
  return '';
}

/** عمود الملاحظات في السند — مع تمييز العميل عند تعدد الصفوف */
function receiptNotesCell(customerName: string, notesText: string, multiCustomer: boolean): string {
  const n = notesText.trim();
  if (!multiCustomer) return n || '—';
  if (n) return `«${customerName}» — ${n}`;
  return `«${customerName}»`;
}

function invoiceTypeLabel(value: string | number | null | undefined): string {
  if (value === 0 || value === '0') return 'دين وكلاء';
  if (value === 1 || value === '1') return 'دين شركة';
  if (value == null || String(value).trim() === '') return 'دين وكلاء';
  const raw = String(value).trim();
  const normalized = raw.toLowerCase();
  if (normalized === 'companydebt' || normalized === 'company_debt') return 'دين شركة';
  if (normalized === 'standard' || normalized === 'customer') return 'دين وكلاء';
  return raw;
}

function invoiceTypeBadgeClass(value: string | number | null | undefined): string {
  const label = invoiceTypeLabel(value);
  if (label === 'دين شركة') {
    return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200';
  }
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
}

function recordToForm(r: CustomerInvoiceRecordDto): CustomerInvoiceRecordCreateDto {
  return {
    balanceAmount: r.balanceAmount,
    transferAmount: r.transferAmount,
    paymentMethod: Number(r.paymentMethod) as CustomerInvoicePaymentMethod,
    notes: r.notes ?? '',
  };
}

type InvoiceListFilters = {
  customerName: string;
  customerUsername: string;
  phoneNumber: string;
  customerType: '' | '0' | '1';
};

const emptyListFilters = (): InvoiceListFilters => ({
  customerName: '',
  customerUsername: '',
  phoneNumber: '',
  customerType: '',
});

const emptyInvoiceStatistics = (): CustomerInvoiceStatisticsDto => ({
  totalDebtAmount: 0,
  totalDebtPaid: 0,
  totalDebtRemaining: 0,
  totalBalanceAmount: 0,
  totalTransferAmount: 0,
  totalCompanyDebtAmount: 0,
  customerCount: 0,
});

function debtPreview(balance: number, transfer: number): number {
  return Math.max(0, balance - transfer);
}

const CustomerInvoicesPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { formatNumber, formatDate } = useDigits();
  const formatAmountReceipt = (n: number) => formatNumber(n, { suffix: ' د.ع' });
  const queryClient = useQueryClient();
  
  const isAdmin = user?.role === UserRole.Admin;
  const canUsePage =
    user &&
    (user.role === UserRole.Admin ||
      user.role === UserRole.Agent ||
      user.role === UserRole.SubAgent ||
      (user.role === UserRole.Employee && user.canAccessInvoices === true));

  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalEditingId, setCustomerModalEditingId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerInvoiceCustomerCreateDto>(emptyCustomerForm);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceModalCustomerId, setInvoiceModalCustomerId] = useState<string | null>(null);
  const [invoiceModalCustomerName, setInvoiceModalCustomerName] = useState('');
  const [invoiceEditingId, setInvoiceEditingId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<CustomerInvoiceRecordCreateDto>(emptyInvoiceForm);
  const [invoiceEditingDebtPaid, setInvoiceEditingDebtPaid] = useState(0);
  const [companyDebtModalOpen, setCompanyDebtModalOpen] = useState(false);
  const [companyDebtForm, setCompanyDebtForm] = useState<CustomerInvoiceCompanyDebtCreateDto>(emptyCompanyDebtForm);
  const [journalEntryModalOpen, setJournalEntryModalOpen] = useState(false);
  const [journalEntryForm, setJournalEntryForm] = useState<JournalEntryModalForm>(emptyJournalEntryForm);

  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);
  /** عند الفتح من قائمة مجمّعة: عرض الفواتير من المجموعة دون انتظار GET بالمعرّف */
  const [detailSnapshotGroup, setDetailSnapshotGroup] = useState<CustomerInvoiceCustomerGroupDto | null>(null);

  const [invoicesDropdownOpen, setInvoicesDropdownOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<InvoiceListFilters>(emptyListFilters);
  const [appliedFilters, setAppliedFilters] = useState<InvoiceListFilters>(emptyListFilters);
  const [payDebtRow, setPayDebtRow] = useState<CustomerInvoiceRecordDto | null>(null);
  const [payDebtCustomerName, setPayDebtCustomerName] = useState('');
  const [payDebtAmountStr, setPayDebtAmountStr] = useState('');
  const [payByCustomerOpen, setPayByCustomerOpen] = useState(false);
  const [payByCustomerForm, setPayByCustomerForm] = useState<{ amount: number; notes: string }>({
    amount: 0,
    notes: '',
  });
  const [pageCustomerSelection, setPageCustomerSelection] = useState<Set<string>>(() => new Set());
  const pageCustomerSelectAllRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const { data: agentsResponse } = useQuery({
    queryKey: ['allAgents', 'customer-invoices'],
    queryFn: () => apiService.getAllAgents({ page: 1, pageSize: 5000 }),
    enabled: isAuthenticated && isAdmin,
    retry: false,
  });
  const adminAgents = useMemo(() => (agentsResponse?.data ?? []) as Agent[], [agentsResponse?.data]);

  const agentIdParam = isAdmin ? selectedAgentId : undefined;
  const listEnabled =
    !!canUsePage &&
    isAuthenticated &&
    user?.canAccessInvoices === true &&
    user?.tenantPlanType !== TenantPlanType.Vip &&
    (!isAdmin || !!selectedAgentId);

  useEffect(() => {
    setAppliedFilters(emptyListFilters());
    setFilterDraft(emptyListFilters());
  }, [selectedAgentId]);

  useEffect(() => {
    if (!detailCustomerId) {
      setPayByCustomerOpen(false);
      setPayByCustomerForm({ amount: 0, notes: '' });
    }
  }, [detailCustomerId]);

  const listQueryKey = [
    'customer-invoices',
    agentIdParam ?? 'me',
    currentPage,
    pageSize,
    appliedFilters.customerName,
    appliedFilters.customerUsername,
    appliedFilters.phoneNumber,
    appliedFilters.customerType,
  ] as const;

  useEffect(() => {
    setPageCustomerSelection(new Set());
  }, [
    currentPage,
    agentIdParam,
    appliedFilters.customerName,
    appliedFilters.customerUsername,
    appliedFilters.phoneNumber,
    appliedFilters.customerType,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [agentIdParam, appliedFilters.customerName, appliedFilters.customerUsername, appliedFilters.phoneNumber, appliedFilters.customerType]);

  const {
    data: listResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      apiService.getCustomerInvoices({
        agentId: agentIdParam,
        groupByCustomer: true,
        customerName: appliedFilters.customerName.trim() || undefined,
        customerUsername: appliedFilters.customerUsername.trim() || undefined,
        phoneNumber: appliedFilters.phoneNumber.trim() || undefined,
        customerType:
          appliedFilters.customerType === '' ? undefined : Number(appliedFilters.customerType),
        page: currentPage,
        pageSize,
      }),
    enabled: listEnabled,
    retry: false,
  });

  const useGroupedList = listResponse?.customerGroups != null;
  const customerGroups = useMemo(
    () => listResponse?.customerGroups ?? [],
    [listResponse?.customerGroups]
  );
  const customers = useMemo(() => listResponse?.items ?? [], [listResponse?.items]);
  const journalEntryCustomerOptions = useMemo((): JournalComboOption[] => {
    const debtCaption = (totalDebtAmount: number, totalDebtRemaining: number): string =>
      `إجمالي الدين: ${formatNumber(totalDebtAmount, { suffix: ' د.ع' })} · المتبقي: ${formatNumber(
        totalDebtRemaining,
        { suffix: ' د.ع' }
      )}`;
    if (useGroupedList) {
      return customerGroups.map((g) => {
        const phone = (g.phoneNumber ?? '').trim();
        const user = (g.customerUsername ?? '').trim();
        const hint = [phone, user].filter(Boolean).join(' · ') || undefined;
        const totalDebtAmount = Number(g.totalDebtAmount) || 0;
        const totalDebtRemaining = Number(g.totalDebtRemaining) || 0;
        return {
          id: g.customerId.trim(),
          label: (g.customerName ?? '').trim() || '—',
          hint,
          searchText: [g.customerName, phone, user].filter(Boolean).join(' ').toLowerCase(),
          debtCaption: debtCaption(totalDebtAmount, totalDebtRemaining),
        };
      });
    }
    return customers.map((c) => {
      const phone = (c.phoneNumber ?? '').trim();
      const user = (c.customerUsername ?? '').trim();
      const hint = [phone, user].filter(Boolean).join(' · ') || undefined;
      const totalDebtRemaining =
        c.debtRemaining != null
          ? Number(c.debtRemaining) || 0
          : Math.max(0, (Number(c.debtAmount) || 0) - (Number(c.debtPaid) || 0));
      const totalDebtAmount =
        c.debtAmount != null
          ? Number(c.debtAmount) || 0
          : totalDebtRemaining + (Number(c.debtPaid) || 0);
      return {
        id: (c.customerId ?? c.id).trim(),
        label: (c.customerName ?? '').trim() || '—',
        hint,
        searchText: [c.customerName, phone, user].filter(Boolean).join(' ').toLowerCase(),
        debtCaption: debtCaption(totalDebtAmount, totalDebtRemaining),
      };
    });
  }, [useGroupedList, customerGroups, customers, formatNumber]);

  const journalAgentOptions = useMemo((): JournalComboOption[] => {
    return adminAgents.map((a) => {
      const label = (a.companyName || a.fullName || a.username || '').trim() || '—';
      const un = (a.username ?? '').trim();
      return {
        id: a.id,
        label,
        hint: un && un !== label ? un : undefined,
        searchText: [a.companyName, a.fullName, a.username].filter(Boolean).join(' ').toLowerCase(),
      };
    });
  }, [adminAgents]);

  const pickJournalAgent = (id: string) => {
    if (id !== selectedAgentId) {
      setJournalEntryForm((f) => ({ ...f, fromCustomerId: '', toCustomerId: '' }));
    }
    setSelectedAgentId(id);
  };

  const statistics = listResponse?.statistics ?? emptyInvoiceStatistics();
  const pagination = {
    currentPage: listResponse?.currentPage ?? currentPage,
    pageSize: listResponse?.pageSize ?? pageSize,
    totalItems: listResponse?.totalItems ?? (useGroupedList ? customerGroups.length : customers.length),
    totalPages: listResponse?.totalPages ?? 1,
    hasNextPage: listResponse?.hasNextPage ?? false,
    hasPreviousPage: listResponse?.hasPreviousPage ?? false,
  };

  const {
    data: detailData,
    isLoading: detailLoading,
    isError: detailIsError,
    error: detailErr,
    refetch: refetchCustomerDetail,
  } = useQuery({
    queryKey: ['customer-invoice-detail', agentIdParam ?? 'me', detailCustomerId],
    /** GET /api/CustomerInvoices/{id} — العميل + جميع فواتيره */
    queryFn: () => apiService.getCustomerInvoiceById(detailCustomerId!, agentIdParam),
    enabled: listEnabled && !!detailCustomerId && detailSnapshotGroup === null,
    retry: false,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const detailForModal = useMemo((): CustomerInvoiceDetailDto | undefined => {
    if (detailSnapshotGroup) {
      const cid = detailSnapshotGroup.customerId.trim();
      return {
        id: cid,
        customerId: cid,
        agentId: detailSnapshotGroup.agentId ?? '',
        customerName: detailSnapshotGroup.customerName,
        customerUsername: detailSnapshotGroup.customerUsername,
        address: detailSnapshotGroup.address,
        phoneNumber: detailSnapshotGroup.phoneNumber,
        customerType: detailSnapshotGroup.customerType,
        createdAt: detailSnapshotGroup.createdAt ?? undefined,
        updatedAt: detailSnapshotGroup.updatedAt,
        invoices: detailSnapshotGroup.invoices,
      } as CustomerInvoiceDetailDto;
    }
    return detailData;
  }, [detailSnapshotGroup, detailData]);

  const detailInvoicesSorted = useMemo(() => {
    const list = detailForModal?.invoices ?? [];
    return [...list].sort((a, b) => {
      const ta = new Date(a.createdAt ?? '').getTime();
      const tb = new Date(b.createdAt ?? '').getTime();
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
  }, [detailForModal?.invoices]);

  const modalTotalDebtRemaining = useMemo(() => {
    if (detailSnapshotGroup != null) return detailSnapshotGroup.totalDebtRemaining;
    const invs = detailForModal?.invoices ?? [];
    return invs.reduce((s, inv) => {
      const dr =
        inv.debtRemaining ?? Math.max(0, (inv.debtAmount ?? 0) - (inv.debtPaid ?? 0));
      return s + dr;
    }, 0);
  }, [detailSnapshotGroup, detailForModal?.invoices]);

  useEffect(() => {
    const el = pageCustomerSelectAllRef.current;
    const ids = useGroupedList
      ? customerGroups.map((g) => g.customerId.trim())
      : customers.map((c) => (c.customerId ?? c.id).trim());
    if (!el) return;
    if (ids.length === 0) {
      el.indeterminate = false;
      return;
    }
    const n = ids.filter((id) => pageCustomerSelection.has(id)).length;
    el.indeterminate = n > 0 && n < ids.length;
  }, [useGroupedList, customerGroups, customers, pageCustomerSelection]);

  const togglePageCustomerSelected = (customerId: string) => {
    const id = customerId.trim();
    setPageCustomerSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePageSelectAllCustomers = () => {
    const ids = useGroupedList
      ? customerGroups.map((g) => g.customerId.trim())
      : customers.map((c) => (c.customerId ?? c.id).trim());
    if (ids.length === 0) return;
    const allSelected = ids.every((id) => pageCustomerSelection.has(id));
    setPageCustomerSelection(allSelected ? new Set() : new Set(ids));
  };

  const printCustomersReceiptForIds = async (ids: Set<string>) => {
    if (ids.size === 0) {
      showError('سند قبض', 'اختر عميلاً واحداً على الأقل من القائمة.');
      return;
    }
    const multi = ids.size > 1;
    const selectedIds = Array.from(ids)
      .map((s) => s.trim())
      .filter(Boolean);
    if (selectedIds.length === 0) {
      showError('سند قبض', 'معرّفات غير صالحة.');
      return;
    }

    type RowRec = { customerName: string; notes: string; dateRaw: string | null | undefined; amount: number };
    let rowRecs: RowRec[] = [];
    let totalDebtAmountForReceipt = 0;
    let totalDebtPaidForReceipt = 0;
    let totalDebtRemainingForReceipt = 0;

    if (useGroupedList) {
      const groups = selectedIds
        .map((id) => customerGroups.find((g) => g.customerId.trim() === id))
        .filter((g): g is CustomerInvoiceCustomerGroupDto => g != null);
      totalDebtAmountForReceipt = groups.reduce((s, g) => s + (Number(g.totalDebtAmount) || 0), 0);
      totalDebtPaidForReceipt = groups.reduce((s, g) => s + (Number(g.totalDebtPaid) || 0), 0);
      totalDebtRemainingForReceipt = groups.reduce((s, g) => s + (Number(g.totalDebtRemaining) || 0), 0);
      rowRecs = groups.map((g) => ({
          customerName: g.customerName,
          notes: receiptNotesCell(g.customerName, notesFromGroupInvoices(g), multi),
          dateRaw: g.updatedAt ?? g.createdAt,
          amount: g.totalDebtRemaining,
        }));
    } else {
      const rows = selectedIds
        .map((id) => customers.find((c) => (c.customerId ?? c.id).trim() === id))
        .filter((c): c is CustomerInvoiceCustomerDto => c != null);
      totalDebtAmountForReceipt = rows.reduce(
        (s, row) =>
          s +
          (row.debtAmount != null
            ? Number(row.debtAmount) || 0
            : Math.max(0, (Number(row.debtRemaining) || 0) + (Number(row.debtPaid) || 0))),
        0
      );
      totalDebtPaidForReceipt = rows.reduce((s, row) => s + (Number(row.debtPaid) || 0), 0);
      totalDebtRemainingForReceipt = rows.reduce(
        (s, row) =>
          s +
          (row.debtRemaining != null
            ? Number(row.debtRemaining) || 0
            : Math.max(0, (Number(row.debtAmount) || 0) - (Number(row.debtPaid) || 0))),
        0
      );
      rowRecs = rows.map((row) => {
          const debtRem =
            row.debtRemaining ?? Math.max(0, (row.debtAmount ?? 0) - (row.debtPaid ?? 0));
          return {
            customerName: row.customerName,
            notes: receiptNotesCell(row.customerName, (row.notes ?? '').trim(), multi),
            dateRaw: row.updatedAt ?? row.createdAt,
            amount: debtRem,
          };
        });
    }

    if (rowRecs.length === 0) {
      showError('سند قبض', 'تعذر مطابقة العملاء المحددين مع القائمة.');
      return;
    }

    const total = rowRecs.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const records = rowRecs.map((r) => {
      const showAmt = rowRecs.length > 1 || Math.abs(total - (Number(r.amount) || 0)) > 0.01;
      const dateStr =
        r.dateRaw != null && String(r.dateRaw).trim() !== ''
          ? formatDate(String(r.dateRaw), { year: 'numeric', month: '2-digit', day: '2-digit' })
          : '—';
      return {
        lineLabel: r.notes,
        paymentDateDisplay: dateStr,
        recordAmount: showAmt ? Number(r.amount) || 0 : undefined,
      };
    });

    const names = rowRecs.map((r) => r.customerName);
    const subtitle =
      names.length <= 4
        ? names.join('، ')
        : `${names.slice(0, 3).join('، ')} — و${(names.length - 3).toLocaleString('ar-IQ')} آخرين`;

    const ok = await saveCustomerInvoiceCashReceiptPdf({
      customerName: multi ? 'عملاء محددون' : names[0] ?? '—',
      paymentAmount: total,
      formatAmount: formatAmountReceipt,
      metaAmountLabel: 'إجمالي المتبقي (المحدد)',
      tableSectionTitle: 'بيان العملاء',
      documentTitle: 'سند قبض — عملاء',
      accountantName: (user?.fullName || user?.username || '').trim() || undefined,
      subtitle,
      records,
      totalDebtAmount: totalDebtAmountForReceipt,
      totalDebtPaid: totalDebtPaidForReceipt,
      totalDebtRemaining: totalDebtRemainingForReceipt,
    });
    if (!ok) showError('حفظ PDF', 'تعذر إنشاء ملف السند. أعد المحاولة.');
  };

  const printPageSelectedCustomersReceipt = () => void printCustomersReceiptForIds(pageCustomerSelection);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['customer-invoice-detail'] });
  };

  const createCustomerMutation = useMutation({
    mutationFn: (payload: CustomerInvoiceCustomerCreateDto) =>
      apiService.createCustomerInvoiceCustomer(payload, agentIdParam),
    onSuccess: () => {
      invalidateAll();
      setCustomerModalOpen(false);
      setCustomerModalEditingId(null);
      setCustomerForm(emptyCustomerForm());
      showSuccess('تم الحفظ', 'تمت إضافة العميل.');
    },
    onError: (err: unknown) => showError('فشل الإضافة', ApiService.showError(err)),
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (args: { id: string; payload: CustomerInvoiceCustomerCreateDto }) =>
      apiService.updateCustomerInvoiceCustomer(args.id, args.payload, agentIdParam),
    onSuccess: () => {
      invalidateAll();
      setCustomerModalOpen(false);
      setCustomerModalEditingId(null);
      setCustomerForm(emptyCustomerForm());
      showSuccess('تم التحديث', 'تم تعديل بيانات العميل.');
    },
    onError: (err: unknown) => showError('فشل التحديث', ApiService.showError(err)),
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteCustomerInvoiceCustomer(id, agentIdParam),
    onSuccess: () => {
      invalidateAll();
      setDetailCustomerId(null);
      setDetailSnapshotGroup(null);
      showSuccess('تم الحذف', 'تم حذف العميل.');
    },
    onError: (err: unknown) => showError('فشل الحذف', ApiService.showError(err)),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (args: { customerId: string; payload: CustomerInvoiceRecordCreateDto }) =>
      apiService.createCustomerInvoiceRecord(args.customerId, args.payload, agentIdParam),
    onSuccess: () => {
      invalidateAll();
      closeInvoiceModal();
      showSuccess('تم الحفظ', 'تمت إضافة الفاتورة.');
    },
    onError: (err: unknown) => showError('فشل الإضافة', ApiService.showError(err)),
  });

  const createCompanyDebtMutation = useMutation({
    mutationFn: (payload: CustomerInvoiceCompanyDebtCreateDto) =>
      apiService.createCustomerInvoiceCompanyDebt(payload, agentIdParam),
    onSuccess: () => {
      invalidateAll();
      setCompanyDebtModalOpen(false);
      setCompanyDebtForm(emptyCompanyDebtForm());
      showSuccess('تم الحفظ', 'تمت إضافة فاتورة دين على الشركة.');
    },
    onError: (err: unknown) => showError('فشل الإضافة', ApiService.showError(err)),
  });

  const createJournalEntryMutation = useMutation({
    mutationFn: (payload: CustomerInvoiceJournalEntryCreateDto) =>
      apiService.createCustomerInvoiceJournalEntry(payload, agentIdParam),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
      setJournalEntryModalOpen(false);
      setJournalEntryForm(emptyJournalEntryForm());
      showSuccess('تم الحفظ', 'تم تسجيل القيد المحاسبي.');
    },
    onError: (err: unknown) => showError('فشل القيد', ApiService.showError(err)),
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: (args: { invoiceId: string; payload: CustomerInvoiceRecordCreateDto }) =>
      apiService.updateCustomerInvoiceRecord(args.invoiceId, args.payload, agentIdParam),
    onSuccess: () => {
      invalidateAll();
      closeInvoiceModal();
      showSuccess('تم التحديث', 'تم تعديل الفاتورة.');
    },
    onError: (err: unknown) => showError('فشل التحديث', ApiService.showError(err)),
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (invoiceId: string) => apiService.deleteCustomerInvoiceRecord(invoiceId, agentIdParam),
    onSuccess: () => {
      invalidateAll();
      showSuccess('تم الحذف', 'تم حذف الفاتورة.');
    },
    onError: (err: unknown) => showError('فشل الحذف', ApiService.showError(err)),
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: (invoiceId: string) => apiService.sendCustomerInvoiceWhatsApp(invoiceId, agentIdParam),
    onSuccess: (data) => {
      const msg = data.message ?? 'تم إرسال رسالة واتساب بنجاح.';
      const extra = data.messageId ? ` (${data.messageId})` : '';
      showSuccess('واتساب', `${msg}${extra}`);
    },
    onError: (err: unknown) => showError('إرسال واتساب', ApiService.showError(err)),
  });

  const payDebtMutation = useMutation({
    mutationFn: (args: { id: string; amount: number }) =>
      apiService.payCustomerInvoiceDebt(args.id, { amount: args.amount }, agentIdParam),
    onSuccess: (data, variables) => {
      const customerName = payDebtCustomerName.trim() || '—';
      const paymentAmount = variables.amount;
      const dateDisplay = data.updatedAt
        ? formatDate(data.updatedAt, { year: 'numeric', month: '2-digit', day: '2-digit' })
        : data.createdAt
          ? formatDate(data.createdAt, { year: 'numeric', month: '2-digit', day: '2-digit' })
          : new Date().toLocaleString('ar-IQ', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });
      const notesLine = (data.notes != null ? String(data.notes) : '').trim() || '—';
      void (async () => {
        const saved = await saveCustomerInvoiceCashReceiptPdf({
          customerName,
          paymentAmount,
          formatAmount: formatAmountReceipt,
          accountantName: (user?.fullName || user?.username || '').trim() || undefined,
          totalDebtAmount:
            data.debtAmount != null && Number.isFinite(Number(data.debtAmount)) ? Number(data.debtAmount) : undefined,
          totalDebtPaid:
            data.debtPaid != null && Number.isFinite(Number(data.debtPaid)) ? Number(data.debtPaid) : undefined,
          totalDebtRemaining:
            data.debtRemaining != null && Number.isFinite(Number(data.debtRemaining))
              ? Number(data.debtRemaining)
              : undefined,
          totalRemainingAfter:
            data.debtRemaining != null && Number.isFinite(Number(data.debtRemaining))
              ? Number(data.debtRemaining)
              : undefined,
          records: [
            {
              lineLabel: notesLine,
              paymentDateDisplay: dateDisplay,
            },
          ],
        });
        if (!saved) showError('حفظ PDF', 'تعذر إنشاء ملف السند. أعد المحاولة.');
      })();
      invalidateAll();
      setDetailSnapshotGroup(null);
      setPayByCustomerOpen(false);
      setPayByCustomerForm({ amount: 0, notes: '' });
      setPayDebtRow(null);
      setPayDebtCustomerName('');
      setPayDebtAmountStr('');
      showSuccess('تسديد الدين', 'تم تسجيل المبلغ بنجاح.');
    },
    onError: (err: unknown) => showError('تسديد الدين', ApiService.showError(err)),
  });

  const payByCustomerMutation = useMutation({
    mutationFn: (args: {
      customerId: string;
      amount: number;
      notes?: string | null;
      customerNameForReceipt: string;
    }) =>
      apiService.payCustomerInvoiceDebtByCustomer(
        { customerId: args.customerId, amount: args.amount, notes: args.notes },
        agentIdParam
      ),
    onSuccess: (data, variables) => {
      const customerName = variables.customerNameForReceipt.trim() || '—';
      const notesTrim = variables.notes != null ? String(variables.notes).trim() : '';
      const settlementDateStr = formatDate(new Date().toISOString(), {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      void (async () => {
        const saved = await saveCustomerInvoiceCashReceiptPdf({
          customerName,
          paymentAmount: data.amountApplied,
          formatAmount: formatAmountReceipt,
          accountantName: (user?.fullName || user?.username || '').trim() || undefined,
          totalDebtAmount:
            data.totalDebtRemainingAfter != null && Number.isFinite(Number(data.totalDebtRemainingAfter))
              ? Number(data.totalDebtRemainingAfter) + (Number(data.amountApplied) || 0)
              : undefined,
          totalDebtPaid: Number(data.amountApplied) || 0,
          totalDebtRemaining:
            data.totalDebtRemainingAfter != null && Number.isFinite(Number(data.totalDebtRemainingAfter))
              ? Number(data.totalDebtRemainingAfter)
              : undefined,
          totalRemainingAfter:
            data.totalDebtRemainingAfter != null && Number.isFinite(Number(data.totalDebtRemainingAfter))
              ? Number(data.totalDebtRemainingAfter)
              : undefined,
          records: [
            {
              lineLabel: notesTrim || '—',
              paymentDateDisplay: settlementDateStr,
            },
          ],
        });
        if (!saved) showError('حفظ PDF', 'تعذر إنشاء ملف السند. أعد المحاولة.');
      })();
      invalidateAll();
      setDetailSnapshotGroup(null);
      setPayByCustomerOpen(false);
      setPayByCustomerForm({ amount: 0, notes: '' });
      showSuccess(
        'تم التسديد',
        `المبلغ المُطبَّق: ${formatNumber(data.amountApplied, { suffix: ' د.ع' })} — المتبقي بعد التسديد: ${formatNumber(data.totalDebtRemainingAfter, { suffix: ' د.ع' })}.`
      );
    },
    onError: (err: unknown) => showError('تسديد الدين', ApiService.showError(err)),
  });

  const openCreateCustomer = () => {
    setCustomerModalEditingId(null);
    setCustomerForm(emptyCustomerForm());
    setCustomerModalOpen(true);
  };

  const openEditCustomer = (row: CustomerInvoiceCustomerDto) => {
    const editId = (row.customerId ?? row.id).trim();
    setCustomerModalEditingId(editId);
    setCustomerForm(customerToForm(row));
    setCustomerModalOpen(true);
  };

  const closeInvoiceModal = () => {
    setInvoiceModalOpen(false);
    setInvoiceModalCustomerId(null);
    setInvoiceModalCustomerName('');
    setInvoiceEditingId(null);
    setInvoiceEditingDebtPaid(0);
    setInvoiceForm(emptyInvoiceForm());
  };

  const openCreateInvoice = (customerId: string, customerName: string) => {
    setInvoiceModalCustomerId(customerId);
    setInvoiceModalCustomerName(customerName);
    setInvoiceEditingId(null);
    setInvoiceEditingDebtPaid(0);
    setInvoiceForm(emptyInvoiceForm());
    setInvoiceModalOpen(true);
  };

  const openEditInvoice = (
    customerId: string,
    customerName: string,
    inv: CustomerInvoiceRecordDto
  ) => {
    setInvoiceModalCustomerId(customerId);
    setInvoiceModalCustomerName(customerName);
    setInvoiceEditingId(inv.id);
    setInvoiceEditingDebtPaid(inv.debtPaid ?? 0);
    setInvoiceForm(recordToForm(inv));
    setInvoiceModalOpen(true);
  };

  const openPayDebt = (inv: CustomerInvoiceRecordDto, customerName: string) => {
    setPayDebtRow(inv);
    setPayDebtCustomerName(customerName);
    const rem = inv.debtRemaining ?? Math.max(0, (inv.debtAmount ?? 0) - (inv.debtPaid ?? 0));
    setPayDebtAmountStr(rem > 0 ? String(rem) : '');
  };

  const submitPayDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payDebtRow) return;
    const raw = payDebtAmountStr.replace(/,/g, '').trim();
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      showError('التحقق', 'أدخل مبلغاً صالحاً أكبر من صفر.');
      return;
    }
    payDebtMutation.mutate({ id: payDebtRow.id, amount });
  };

  const handlePayByCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const cid = (detailForModal?.id ?? detailCustomerId ?? '').trim();
    if (!cid) return;
    const maxRem = modalTotalDebtRemaining;
    if (payByCustomerForm.amount <= 0) {
      showError('مبلغ غير صالح', 'أدخل مبلغاً أكبر من صفر.');
      return;
    }
    if (payByCustomerForm.amount > maxRem) {
      showError('مبلغ كبير', 'لا يمكن تسديد مبلغ أكبر من إجمالي المتبقي.');
      return;
    }
    const notesTrim = payByCustomerForm.notes.trim();
    payByCustomerMutation.mutate({
      customerId: cid,
      amount: payByCustomerForm.amount,
      notes: notesTrim ? notesTrim : null,
      customerNameForReceipt: detailForModal?.customerName?.trim() || '—',
    });
  };

  const submitCustomerForm = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customerForm.customerName.trim();
    if (!name) {
      showError('التحقق', 'اسم العميل مطلوب.');
      return;
    }
    const payload: CustomerInvoiceCustomerCreateDto = {
      ...customerForm,
      customerName: name,
      phoneNumber: customerForm.phoneNumber?.trim() || null,
      address: customerForm.address?.trim() || null,
    };
    if (customerModalEditingId) {
      updateCustomerMutation.mutate({ id: customerModalEditingId, payload });
    } else {
      createCustomerMutation.mutate(payload);
    }
  };

  const submitInvoiceForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceModalCustomerId) return;
    const bal = Number(invoiceForm.balanceAmount);
    const tr = Number(invoiceForm.transferAmount);
    if (!Number.isFinite(bal) || bal < 0 || !Number.isFinite(tr) || tr < 0) {
      showError('التحقق', 'أدخل مبالغ صحيحة.');
      return;
    }
    if (tr > bal) {
      showError('التحقق', 'مبلغ الواصل لا يجوز أن يتجاوز المبلغ.');
      return;
    }
    const debtPreviewVal = debtPreview(bal, tr);
    if (invoiceEditingId && debtPreviewVal < invoiceEditingDebtPaid) {
      showError(
        'التحقق',
        `لا يمكن أن يكون الدين المحسوب أقل من المسدد حالياً (${formatNumber(invoiceEditingDebtPaid, { suffix: ' د.ع' })}).`
      );
      return;
    }
    const notesTrim = (invoiceForm.notes ?? '').trim();
    const payload: CustomerInvoiceRecordCreateDto = {
      balanceAmount: bal,
      transferAmount: tr,
      paymentMethod: invoiceForm.paymentMethod,
      notes: notesTrim ? notesTrim : null,
    };
    if (invoiceEditingId) {
      updateInvoiceMutation.mutate({ invoiceId: invoiceEditingId, payload });
    } else {
      createInvoiceMutation.mutate({ customerId: invoiceModalCustomerId, payload });
    }
  };

  const submitCompanyDebtForm = (e: React.FormEvent) => {
    e.preventDefault();
    const customerName = (companyDebtForm.customerName ?? '').trim();
    const debtAmount = Number(companyDebtForm.debtAmount);
    const debtDate = (companyDebtForm.debtDate ?? '').trim();
    if (!customerName) {
      showError('التحقق', 'اسم العميل/الجهة مطلوب.');
      return;
    }
    if (!Number.isFinite(debtAmount) || debtAmount <= 0) {
      showError('التحقق', 'مبلغ الدين يجب أن يكون أكبر من صفر.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(debtDate)) {
      showError('التحقق', 'تاريخ الدين غير صالح.');
      return;
    }
    createCompanyDebtMutation.mutate({
      customerName,
      debtAmount,
      debtDate,
      notes: (companyDebtForm.notes ?? '').trim() || null,
    });
  };

  const submitJournalEntryForm = (e: React.FormEvent) => {
    e.preventDefault();
    const fromId = journalEntryForm.fromCustomerId.trim();
    const toId = journalEntryForm.toCustomerId.trim();
    const amount = Number(journalEntryForm.amount);
    const dateLocal = (journalEntryForm.dateLocal ?? '').trim();
    if (!JOURNAL_ENTRY_UUID_RE.test(fromId)) {
      showError('التحقق', 'اختر الطرف (من) من القائمة.');
      return;
    }
    if (!JOURNAL_ENTRY_UUID_RE.test(toId)) {
      showError('التحقق', 'اختر الطرف (إلى) من القائمة.');
      return;
    }
    if (fromId.toLowerCase() === toId.toLowerCase()) {
      showError('التحقق', 'يجب أن يختلف العميل المصدر عن عميل الوجهة.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showError('التحقق', 'المبلغ يجب أن يكون أكبر من صفر.');
      return;
    }
    if (!dateLocal) {
      showError('التحقق', 'التاريخ والوقت مطلوبان.');
      return;
    }
    const parsed = new Date(dateLocal);
    if (Number.isNaN(parsed.getTime())) {
      showError('التحقق', 'تاريخ غير صالح.');
      return;
    }
    const payload: CustomerInvoiceJournalEntryCreateDto = {
      fromCustomerId: fromId,
      toCustomerId: toId,
      amount,
      date: parsed.toISOString(),
      notes: journalEntryForm.notes.trim() ? journalEntryForm.notes.trim() : null,
    };
    createJournalEntryMutation.mutate(payload);
  };

  const handleDeleteCustomer = (row: CustomerInvoiceCustomerDto) => {
    if (!window.confirm(`حذف العميل «${row.customerName}» وجميع فواتيره؟`)) return;
    const cid = (row.customerId ?? row.id).trim();
    deleteCustomerMutation.mutate(cid);
  };

  const handleDeleteInvoice = (inv: CustomerInvoiceRecordDto) => {
    if (!window.confirm('حذف هذه الفاتورة؟')) return;
    deleteInvoiceMutation.mutate(inv.id);
  };

  const handlePrintInvoice = (
    inv: CustomerInvoiceRecordDto,
    cust: Pick<CustomerInvoiceCustomerDto, 'customerName' | 'phoneNumber' | 'address' | 'customerType'>
  ) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showError('طباعة', 'تعذّر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة.');
      return;
    }
    const ct = CUSTOMER_TYPE_LABELS[Number(cust.customerType)] ?? String(cust.customerType);
    const pm = PAYMENT_METHOD_LABELS[Number(inv.paymentMethod)] ?? String(inv.paymentMethod);
    const html = buildCustomerInvoicePrintHtml(inv, cust, formatDate, formatNumber, ct, pm);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 400);
    };
  };

  const accessDeniedMessage = useMemo(() => {
    if (!user || !canUsePage) return 'هذه الصفحة متاحة للمدير والوكيل والمدير الثانوي والموظف بصلاحية الفواتير.';
    if (user.canAccessInvoices === false) return 'لا تملك صلاحية الوصول إلى الفواتير (CanAccessInvoices).';
    if (user.tenantPlanType === TenantPlanType.Vip) return 'هذه الميزة متاحة لمستأجري Standard فقط.';
    return null;
  }, [user, canUsePage]);

  if (!isAuthenticated) return null;
  if (!canUsePage) return <Navigate to="/admin/receipts" replace />;
  if (accessDeniedMessage) {
    return (
      <div className="p-6 max-w-lg">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4 text-amber-900 dark:text-amber-200">
          {accessDeniedMessage}
        </div>
        <Link to="/admin/receipts" className="mt-4 inline-block text-primary-600 dark:text-primary-400">
          العودة إلى التفعيلات
        </Link>
      </div>
    );
  }

  const busy =
    createCustomerMutation.isPending ||
    updateCustomerMutation.isPending ||
    deleteCustomerMutation.isPending ||
    createInvoiceMutation.isPending ||
    createCompanyDebtMutation.isPending ||
    createJournalEntryMutation.isPending ||
    updateInvoiceMutation.isPending ||
    deleteInvoiceMutation.isPending ||
    sendWhatsAppMutation.isPending ||
    payDebtMutation.isPending ||
    payByCustomerMutation.isPending;

  const invoiceDebtPreview = debtPreview(
    Number(invoiceForm.balanceAmount) || 0,
    Number(invoiceForm.transferAmount) || 0
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="relative inline-block text-right">
            <button
              type="button"
              onClick={() => setInvoicesDropdownOpen((o) => !o)}
              className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
            >
              <Receipt className="h-8 w-8 text-primary-600 dark:text-primary-400 shrink-0" />
              <span>فواتير العملاء</span>
              <ChevronDown className={`h-6 w-6 transition ${invoicesDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {invoicesDropdownOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="إغلاق القائمة"
                  onClick={() => setInvoicesDropdownOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 min-w-[220px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                  <Link
                    to="/admin/receipts"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setInvoicesDropdownOpen(false)}
                  >
                    التفعيلات
                  </Link>
                  <span className="block px-4 py-2 text-sm font-medium bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
                    فواتير العملاء
                  </span>
                </div>
              </>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            عملاء وفواتير منفصلة — أضف عميلاً ثم سجّل فواتيره
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              setJournalEntryForm(emptyJournalEntryForm());
              setJournalEntryModalOpen(true);
            }}
            disabled={!listEnabled || busy || (isAdmin && !selectedAgentId)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
          >
            <Landmark className="h-4 w-4" />
            إضافة قيد محاسبي
          </button>
          <button
            type="button"
            onClick={() => {
              setCompanyDebtForm(emptyCompanyDebtForm());
              setCompanyDebtModalOpen(true);
            }}
            disabled={!listEnabled || busy || (isAdmin && !selectedAgentId)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            إضافة فاتورة على الشركة
          </button>
          <button
            type="button"
            onClick={openCreateCustomer}
            disabled={!listEnabled || busy || (isAdmin && !selectedAgentId)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            إضافة عميل
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-4 max-w-md">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوكيل</label>
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          >
            <option value="">— اختر الوكيل —</option>
            {adminAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.companyName || a.fullName || a.id}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">مطلوب لعرض القائمة وجميع العمليات.</p>
        </div>
      )}

      {isAdmin && !selectedAgentId && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-6 text-center text-gray-600 dark:text-gray-400">
          اختر الوكيل لعرض فواتير العملاء.
        </div>
      )}

      {listEnabled && !error && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
          {(
            [
              { label: 'إجمالي الدين', value: statistics.totalDebtAmount, accent: 'border-violet-200 dark:border-violet-800' },
              { label: 'إجمالي المسدد', value: statistics.totalDebtPaid, accent: 'border-emerald-200 dark:border-emerald-800' },
              { label: 'إجمالي المتبقي', value: statistics.totalDebtRemaining, accent: 'border-amber-200 dark:border-amber-800' },
              { label: 'إجمالي المبلغ', value: statistics.totalBalanceAmount, accent: 'border-sky-200 dark:border-sky-800' },
              { label: 'إجمالي التحويل', value: statistics.totalTransferAmount, accent: 'border-teal-200 dark:border-teal-800' },
              { label: 'متبقي دين الشركة', value: statistics.totalCompanyDebtAmount ?? 0, accent: 'border-fuchsia-200 dark:border-fuchsia-800' },
              { label: 'عدد العملاء', value: statistics.customerCount, accent: 'border-slate-200 dark:border-slate-600', isCount: true },
            ] as const
          ).map((c) => (
            <div
              key={c.label}
              className={`rounded-lg border bg-white dark:bg-gray-800/80 p-3 shadow-sm ${c.accent}`}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{c.label}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                {'isCount' in c && c.isCount ? formatNumber(c.value) : formatNumber(c.value, { suffix: ' د.ع' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {listEnabled && (
        <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setAdvancedFiltersOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-700/50"
          >
            <span className="inline-flex items-center gap-2">
              <Filter className="h-4 w-4" />
              فلترة متقدمة
            </span>
            {advancedFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {advancedFiltersOpen && (
            <div className="px-4 pb-4 pt-0 border-t border-gray-200 dark:border-gray-600 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">اسم العميل (جزء)</label>
                  <input
                    value={filterDraft.customerName}
                    onChange={(e) => setFilterDraft((f) => ({ ...f, customerName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder="بحث..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">اسم المستخدم (جزء)</label>
                  <input
                    value={filterDraft.customerUsername}
                    onChange={(e) => setFilterDraft((f) => ({ ...f, customerUsername: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white font-mono"
                    placeholder="بحث..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">الهاتف (جزء)</label>
                  <input
                    value={filterDraft.phoneNumber}
                    onChange={(e) => setFilterDraft((f) => ({ ...f, phoneNumber: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder="بحث..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">نوع العميل</label>
                  <select
                    value={filterDraft.customerType}
                    onChange={(e) =>
                      setFilterDraft((f) => ({
                        ...f,
                        customerType: e.target.value as InvoiceListFilters['customerType'],
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">الكل</option>
                    <option value="0">عميل جديد</option>
                    <option value="1">وكيل</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const e = emptyListFilters();
                    setFilterDraft(e);
                    setAppliedFilters(e);
                  }}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  مسح الفلاتر
                </button>
                <button
                  type="button"
                  onClick={() => setAppliedFilters({ ...filterDraft })}
                  className="px-3 py-1.5 text-sm rounded-md bg-primary-600 hover:bg-primary-700 text-white"
                >
                  تطبيق الفلترة
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {listEnabled && isLoading && (
        <div className="py-16">
          <WifiLoaderComponent background="transparent" desktopSize="80px" mobileSize="60px" text="جاري التحميل..." />
        </div>
      )}

      {listEnabled && error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300">
          {ApiService.showError(error)}
          <button type="button" onClick={() => refetch()} className="mt-2 text-sm underline">
            إعادة المحاولة
          </button>
        </div>
      )}

      {listEnabled && !isLoading && !error && (
        <>
          {(useGroupedList ? customerGroups.length > 0 : customers.length > 0) && (
            <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => printPageSelectedCustomersReceipt()}
                disabled={busy || pageCustomerSelection.size === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-violet-600/90 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/50 dark:hover:bg-violet-900/40 text-violet-900 dark:text-violet-100 text-sm font-medium disabled:opacity-50"
                title="حفظ سند قبض PDF للعملاء المحددين في القائمة"
              >
                <Printer className="h-4 w-4" />
                سند قبض
                {pageCustomerSelection.size > 0 ? ` (${pageCustomerSelection.size})` : ''}
              </button>
            </div>
          )}
          <div className="wakeel-table-scroll rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full text-right">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                <th className="px-2 py-2 w-10 text-center">
                  <input
                    ref={pageCustomerSelectAllRef}
                    type="checkbox"
                    checked={
                      (useGroupedList ? customerGroups.length > 0 : customers.length > 0) &&
                      (useGroupedList
                        ? customerGroups.every((g) => pageCustomerSelection.has(g.customerId.trim()))
                        : customers.every((c) => pageCustomerSelection.has((c.customerId ?? c.id).trim())))
                    }
                    onChange={togglePageSelectAllCustomers}
                    className="rounded border-gray-300 dark:border-gray-600"
                    title="تحديد كل العملاء في القائمة"
                    aria-label="تحديد كل العملاء في القائمة"
                  />
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">العميل</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">نوع الفاتورة</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">الهاتف</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">العنوان</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المبلغ الكلي</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المسدد</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">متبقي الدين</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 max-w-[12rem]">الملاحظات</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[12rem]">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {useGroupedList ? (
                customerGroups.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      لا يوجد عملاء.{isFetching ? ' جاري التحديث…' : ''}
                    </td>
                  </tr>
                ) : (
                  customerGroups.map((grp) => {
                    const customerIdForActions = grp.customerId.trim();
                    const groupedRow = groupToCustomerRow(grp);
                    return (
                      <tr
                        key={customerIdForActions}
                        className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                      >
                        <td className="px-2 py-2 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={pageCustomerSelection.has(customerIdForActions)}
                            onChange={() => togglePageCustomerSelected(customerIdForActions)}
                            className="rounded border-gray-300 dark:border-gray-600"
                            aria-label={`تحديد ${grp.customerName}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
                          {grp.customerName}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${invoiceTypeBadgeClass(groupedRow.invoiceType)}`}
                          >
                            {invoiceTypeLabel(groupedRow.invoiceType)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{grp.phoneNumber ?? '—'}</td>
                        <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{grp.address ?? '—'}</td>
                        <td className="px-3 py-2 text-sm tabular-nums">
                          {formatNumber(grp.totalDebtAmount, { suffix: ' د.ع' })}
                        </td>
                        <td className="px-3 py-2 text-sm tabular-nums">
                          {formatNumber(grp.totalDebtPaid, { suffix: ' د.ع' })}
                        </td>
                        <td className="px-3 py-2 text-sm tabular-nums">
                          {formatNumber(grp.totalDebtRemaining, { suffix: ' د.ع' })}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {grp.updatedAt
                            ? formatDate(grp.updatedAt, { year: 'numeric', month: '2-digit', day: '2-digit' })
                            : grp.createdAt
                              ? formatDate(grp.createdAt, { year: 'numeric', month: '2-digit', day: '2-digit' })
                              : '—'}
                        </td>
                        <td className="px-3 py-2 max-w-[12rem] text-xs text-gray-500 dark:text-gray-400">—</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => void printCustomersReceiptForIds(new Set([customerIdForActions]))}
                              disabled={busy}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-violet-600 dark:text-violet-400"
                              title="حفظ سند قبض PDF — هذا العميل"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDetailSnapshotGroup(grp);
                                setDetailCustomerId(customerIdForActions);
                              }}
                              disabled={busy}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-primary-600 dark:text-primary-400"
                              title="عرض التفاصيل والفواتير"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openCreateInvoice(customerIdForActions, grp.customerName)}
                              disabled={busy}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-emerald-600"
                              title="إضافة فاتورة"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditCustomer(groupedRow)}
                              disabled={busy}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-amber-600"
                              title="تعديل بيانات العميل"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(groupedRow)}
                              disabled={busy}
                              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-600"
                              title="حذف العميل"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )
              )
              : customers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    لا يوجد عملاء.{isFetching ? ' جاري التحديث…' : ''}
                  </td>
                </tr>
              ) : (
                customers.map((row) => {
                  const customerIdForActions = (row.customerId ?? row.id).trim();
                  const debtRem =
                    row.debtRemaining ??
                    Math.max(0, (row.debtAmount ?? 0) - (row.debtPaid ?? 0));
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-2 py-2 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={pageCustomerSelection.has(customerIdForActions)}
                          onChange={() => togglePageCustomerSelected(customerIdForActions)}
                          className="rounded border-gray-300 dark:border-gray-600"
                          aria-label={`تحديد ${row.customerName}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">{row.customerName}</td>
                      <td className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${invoiceTypeBadgeClass(row.invoiceType)}`}
                        >
                          {invoiceTypeLabel(row.invoiceType)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{row.phoneNumber ?? '—'}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{row.address ?? '—'}</td>
                      <td className="px-3 py-2 text-sm tabular-nums">
                        {formatNumber(row.balanceAmount ?? 0, { suffix: ' د.ع' })}
                      </td>
                      <td className="px-3 py-2 text-sm tabular-nums">
                        {formatNumber(row.debtPaid ?? 0, { suffix: ' د.ع' })}
                      </td>
                      <td className="px-3 py-2 text-sm tabular-nums">{formatNumber(debtRem, { suffix: ' د.ع' })}</td>
                      <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {row.createdAt ? formatDate(row.createdAt, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}
                      </td>
                      <td
                        className="px-3 py-2 max-w-[12rem] text-xs text-gray-600 dark:text-gray-400 align-top"
                        title={(row.notes ?? '').trim() || undefined}
                      >
                        {(row.notes ?? '').trim() ? (
                          <span className="line-clamp-2 break-words">{(row.notes ?? '').trim()}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => void printCustomersReceiptForIds(new Set([customerIdForActions]))}
                            disabled={busy}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-violet-600 dark:text-violet-400"
                            title="حفظ سند قبض PDF — هذا العميل"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDetailSnapshotGroup(null);
                              setDetailCustomerId(customerIdForActions);
                            }}
                            disabled={busy}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-primary-600 dark:text-primary-400"
                            title="عرض التفاصيل والفواتير"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openCreateInvoice(customerIdForActions, row.customerName)}
                            disabled={busy}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-emerald-600"
                            title="إضافة فاتورة"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditCustomer(row)}
                            disabled={busy}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-amber-600"
                            title="تعديل بيانات العميل"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(row)}
                            disabled={busy}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-600"
                            title="حذف العميل"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          hasNextPage={pagination.hasNextPage}
          hasPreviousPage={pagination.hasPreviousPage}
          onPageChange={setCurrentPage}
        />
        </>
      )}

      {/* تفاصيل العميل + الفواتير — تنسيق تسديد إجمالي الدين مثل كشف ديون الوكلاء */}
      {detailCustomerId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-2 flex items-center gap-2 min-w-0">
                <Eye className="h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400" />
                <span className="truncate">تفاصيل العميل والفواتير</span>
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                {detailForModal &&
                  modalTotalDebtRemaining > 0 &&
                  (detailSnapshotGroup || (!detailLoading && !detailIsError)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPayByCustomerOpen((v) => !v);
                        setPayByCustomerForm({ amount: 0, notes: '' });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
                    >
                      <Banknote className="h-4 w-4" />
                      تسديد على إجمالي الدين
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => {
                    setDetailCustomerId(null);
                    setDetailSnapshotGroup(null);
                    setPayByCustomerOpen(false);
                    setPayByCustomerForm({ amount: 0, notes: '' });
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {!detailSnapshotGroup && detailLoading && (
              <div className="flex-1 flex items-center justify-center py-16 text-gray-500">
                <WifiLoaderComponent background="transparent" desktopSize="48px" mobileSize="40px" text="" />
              </div>
            )}
            {!detailSnapshotGroup && !detailLoading && detailIsError && (
              <div className="flex-1 p-4">
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-200 text-sm">
                  <p className="mb-2">{ApiService.showError(detailErr)}</p>
                  <button
                    type="button"
                    onClick={() => refetchCustomerDetail()}
                    className="px-3 py-1.5 rounded-md bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-900 dark:text-red-100 text-sm"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              </div>
            )}

            {detailForModal && (detailSnapshotGroup || (!detailLoading && !detailIsError)) && (
              <>
                <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/80">
                  التسديد على الإجمالي يُوزّع المبلغ على الفواتير التي بها متبقي، من الأقدم وفق ترتيب الخادم.
                </p>
                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-900/40 shrink-0">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">اسم العميل</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{detailForModal.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">الهاتف</p>
                    <p className="text-gray-900 dark:text-white">{detailForModal.phoneNumber?.trim() || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">نوع العميل</p>
                    <p className="text-gray-900 dark:text-white">
                      {CUSTOMER_TYPE_LABELS[Number(detailForModal.customerType)] ?? detailForModal.customerType}
                    </p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">العنوان</p>
                    <p className="text-gray-900 dark:text-white">{detailForModal.address?.trim() || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">إجمالي متبقي الدين</p>
                    <p
                      className={`font-mono font-semibold tabular-nums ${modalTotalDebtRemaining > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}
                      dir="ltr"
                    >
                      {formatNumber(modalTotalDebtRemaining, { suffix: ' د.ع' })}
                    </p>
                  </div>
                </div>
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => openCreateInvoice(detailForModal.id, detailForModal.customerName)}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة فاتورة
                  </button>
                </div>

                {payByCustomerOpen && modalTotalDebtRemaining > 0 && (
                  <div className="px-4 py-3 border-b border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 shrink-0">
                    <form
                      onSubmit={handlePayByCustomer}
                      className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3"
                    >
                      <div className="flex-1 min-w-[140px]">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          مبلغ التسديد (الحد الأقصى: {formatNumber(modalTotalDebtRemaining)})
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={modalTotalDebtRemaining}
                          step={1}
                          required
                          value={payByCustomerForm.amount || ''}
                          onChange={(e) =>
                            setPayByCustomerForm((f) => ({ ...f, amount: Number(e.target.value) || 0 }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                        />
                      </div>
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ملاحظات (اختياري)
                        </label>
                        <input
                          value={payByCustomerForm.notes}
                          onChange={(e) => setPayByCustomerForm((f) => ({ ...f, notes: e.target.value }))}
                          maxLength={2000}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPayByCustomerOpen(false);
                            setPayByCustomerForm({ amount: 0, notes: '' });
                          }}
                          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          disabled={payByCustomerMutation.isPending || modalTotalDebtRemaining <= 0}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {payByCustomerMutation.isPending ? 'جاري التسديد...' : 'تأكيد التسديد'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="flex-1 min-h-0 overflow-auto p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      سجل الفواتير
                      {detailInvoicesSorted.length > 0 ? (
                        <span className="mr-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                          ({detailInvoicesSorted.length} {detailInvoicesSorted.length === 1 ? 'فاتورة' : 'فواتير'})
                        </span>
                      ) : null}
                    </h3>
                    {detailInvoicesSorted.length === 0 ? (
                      <p className="text-sm text-gray-500">لا توجد فواتير لهذا العميل بعد.</p>
                    ) : (
                      <div className="wakeel-table-scroll rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                        <table className="min-w-full text-right text-sm">
                          <thead className="bg-gray-100 dark:bg-gray-700/80">
                            <tr>
                              <th className="px-2 py-2">المبلغ الكلي</th>
                              <th className="px-2 py-2">المسدد منه</th>
                              <th className="px-2 py-2">الدين</th>
                              <th className="px-2 py-2">المسدد</th>
                              <th className="px-2 py-2">متبقي</th>
                              <th className="px-2 py-2">نوع الفاتورة</th>
                              <th className="px-2 py-2">تاريخ الدين</th>
                              <th className="px-2 py-2">الدفع</th>
                              <th className="px-2 py-2 max-w-[10rem]">ملاحظات</th>
                              <th className="px-2 py-2">التاريخ</th>
                              <th className="px-2 py-2 min-w-[10rem]">إجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailInvoicesSorted.map((inv) => {
                              const dr =
                                inv.debtRemaining ??
                                Math.max(0, (inv.debtAmount ?? 0) - (inv.debtPaid ?? 0));
                              return (
                                <tr key={inv.id} className="border-t border-gray-100 dark:border-gray-600">
                                  <td className="px-2 py-2 tabular-nums">
                                    {formatNumber(inv.balanceAmount, { suffix: ' د.ع' })}
                                  </td>
                                  <td className="px-2 py-2 tabular-nums">
                                    {formatNumber(inv.transferAmount, { suffix: ' د.ع' })}
                                  </td>
                                  <td className="px-2 py-2 tabular-nums">
                                    {formatNumber(inv.debtAmount ?? 0, { suffix: ' د.ع' })}
                                  </td>
                                  <td className="px-2 py-2 tabular-nums">
                                    {formatNumber(inv.debtPaid ?? 0, { suffix: ' د.ع' })}
                                  </td>
                                  <td className="px-2 py-2 tabular-nums">{formatNumber(dr, { suffix: ' د.ع' })}</td>
                                  <td className="px-2 py-2 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${invoiceTypeBadgeClass(inv.invoiceType)}`}
                                    >
                                      {invoiceTypeLabel(inv.invoiceType)}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 whitespace-nowrap text-gray-500">
                                    {inv.debtDate
                                      ? formatDate(inv.debtDate, { year: 'numeric', month: '2-digit', day: '2-digit' })
                                      : '—'}
                                  </td>
                                  <td className="px-2 py-2">
                                    {PAYMENT_METHOD_LABELS[Number(inv.paymentMethod)] ?? inv.paymentMethod}
                                  </td>
                                  <td
                                    className="px-2 py-2 max-w-[10rem] text-xs text-gray-600 dark:text-gray-400 align-top"
                                    title={(inv.notes ?? '').trim() || undefined}
                                  >
                                    {(inv.notes ?? '').trim() ? (
                                      <span className="line-clamp-2 break-words">{(inv.notes ?? '').trim()}</span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="px-2 py-2 whitespace-nowrap text-gray-500">
                                    {inv.createdAt
                                      ? formatDate(inv.createdAt, { year: 'numeric', month: '2-digit', day: '2-digit' })
                                      : '—'}
                                  </td>
                                  <td className="px-2 py-2">
                                    <div className="flex flex-wrap justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => openPayDebt(inv, detailForModal.customerName)}
                                        disabled={busy || dr <= 0}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-violet-600 disabled:opacity-40"
                                        title="تسديد دين"
                                      >
                                        <Banknote className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => sendWhatsAppMutation.mutate(inv.id)}
                                        disabled={busy || !(detailForModal.phoneNumber ?? '').trim()}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-green-600 disabled:opacity-40"
                                        title="واتساب"
                                      >
                                        <MessageCircle className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handlePrintInvoice(inv, {
                                            customerName: detailForModal.customerName,
                                            phoneNumber: detailForModal.phoneNumber,
                                            address: detailForModal.address,
                                            customerType: detailForModal.customerType,
                                          })
                                        }
                                        disabled={busy}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700"
                                        title="طباعة إيصال حراري"
                                      >
                                        <Printer className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openEditInvoice(detailForModal.id, detailForModal.customerName, inv)
                                        }
                                        disabled={busy}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-amber-600"
                                        title="تعديل"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteInvoice(inv)}
                                        disabled={busy}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-600"
                                        title="حذف"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {journalEntryModalOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <Landmark className="h-5 w-5 shrink-0" />
                إضافة قيد محاسبي
              </h2>
              <button
                type="button"
                onClick={() => {
                  setJournalEntryModalOpen(false);
                  setJournalEntryForm(emptyJournalEntryForm());
                }}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitJournalEntryForm} className="space-y-4 p-4">
              {isAdmin && (
                <JournalComboField
                  label="الوكيل *"
                  value={selectedAgentId}
                  onChange={pickJournalAgent}
                  options={journalAgentOptions}
                  disabled={!listEnabled || busy}
                  placeholder="ابحث باسم الشركة أو الوكيل..."
                  emptyListText="لا يوجد وكلاء"
                  clearIdOnType={false}
                  allowClear={false}
                />
              )}
              <div>
                <JournalComboField
                  label="من الوكيل *"
                  value={journalEntryForm.fromCustomerId}
                  onChange={(id) => setJournalEntryForm((f) => ({ ...f, fromCustomerId: id }))}
                  options={journalEntryCustomerOptions}
                  disabled={!listEnabled || busy || (isAdmin && !selectedAgentId)}
                  placeholder="ابحث بالاسم..."
                  emptyListText="لا يوجد عملاء في القائمة"
                />
                {(() => {
                  const cap = journalEntryCustomerOptions.find(
                    (o) => o.id === journalEntryForm.fromCustomerId
                  )?.debtCaption;
                  return cap ? (
                    <p className="mt-1 text-xs font-medium tabular-nums text-amber-800 dark:text-amber-200/90">
                      {cap}
                    </p>
                  ) : null;
                })()}
              </div>
              <div>
                <JournalComboField
                  label="إلى الوكيل *"
                  value={journalEntryForm.toCustomerId}
                  onChange={(id) => setJournalEntryForm((f) => ({ ...f, toCustomerId: id }))}
                  options={journalEntryCustomerOptions}
                  disabled={!listEnabled || busy || (isAdmin && !selectedAgentId)}
                  placeholder="ابحث بالاسم..."
                  emptyListText="لا يوجد عملاء في القائمة"
                />
                {(() => {
                  const cap = journalEntryCustomerOptions.find(
                    (o) => o.id === journalEntryForm.toCustomerId
                  )?.debtCaption;
                  return cap ? (
                    <p className="mt-1 text-xs font-medium tabular-nums text-amber-800 dark:text-amber-200/90">
                      {cap}
                    </p>
                  ) : null;
                })()}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">المبلغ *</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={journalEntryForm.amount || ''}
                    onChange={(e) =>
                      setJournalEntryForm((f) => ({ ...f, amount: Number(e.target.value) }))
                    }
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">التاريخ *</label>
                  <input
                    type="datetime-local"
                    required
                    value={journalEntryForm.dateLocal}
                    onChange={(e) => setJournalEntryForm((f) => ({ ...f, dateLocal: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">ملاحظات</label>
                <textarea
                  rows={2}
                  maxLength={4000}
                  value={journalEntryForm.notes}
                  onChange={(e) => setJournalEntryForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setJournalEntryModalOpen(false);
                    setJournalEntryForm(emptyJournalEntryForm());
                  }}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-800 dark:bg-gray-600 dark:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-md bg-slate-600 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {busy ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {companyDebtModalOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5" />
                إضافة فاتورة على الشركة
              </h2>
              <button
                type="button"
                onClick={() => {
                  setCompanyDebtModalOpen(false);
                  setCompanyDebtForm(emptyCompanyDebtForm());
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitCompanyDebtForm} className="p-4 space-y-3">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">اسم العميل/الجهة *</label>
                <input
                  required
                  maxLength={200}
                  value={companyDebtForm.customerName}
                  onChange={(e) => setCompanyDebtForm((f) => ({ ...f, customerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">مبلغ الدين *</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={companyDebtForm.debtAmount}
                    onChange={(e) => setCompanyDebtForm((f) => ({ ...f, debtAmount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">تاريخ الدين *</label>
                  <input
                    type="date"
                    required
                    value={companyDebtForm.debtDate}
                    onChange={(e) => setCompanyDebtForm((f) => ({ ...f, debtDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                <textarea
                  rows={3}
                  maxLength={4000}
                  value={companyDebtForm.notes ?? ''}
                  onChange={(e) => setCompanyDebtForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCompanyDebtModalOpen(false);
                    setCompanyDebtForm(emptyCompanyDebtForm());
                  }}
                  className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
                >
                  {busy ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* عميل: إنشاء / تعديل */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {customerModalEditingId ? 'تعديل عميل' : 'عميل جديد'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setCustomerModalOpen(false);
                  setCustomerModalEditingId(null);
                  setCustomerForm(emptyCustomerForm());
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitCustomerForm} className="p-4 space-y-3">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">اسم العميل *</label>
                <input
                  required
                  maxLength={200}
                  value={customerForm.customerName}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, customerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">الهاتف</label>
                <input
                  maxLength={30}
                  value={customerForm.phoneNumber ?? ''}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
                <input
                  maxLength={500}
                  value={customerForm.address ?? ''}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">نوع العميل</label>
                <select
                  value={customerForm.customerType}
                  onChange={(e) =>
                    setCustomerForm((f) => ({
                      ...f,
                      customerType: Number(e.target.value) as CustomerInvoiceCustomerType,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value={CustomerInvoiceCustomerType.NewCustomer}>{CUSTOMER_TYPE_LABELS[0]}</option>
                  <option value={CustomerInvoiceCustomerType.Agent}>{CUSTOMER_TYPE_LABELS[1]}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerModalOpen(false);
                    setCustomerModalEditingId(null);
                    setCustomerForm(emptyCustomerForm());
                  }}
                  className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 rounded-md bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
                >
                  {busy ? 'جاري الحفظ...' : customerModalEditingId ? 'حفظ التعديل' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* فاتورة: إنشاء / تعديل */}
      {invoiceModalOpen && invoiceModalCustomerId && (
        <div className="fixed inset-0 z-[56] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {invoiceEditingId ? 'تعديل فاتورة' : 'فاتورة جديدة'} — {invoiceModalCustomerName}
              </h2>
              <button type="button" onClick={closeInvoiceModal} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitInvoiceForm} className="p-4 space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                يُحسب مبلغ الدين تلقائياً: مبلغ الرصيد − مبلغ التحويل. لا يجوز أن يتجاوز التحويل الرصيد.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1"> المبالغ *</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={invoiceForm.balanceAmount}
                    onChange={(e) => setInvoiceForm((f) => ({ ...f, balanceAmount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">مبلغ الواصل *</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={invoiceForm.transferAmount}
                    onChange={(e) => setInvoiceForm((f) => ({ ...f, transferAmount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white font-mono"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600 dark:text-gray-400">الدين المحسوب (رصيد − تحويل)</span>
                  <span className="font-mono tabular-nums">{formatNumber(invoiceDebtPreview, { suffix: ' د.ع' })}</span>
                </div>
                {invoiceEditingId && (
                  <div className="flex justify-between gap-2 mt-1">
                    <span className="text-gray-600 dark:text-gray-400">المسدد حالياً</span>
                    <span className="font-mono tabular-nums">
                      {formatNumber(invoiceEditingDebtPaid, { suffix: ' د.ع' })}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">طريقة الدفع</label>
                <select
                  value={invoiceForm.paymentMethod}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({
                      ...f,
                      paymentMethod: Number(e.target.value) as CustomerInvoicePaymentMethod,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value={CustomerInvoicePaymentMethod.Cash}>{PAYMENT_METHOD_LABELS[0]}</option>
                  <option value={CustomerInvoicePaymentMethod.MasterCard}>{PAYMENT_METHOD_LABELS[1]}</option>
                  <option value={CustomerInvoicePaymentMethod.ZainCash}>{PAYMENT_METHOD_LABELS[2]}</option>
                  <option value={CustomerInvoicePaymentMethod.Other}>{PAYMENT_METHOD_LABELS[3]}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={invoiceForm.notes ?? ''}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  maxLength={4000}
                  placeholder="ملاحظات تظهر في التفاصيل وعند الطباعة"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm resize-y min-h-[4rem]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeInvoiceModal}
                  className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 rounded-md bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
                >
                  {busy ? 'جاري الحفظ...' : invoiceEditingId ? 'حفظ التعديل' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payDebtRow && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2">
                <Banknote className="h-5 w-5 text-violet-600" />
                تسديد دين
              </h2>
              <button
                type="button"
                onClick={() => {
                  setPayDebtRow(null);
                  setPayDebtCustomerName('');
                  setPayDebtAmountStr('');
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitPayDebt} className="p-4 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                العميل: <strong className="text-gray-900 dark:text-white">{payDebtCustomerName}</strong>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                المتبقي:{' '}
                <span className="font-mono tabular-nums">
                  {formatNumber(
                    payDebtRow.debtRemaining ??
                      Math.max(0, (payDebtRow.debtAmount ?? 0) - (payDebtRow.debtPaid ?? 0)),
                    { suffix: ' د.ع' }
                  )}
                </span>
              </p>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">المبلغ المراد تسديده</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  autoFocus
                  value={payDebtAmountStr}
                  onChange={(e) => setPayDebtAmountStr(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPayDebtRow(null);
                    setPayDebtCustomerName('');
                    setPayDebtAmountStr('');
                  }}
                  className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={payDebtMutation.isPending}
                  className="px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
                >
                  {payDebtMutation.isPending ? 'جاري التسديد...' : 'تأكيد التسديد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerInvoicesPage;
