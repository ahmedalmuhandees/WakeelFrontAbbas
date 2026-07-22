import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';
import { useDigits } from '../contexts/DigitsContext';
import { apiService, ApiService } from '../services/api';
import {
  EmployeeTaskStatus,
  EmployeeTaskType,
  SubscriberMaintenanceKind,
  UserRole,
} from '../types';
import type {
  EmployeeTask,
  EmployeeTaskCompleteInstallationRequest,
  EmployeeTaskCompleteMaintenanceRequest,
  EmployeeTaskCompleteAmountReceptionRequest,
  EmployeeTaskCreateRequest,
  EmployeeTaskCreateBatchResponse,
  EmployeeTaskRejectRequest,
  EmployeeTaskUpdateRequest,
  EmployeeTaskSubscriberOption,
  EmployeeTasksAgentPageDto,
  PaginatedResponse,
  User,
} from '../types';
import { showError, showInfo, showSuccess } from '../utils/notifications';
import {
  BadgeCheck,
  Ban,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Eye,
  Loader2,
  Package,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import notificationSound from '../sounds/universfield-new-notification-022-370046.mp3';
import { ensureWebPushSubscribed } from '../utils/pushNotifications';
import { useMyAgent } from '../hooks/useMyAgent';

/** دمج مهمة محدّثة في كل نسخ employee-tasks في الكاش (بدون إعادة جلب كاملة عند اكتمال DTO) */
function mergeEmployeeTaskIntoQueryCaches(qc: QueryClient, task: EmployeeTask) {
  qc.setQueriesData<PaginatedResponse<EmployeeTask>>(
    { predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'employee-tasks' },
    (old) => {
      if (!old?.data?.length) return old;
      const idx = old.data.findIndex((t) => t.id === task.id);
      if (idx < 0) return old;
      const nextData = [...old.data];
      nextData[idx] = { ...nextData[idx], ...task };
      return { ...old, data: nextData };
    }
  );
}

const taskTypeLabel = (type: EmployeeTaskType) => {
  if (type === EmployeeTaskType.SubscriberInstallation) return 'تنصيب مشترك';
  if (type === EmployeeTaskType.SubscriberMaintenance) return 'صيانة مشترك';
  if (type === EmployeeTaskType.AmountReception) return 'استلام مبلغ';
  return 'اخرى';
};

const maintenanceKindLabel = (kind?: SubscriberMaintenanceKind | null) => {
  if (kind == null) return '—';
  if (kind === SubscriberMaintenanceKind.CableCut) return 'قطع كيبل';
  if (kind === SubscriberMaintenanceKind.ServiceProblem) return 'مشكلة في الخدمة';
  if (kind === SubscriberMaintenanceKind.RouterPasswordChange) return 'تغيير رمز الراوتر';
  if (kind === SubscriberMaintenanceKind.Other) return 'اخرى';
  if (kind === SubscriberMaintenanceKind.PathSwitch) return 'تبديل مسار';
  if (kind === SubscriberMaintenanceKind.RouterReplacement) return 'استبدال راوتر';
  return `غير معروف (${kind})`;
};

function parseTaskIdFromReassignedAway(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.trim();
    return s || null;
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const id = o.taskId ?? o.TaskId;
    if (typeof id === 'string' && id.trim()) return id.trim();
  }
  return null;
}

type TaskNewSubscriberFields = EmployeeTask & {
  NewSubscriberName?: string | null;
  NewSubscriberPhone?: string | null;
  NewSubscriberAddress?: string | null;
};

function installationNewSubscriberName(t: EmployeeTask): string {
  const x = t as TaskNewSubscriberFields;
  return String(t.newSubscriberName ?? x.NewSubscriberName ?? '').trim();
}
function installationNewSubscriberPhone(t: EmployeeTask): string {
  const x = t as TaskNewSubscriberFields;
  return String(t.newSubscriberPhone ?? x.NewSubscriberPhone ?? '').trim();
}
function installationNewSubscriberAddress(t: EmployeeTask): string {
  const x = t as TaskNewSubscriberFields;
  return String(t.newSubscriberAddress ?? x.NewSubscriberAddress ?? '').trim();
}

/** عرض مختصر لمهمة تنصيب: المشترك الجديد من حقول المهمة ثم الاحتياطي */
function installationTaskSummary(t: EmployeeTask): string {
  const name = installationNewSubscriberName(t);
  if (name) return name;
  return t.subscriberDisplayName || t.subscriberName || '—';
}

/** اسم المشترك المعروض في الكارد (تنصيب / صيانة / استلام مبلغ) */
function taskCardSubscriberName(task: EmployeeTask): string {
  if (task.taskType === EmployeeTaskType.SubscriberInstallation) return installationTaskSummary(task);
  return String(task.subscriberDisplayName || task.subscriberName || '').trim() || '—';
}

function taskCardUsesSubscriberBlock(task: EmployeeTask): boolean {
  return (
    task.taskType === EmployeeTaskType.SubscriberInstallation ||
    task.taskType === EmployeeTaskType.SubscriberMaintenance ||
    task.taskType === EmployeeTaskType.AmountReception
  );
}

const formatTaskDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).split('T')[0] || '—';
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' }); // yyyy-MM-dd
};

function taskBodySummary(task: EmployeeTask): string {
  if (task.taskType === EmployeeTaskType.SubscriberInstallation) return installationTaskSummary(task);
  if (task.taskType === EmployeeTaskType.SubscriberMaintenance) return maintenanceKindLabel(task.maintenanceType);
  if (task.taskType === EmployeeTaskType.AmountReception) {
    return task.amountReceived != null ? String(task.amountReceived) : '—';
  }
  return task.taskTitle || task.note || '—';
}

function TaskTypeDecoration({ taskType }: { taskType: EmployeeTaskType }) {
  const base =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10';
  if (taskType === EmployeeTaskType.SubscriberInstallation) {
    return (
      <div
        className={`${base} bg-gradient-to-br from-violet-500/20 via-violet-400/10 to-fuchsia-500/15 text-violet-700 dark:from-violet-500/25 dark:text-violet-200`}
      >
        <Package className="h-5 w-5" strokeWidth={2} />
      </div>
    );
  }
  if (taskType === EmployeeTaskType.SubscriberMaintenance) {
    return (
      <div
        className={`${base} bg-gradient-to-br from-sky-500/20 via-blue-400/10 to-indigo-500/15 text-sky-700 dark:from-sky-500/25 dark:text-sky-200`}
      >
        <Wrench className="h-5 w-5" strokeWidth={2} />
      </div>
    );
  }
  if (taskType === EmployeeTaskType.AmountReception) {
    return (
      <div
        className={`${base} bg-gradient-to-br from-emerald-500/20 via-teal-400/10 to-cyan-500/15 text-emerald-800 dark:from-emerald-500/25 dark:text-emerald-200`}
      >
        <Banknote className="h-5 w-5" strokeWidth={2} />
      </div>
    );
  }
  return (
    <div
      className={`${base} bg-gradient-to-br from-amber-500/20 via-orange-400/10 to-rose-500/15 text-amber-900 dark:from-amber-500/20 dark:text-amber-200`}
    >
      <ClipboardList className="h-5 w-5" strokeWidth={2} />
    </div>
  );
}

function TaskStatusVisual({ status }: { status: EmployeeTaskStatus }) {
  if (status === EmployeeTaskStatus.Rejected) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-red-50 shadow-md ring-1 ring-rose-200/80 dark:from-rose-900/50 dark:to-red-950/35 dark:ring-rose-700/45">
          <Ban className="h-4 w-4 text-rose-700 dark:text-rose-200" strokeWidth={2} aria-hidden />
        </div>
        <span className="text-[9px] font-bold text-rose-900 dark:text-rose-100">مرفوضة</span>
      </div>
    );
  }
  if (status === EmployeeTaskStatus.Pending) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1 text-center">
        <div className="relative flex h-11 w-11 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/30 animate-ping" />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-50 shadow-md ring-2 ring-amber-200/80 dark:from-amber-900/70 dark:to-amber-950/50 dark:ring-amber-600/40">
            <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-300" aria-hidden />
          </span>
        </div>
        <span className="max-w-[4rem] text-[9px] font-bold leading-tight text-amber-800 dark:text-amber-200">
          قيد القبول
        </span>
      </div>
    );
  }
  if (status === EmployeeTaskStatus.Accepted) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-blue-50 shadow-md ring-1 ring-sky-200/70 dark:from-sky-900/55 dark:to-blue-950/40 dark:ring-sky-700/50">
          <UserCheck className="h-4 w-4 text-sky-600 dark:text-sky-300" strokeWidth={2} aria-hidden />
        </div>
        <span className="text-[9px] font-bold text-sky-800 dark:text-sky-200">قيد التنفيذ</span>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-green-50 shadow-md ring-1 ring-emerald-200/80 dark:from-emerald-900/50 dark:to-green-950/35 dark:ring-emerald-700/45">
        <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" strokeWidth={2} aria-hidden />
      </div>
      <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-200">مكتملة</span>
    </div>
  );
}

interface EmployeeTaskCardProps {
  task: EmployeeTask;
  variant: 'employee' | 'manager';
  canManage: boolean;
  formatNumber: (value: number, options?: { suffix?: string }) => string;
  onAccept: () => void;
  onReject: () => void;
  onDetails: () => void;
  onCompleteInstallation: () => void;
  onCompleteMaintenance: () => void;
  onCompleteAmount: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const EmployeeTaskCard: React.FC<EmployeeTaskCardProps> = ({
  task,
  variant,
  canManage,
  formatNumber,
  onAccept,
  onReject,
  onDetails,
  onCompleteInstallation,
  onCompleteMaintenance,
  onCompleteAmount,
  onEdit,
  onDelete,
}) => {
  const pending = task.status === EmployeeTaskStatus.Pending;
  const summary =
    task.taskType === EmployeeTaskType.AmountReception && task.amountReceived != null
      ? formatNumber(task.amountReceived, { suffix: ' د.ع' })
      : taskBodySummary(task);
  const subscriberBlock = taskCardUsesSubscriberBlock(task);
  const subscriberName = taskCardSubscriberName(task);
  const employeeDisplay =
    task.employeeName || task.employeeFullName || task.employeeUserName || '—';
  const maintenanceDetail =
    task.taskType === EmployeeTaskType.SubscriberMaintenance
      ? maintenanceKindLabel(task.maintenanceType)
      : null;
  const amountDetail =
    task.taskType === EmployeeTaskType.AmountReception && task.amountReceived != null
      ? formatNumber(task.amountReceived, { suffix: ' د.ع' })
      : null;

  return (
    <article
      className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300 hover:shadow-md dark:bg-gray-800/90 ${
        pending
          ? 'border-amber-300/90 shadow-amber-500/10 ring-1 ring-amber-400/25 dark:border-amber-600/55 dark:ring-amber-500/20'
          : task.status === EmployeeTaskStatus.Rejected
            ? 'border-rose-300/90 shadow-rose-500/10 ring-1 ring-rose-400/25 dark:border-rose-800/55 dark:ring-rose-900/25'
            : task.status === EmployeeTaskStatus.Accepted
              ? 'border-sky-200/90 dark:border-sky-700/50'
              : 'border-emerald-200/80 dark:border-emerald-800/40'
      }`}
    >
      {pending && (
        <div
          className="wakeel-task-wait-bar absolute inset-x-0 top-0 z-10 h-0.5 rounded-t-xl bg-gradient-to-l from-amber-400 via-amber-300 to-amber-500"
          aria-hidden
        />
      )}
      <div className="px-3 pt-4 pb-0 sm:px-4 sm:pt-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 text-right">
            <div className="flex flex-wrap items-center gap-1.5 justify-end sm:gap-2">
              <TaskTypeDecoration taskType={task.taskType} />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white sm:text-base">
                  {taskTypeLabel(task.taskType)}
                </h3>
                {subscriberBlock ? (
                  <div className="mt-2 space-y-2 rounded-lg border border-gray-200/90 bg-gray-50/95 px-2.5 py-2 text-right dark:border-gray-600/70 dark:bg-gray-900/40">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">
                        المشترك
                      </p>
                      <p className="mt-0.5 text-sm font-bold leading-snug text-gray-900 dark:text-white sm:text-[15px]">
                        {subscriberName}
                      </p>
                    </div>
                    {variant === 'manager' && (
                      <div className="border-t border-gray-200/90 pt-2 dark:border-gray-600/60">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                          الموظف المكلّف
                        </p>
                        <p className="mt-0.5 truncate text-sm font-bold leading-snug text-indigo-950 dark:text-indigo-100 sm:text-[15px]">
                          {employeeDisplay}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-300 sm:text-sm">
                      {summary}
                    </p>
                    {variant === 'manager' && (
                      <div className="mt-2 rounded-lg border border-gray-200/90 bg-gray-50/95 px-2.5 py-2 text-right dark:border-gray-600/70 dark:bg-gray-900/40">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                          الموظف المكلّف
                        </p>
                        <p className="mt-0.5 truncate text-sm font-bold text-indigo-950 dark:text-indigo-100 sm:text-[15px]">
                          {employeeDisplay}
                        </p>
                      </div>
                    )}
                  </>
                )}
                {subscriberBlock && maintenanceDetail && (
                  <p className="mt-1.5 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                    نوع الصيانة: {maintenanceDetail}
                  </p>
                )}
                {subscriberBlock && amountDetail && (
                  <p className="mt-1.5 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                    المبلغ: {amountDetail}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
              <div className="rounded-lg bg-gray-50/90 px-2 py-1.5 dark:bg-gray-700/40">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  تاريخ الإنشاء
                </p>
                <p className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-white">{formatTaskDate(task.createdAt)}</p>
              </div>
              <div className="rounded-lg bg-gray-50/90 px-2 py-1.5 dark:bg-gray-700/40">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  تاريخ القبول
                </p>
                <p className="mt-0.5 text-xs font-semibold text-gray-900 dark:text-white">{formatTaskDate(task.acceptedAt)}</p>
              </div>
              <div className="col-span-2 rounded-lg bg-gradient-to-l from-primary-50/80 to-transparent px-2 py-1.5 sm:col-span-1 dark:from-primary-900/25">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-primary-700/80 dark:text-primary-300/90">
                  مدة المهمة
                </p>
                <p className="mt-0.5 text-xs font-bold text-primary-800 dark:text-primary-200">{task.taskDuration || '—'}</p>
              </div>
            </div>
          </div>
          <TaskStatusVisual status={task.status} />
        </div>

        {variant === 'manager' && canManage ? (
          <div className="mt-3 -mx-3 rounded-b-xl border-t border-gray-100 bg-gray-50/80 px-2 pb-2.5 pt-2 dark:border-gray-700/80 dark:bg-gray-900/35 sm:-mx-4 sm:px-2.5 sm:pb-3">
            <div className="grid w-full grid-cols-3 gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={onDetails}
                className="inline-flex min-h-[30px] w-full min-w-0 items-center justify-center gap-0.5 rounded-md bg-gradient-to-l from-indigo-600 to-violet-600 px-1 py-1 text-[10px] font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700 sm:min-h-[32px] sm:text-[11px]"
              >
                <Eye className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                <span className="truncate">التفاصيل</span>
              </button>
              <button
                type="button"
                disabled={task.status !== EmployeeTaskStatus.Pending}
                onClick={onEdit}
                className="inline-flex min-h-[30px] w-full min-w-0 items-center justify-center gap-0.5 rounded-md border border-gray-200 bg-white px-1 py-1 text-[10px] font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 sm:min-h-[32px] sm:text-[11px]"
                title={
                  task.status !== EmployeeTaskStatus.Pending ? 'التعديل متاح للمهام المعلّقة فقط' : undefined
                }
              >
                <Pencil className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                <span className="truncate">تعديل</span>
              </button>
              <button
                type="button"
                disabled={task.status !== EmployeeTaskStatus.Pending}
                onClick={onDelete}
                className="inline-flex min-h-[30px] w-full min-w-0 items-center justify-center gap-0.5 rounded-md bg-gradient-to-l from-red-600 to-rose-600 px-1 py-1 text-[10px] font-semibold text-white shadow-sm transition hover:from-red-700 hover:to-rose-700 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[32px] sm:text-[11px]"
                title={task.status !== EmployeeTaskStatus.Pending ? 'الحذف متاح للمهام المعلّقة فقط' : undefined}
              >
                <Trash2 className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                <span className="truncate">حذف</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-gray-100 px-0 pb-3 pt-3 dark:border-gray-700/80 sm:gap-2">
            {variant === 'employee' && task.status === EmployeeTaskStatus.Pending && (
              <>
                <button
                  type="button"
                  onClick={onAccept}
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-gradient-to-l from-blue-600 to-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-blue-600 sm:min-h-[36px] sm:px-3.5 sm:text-sm"
                >
                  <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  قبول المهمة
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100 dark:hover:bg-rose-900/50 sm:min-h-[36px] sm:px-3.5 sm:text-sm"
                >
                  <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  رفض المهمة
                </button>
                <button
                  type="button"
                  onClick={onDetails}
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-800 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 sm:min-h-[36px] sm:text-sm"
                >
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  التفاصيل
                </button>
              </>
            )}

            {variant === 'employee' && task.status === EmployeeTaskStatus.Accepted && (
              <button
                type="button"
                onClick={onReject}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100 dark:hover:bg-rose-900/50 sm:min-h-[36px] sm:px-3.5 sm:text-sm"
              >
                <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                رفض المهمة
              </button>
            )}

            {variant === 'employee' && task.status === EmployeeTaskStatus.Accepted && task.taskType === EmployeeTaskType.SubscriberInstallation && (
              <button
                type="button"
                onClick={onCompleteInstallation}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-gradient-to-l from-green-600 to-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-green-700 hover:to-emerald-600 sm:min-h-[36px] sm:text-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                إكمال التنصيب
              </button>
            )}
            {variant === 'employee' && task.status === EmployeeTaskStatus.Accepted && task.taskType === EmployeeTaskType.SubscriberMaintenance && (
              <button
                type="button"
                onClick={onCompleteMaintenance}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-gradient-to-l from-green-700 to-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-green-800 hover:to-green-700 sm:min-h-[36px] sm:text-sm"
              >
                <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                إكمال الصيانة
              </button>
            )}
            {variant === 'employee' && task.status === EmployeeTaskStatus.Accepted && task.taskType === EmployeeTaskType.AmountReception && (
              <button
                type="button"
                onClick={onCompleteAmount}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-gradient-to-l from-emerald-600 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-600 sm:min-h-[36px] sm:text-sm"
              >
                <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                إكمال استلام مبلغ
              </button>
            )}

            {variant === 'employee' && task.status === EmployeeTaskStatus.Rejected && (
              <button
                type="button"
                onClick={onDetails}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-800 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 sm:min-h-[36px] sm:text-sm"
              >
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                التفاصيل
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

const EmployeeTasksPage: React.FC = () => {
  const { user } = useAuth();
  const { formatNumber } = useDigits();
  const queryClient = useQueryClient();
  const isEmployee = user?.role === UserRole.Employee;
  const canManage =
    user?.role === UserRole.Admin ||
    user?.role === UserRole.Agent ||
    user?.role === UserRole.SubAgent ||
    (user?.role === UserRole.Employee &&
      (!!user?.canManageEmployeeTasks || !!user?.canManageMaterialsAndSales));
  const isAdmin = user?.role === UserRole.Admin;

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<EmployeeTaskStatus | ''>('');
  const [agentId, setAgentId] = useState('');
  const [pushReady, setPushReady] = useState<boolean>(false);
  const [pushBusy, setPushBusy] = useState<boolean>(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EmployeeTask | null>(null);
  const [rejectModalTask, setRejectModalTask] = useState<EmployeeTask | null>(null);
  const [rejectReasonDraft, setRejectReasonDraft] = useState('');
  const employeeTaskRejectToastDedupeRef = useRef<{ id: string; at: number } | null>(null);

  const [createForm, setCreateForm] = useState<EmployeeTaskCreateRequest>({
    employeeUserId: '',
    taskType: EmployeeTaskType.SubscriberInstallation,
    subscriberId: '',
    newSubscriberName: '',
    newSubscriberPhone: '',
    newSubscriberAddress: '',
    maintenanceType: SubscriberMaintenanceKind.CableCut,
    amountReceived: undefined,
    taskTitle: '',
    note: '',
  });
  const [completeForm, setCompleteForm] = useState<EmployeeTaskCompleteInstallationRequest>({
    amountReceived: 0,
    note: '',
  });
  const [completeMaintenanceForm, setCompleteMaintenanceForm] = useState<EmployeeTaskCompleteMaintenanceRequest>({
    note: '',
  });
  const [completeAmountReceptionForm, setCompleteAmountReceptionForm] =
    useState<EmployeeTaskCompleteAmountReceptionRequest>({
      amountReceived: 0,
      note: '',
    });

  // EmployeeTaskSubscriber dropdown (for SubscriberMaintenance)
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [subscriberSearchDebounced, setSubscriberSearchDebounced] = useState('');
  const [subscriberPage, setSubscriberPage] = useState(1);
  const [subscriberOptions, setSubscriberOptions] = useState<EmployeeTaskSubscriberOption[]>([]);
  const [amountReceptionSubscriberIds, setAmountReceptionSubscriberIds] = useState<string[]>([]);
  /** قائمة المشتركين: ذوو الدين فقط (GET …?debtOnly=true) */
  const [subscriberDebtOnly, setSubscriberDebtOnly] = useState(false);
  /** وضع استلام الديون: الخادم يفضّل أصحاب الديون، ومع fallback قد يُرجع كل المشتركين */
  const [debtCollection, setDebtCollection] = useState(false);

  /** معرّف مجموعة SignalR للوكيل (نص agentId) — للأدمن من القائمة، للوكيل/الفرعي من GET /Agents/me */
  const loadMyAgentForHub = canManage && !isEmployee && !isAdmin;
  const { data: myAgent } = useMyAgent(loadMyAgentForHub);
  const signalRAgentGroupId = (isAdmin ? agentId.trim() : myAgent?.id ?? '').trim();

  useEffect(() => {
    const t = setTimeout(() => setSubscriberSearchDebounced(subscriberSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [subscriberSearch]);

  const {
    data: subscribersResponse,
    isFetching: subscribersLoading,
  } = useQuery({
    queryKey: [
      'employee-task-subscribers',
      isAdmin ? agentId.trim() : 'me',
      subscriberPage,
      subscriberSearchDebounced,
      subscriberDebtOnly,
    ],
    queryFn: async () => {
      if (isAdmin) {
        return apiService.getEmployeeTaskSubscribers({
          page: subscriberPage,
          pageSize: subscriberDebtOnly ? 50 : 10,
          searchTerm: subscriberSearchDebounced || undefined,
          agentId: agentId.trim() || undefined,
          debtOnly: subscriberDebtOnly ? true : undefined,
        });
      }

      const subscribers = await apiService.getSubscribers({
        page: subscriberPage,
        pageSize: 165,
        search: subscriberSearchDebounced || undefined,
      });

      const rows = subscribers.data ?? [];
      return {
        ...subscribers,
        data: rows
          .map((s) => ({
            id: String(s.id ?? (s as { Id?: string }).Id ?? '').trim(),
            username: s.username,
            displayName:
              s.fullName ||
              [s.firstName, s.lastName].filter(Boolean).join(' ').trim() ||
              s.username ||
              '',
            phoneNumber: s.phoneNumber,
            totalDebt: s.totalDebt ?? 0,
          }))
          .filter((o) => o.id),
      };
    },
    enabled:
      (showCreateModal || showEditModal) &&
      (createForm.taskType === EmployeeTaskType.SubscriberMaintenance ||
        createForm.taskType === EmployeeTaskType.AmountReception) &&
      (!isAdmin || !!agentId.trim()),
  });

  useEffect(() => {
    if (!subscribersResponse) return;
    const incoming = subscribersResponse.data ?? [];
    if (subscriberPage === 1) {
      setSubscriberOptions(incoming);
      return;
    }
    setSubscriberOptions((prev) => {
      const seen = new Set(prev.map((s) => s.id));
      const merged = [...prev];
      for (const item of incoming) {
        if (!seen.has(item.id)) merged.push(item);
      }
      return merged;
    });
  }, [subscribersResponse, subscriberPage]);

  const taskQueryParams = useMemo(
    () => ({
      page,
      pageSize,
      searchTerm: searchTerm.trim() || undefined,
      status: status === '' ? undefined : status,
      agentId: isAdmin ? agentId.trim() || undefined : undefined,
    }),
    [page, pageSize, searchTerm, status, isAdmin, agentId]
  );

  const taskQueryParamsRef = useRef(taskQueryParams);
  useEffect(() => {
    taskQueryParamsRef.current = taskQueryParams;
  }, [taskQueryParams]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    audioRef.current = new Audio(notificationSound);
  }, []);

  const signalRConnectionRef = useRef<HubConnection | null>(null);

  const { data: myEmployees = [] } = useQuery<User[]>({
    queryKey: ['my-employees-for-tasks'],
    queryFn: () => apiService.getMyEmployees(),
    enabled: canManage && !isAdmin,
  });

  const { data: adminEmployees = [] } = useQuery<User[]>({
    queryKey: ['agent-employees-for-tasks', agentId.trim()],
    queryFn: () => apiService.getAgentEmployees(agentId.trim()),
    enabled: canManage && isAdmin && !!agentId.trim(),
  });

  const employeesOptions = isAdmin ? adminEmployees : myEmployees;

  /** إعادة استدعاء قائمة الموظفين عند فتح «مهمة جديدة» حتى تظهر أسماء محدّثة (خصوصاً لموظف بصلاحية إدارة المهام). */
  useEffect(() => {
    if (!showCreateModal || !canManage) return;
    void queryClient.invalidateQueries({ queryKey: ['my-employees-for-tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['agent-employees-for-tasks'] });
  }, [showCreateModal, canManage, queryClient]);

  const managerTasksAutoSync = canManage && !isEmployee;

  const { data: tasksResponse, isLoading, refetch } = useQuery<EmployeeTasksAgentPageDto>({
    queryKey: ['employee-tasks', isEmployee ? 'my' : 'agent', taskQueryParams],
    queryFn: () =>
      isEmployee ? apiService.getMyEmployeeTasks(taskQueryParams) : apiService.getAgentEmployeeTasks(taskQueryParams),
    enabled: !!user && (isEmployee || canManage) && (!isAdmin || !!taskQueryParams.agentId),
    /** الوكيل/الأدمن: تحديث تلقائي لرؤية قبول الموظف للمهمة دون زر تحديث */
    refetchInterval: managerTasksAutoSync
      ? () => (typeof document !== 'undefined' && document.visibilityState === 'hidden' ? false : 12_000)
      : false,
    refetchOnWindowFocus: managerTasksAutoSync,
  });

  // SignalR: إشعارات المهام الجديدة للموظف فقط
  useEffect(() => {
    if (!isEmployee) return;
    if (!user?.canReceiveTaskRequests) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const baseUrl = apiService.getBaseURL();
    const hubUrl = `${baseUrl.replace(/\/api\/?$/, '')}/hubs/dashboard`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    signalRConnectionRef.current = connection;

    connection.on('employeeTaskReassignedAway', (payload: unknown) => {
      const taskId = parseTaskIdFromReassignedAway(payload);
      if (!taskId) return;

      showInfo('إعادة تعيين', 'أُعيدت المهمة إلى موظف آخر وستُزال من قائمتك.');

      queryClient.setQueriesData<PaginatedResponse<EmployeeTask>>(
        { queryKey: ['employee-tasks', 'my'] },
        (old) => {
          if (!old?.data?.length) return old;
          const nextData = old.data.filter((t) => t.id !== taskId);
          if (nextData.length === old.data.length) return old;
          const removed = old.data.length - nextData.length;
          const newTotalItems = Math.max(0, old.totalItems - removed);
          const newTotalPages = Math.max(1, Math.ceil(newTotalItems / (old.pageSize || 1)));
          const currentPage = old.currentPage ?? old.pageNumber ?? 1;
          return {
            ...old,
            data: nextData,
            totalItems: newTotalItems,
            totalPages: newTotalPages,
            hasNextPage: currentPage < newTotalPages,
            hasPreviousPage: currentPage > 1,
          };
        }
      );
    });

    connection.on('employeeTaskAssignedBatch', (payload: unknown) => {
      const list: EmployeeTask[] = Array.isArray(payload)
        ? (payload as EmployeeTask[])
        : ((payload as { tasks?: EmployeeTask[] })?.tasks ?? []);
      if (!list.length) return;
      try {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          const p = audioRef.current.play();
          if (p && typeof (p as any).catch === 'function') (p as any).catch(() => {});
        }
      } catch {
        // ignore
      }
      const debtLike = list.some(
        (t) =>
          (t.taskTitle && String(t.taskTitle).includes('ديون')) ||
          (t.note && String(t.note).includes('ديون')) ||
          (t.taskDetails && String(t.taskDetails).includes('ديون'))
      );
      showSuccess(
        debtLike ? 'استلام ديون' : 'مهام جديدة',
        debtLike ? `وصلتك ${list.length} مهمة استلام ديون.` : `وصلتك ${list.length} مهمة جديدة.`
      );

      const qp = taskQueryParamsRef.current;
      if (qp.page !== 1) return;

      const term = qp.searchTerm?.toString().trim().toLowerCase();

      const queryKey: any = ['employee-tasks', 'my', qp];
      queryClient.setQueryData<PaginatedResponse<EmployeeTask>>(queryKey, (old) => {
        if (!old) return old;
        let nextData = [...(old.data ?? [])];
        let added = 0;
        for (const task of list) {
          if (qp.status != null && task.status !== qp.status) continue;
          if (term) {
            const hay = `${task.taskTitle ?? ''} ${task.note ?? ''} ${task.taskDetails ?? ''}`.toLowerCase();
            if (!hay.includes(term)) continue;
          }
          if (nextData.some((t) => t.id === task.id)) continue;
          nextData = [task, ...nextData];
          added += 1;
        }
        if (added === 0) return old;
        nextData = nextData.slice(0, old.pageSize);
        const newTotalItems = old.totalItems + added;
        const newTotalPages = Math.max(1, Math.ceil(newTotalItems / old.pageSize));
        const currentPage = old.currentPage ?? old.pageNumber ?? 1;
        return {
          ...old,
          data: nextData,
          totalItems: newTotalItems,
          totalPages: newTotalPages,
          hasNextPage: currentPage < newTotalPages,
          hasPreviousPage: currentPage > 1,
          currentPage,
        };
      });
    });

    connection.on('employeeTaskAssigned', (task: EmployeeTask) => {
      // تشغيل صوت (قد يفشل في المتصفحات عند عدم وجود تفاعل مستخدم)
      try {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          const p = audioRef.current.play();
          if (p && typeof (p as any).catch === 'function') (p as any).catch(() => {});
        }
      } catch {
        // ignore
      }

      showSuccess('مهمة جديدة', taskTypeLabel(task.taskType));

      const qp = taskQueryParamsRef.current;
      if (qp.page !== 1) return;
      if (qp.status != null && task.status !== qp.status) return;

      const term = qp.searchTerm?.toString().trim().toLowerCase();
      if (term) {
        const hay = `${task.taskTitle ?? ''} ${task.note ?? ''}`.toLowerCase();
        if (!hay.includes(term)) return;
      }

      const queryKey: any = ['employee-tasks', 'my', qp];
      queryClient.setQueryData<PaginatedResponse<EmployeeTask>>(queryKey, (old) => {
        if (!old) return old;
        if (old.data.some((t) => t.id === task.id)) return old;

        const newTotalItems = old.totalItems + 1;
        const newTotalPages = Math.max(1, Math.ceil(newTotalItems / old.pageSize));

        const nextData = [task, ...(old.data ?? [])].slice(0, old.pageSize);

        return {
          ...old,
          data: nextData,
          totalItems: newTotalItems,
          totalPages: newTotalPages,
          hasNextPage: qp.page < newTotalPages,
          hasPreviousPage: qp.page > 1,
          currentPage: qp.page,
        };
      });
    });

    connection.onreconnected(async () => {
      try {
        await connection.invoke('JoinEmployeeTasksGroup');
      } catch {
        // ignore
      }
    });

    connection
      .start()
      .then(async () => {
        await connection.invoke('JoinEmployeeTasksGroup');
      })
      .catch(() => {
        // ignore
      });

    return () => {
      // Leave group on exit
      (async () => {
        try {
          await connection.invoke('LeaveEmployeeTasksGroup');
        } catch {
          // ignore
        }
        try {
          await connection.stop();
        } catch {
          // ignore
        }
      })();
      signalRConnectionRef.current = null;
    };
  }, [isEmployee, user?.canReceiveTaskRequests, user?.id, queryClient]);

  /**
   * SignalR للوكيل/الأدمن: JoinAgentGroup(agentId) ثم employeeTaskUpdated.
   * الباكند يبثّ بعد نجاح (TryBroadcastAgentEmployeeTaskUpdatedAsync — أخطاء SignalR لا تفشل العملية):
   * POST …/accept، …/reject، …/complete-installation، …/complete-maintenance، …/complete-amount-reception
   * (حمولة EmployeeTaskDto كاملة أو { taskId }).
   * للمنشئ: JoinEmployeeTaskCreatorNotificationsGroup ثم employeeTaskRejected (مرتين من الخادم لضمان التسليم — ندمج الكاش ونُظهر إشعاراً واحداً عند التكرار).
   */
  useEffect(() => {
    if (!user) return;
    if (!canManage || isEmployee) return;
    if (!signalRAgentGroupId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const groupId = signalRAgentGroupId;

    const baseUrl = apiService.getBaseURL();
    const hubUrl = `${baseUrl.replace(/\/api\/?$/, '')}/hubs/dashboard`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('token') || token,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    const applyHubEmployeeTaskPayload = (payload: unknown) => {
      if (payload && typeof payload === 'object') {
        const o = payload as Record<string, unknown>;
        const fullId = o.id ?? o.Id;
        const onlyTaskId = o.taskId ?? o.TaskId;
        if ((typeof fullId !== 'string' || !fullId.trim()) && onlyTaskId != null) {
          void queryClient.invalidateQueries({ queryKey: ['employee-tasks'], refetchType: 'all' });
          return;
        }
        if (typeof fullId === 'string' && fullId.trim()) {
          const id = fullId.trim();
          const task = { ...(payload as EmployeeTask), id };
          mergeEmployeeTaskIntoQueryCaches(queryClient, task);
          setSelectedTask((prev) => (prev?.id === id ? { ...prev, ...task } : prev));
          return;
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['employee-tasks'], refetchType: 'all' });
    };

    connection.on('employeeTaskUpdated', applyHubEmployeeTaskPayload);

    connection.on('employeeTaskRejected', (payload: unknown) => {
      applyHubEmployeeTaskPayload(payload);
      if (payload && typeof payload === 'object') {
        const o = payload as Record<string, unknown>;
        const fullId = o.id ?? o.Id;
        if (typeof fullId === 'string' && fullId.trim()) {
          const id = fullId.trim();
          const now = Date.now();
          const prev = employeeTaskRejectToastDedupeRef.current;
          if (!prev || prev.id !== id || now - prev.at > 2600) {
            employeeTaskRejectToastDedupeRef.current = { id, at: now };
            showInfo('رفض المهمة', 'رُفضت المهمة من قِبل الموظّف وسُجّل السبب.');
          }
        }
      }
    });

    connection.onreconnected(async () => {
      try {
        await connection.invoke('JoinAgentGroup', groupId);
      } catch {
        /* ignore */
      }
      try {
        await connection.invoke('JoinEmployeeTaskCreatorNotificationsGroup');
      } catch {
        /* ignore */
      }
    });

    connection
      .start()
      .then(async () => {
        await connection.invoke('JoinAgentGroup', groupId).catch(() => {});
        await connection.invoke('JoinEmployeeTaskCreatorNotificationsGroup').catch(() => {});
      })
      .catch(() => {});

    return () => {
      (async () => {
        try {
          await connection.invoke('LeaveEmployeeTaskCreatorNotificationsGroup');
        } catch {
          /* ignore */
        }
        try {
          await connection.invoke('LeaveAgentGroup', groupId);
        } catch {
          /* ignore */
        }
        try {
          await connection.stop();
        } catch {
          /* ignore */
        }
      })();
    };
  }, [canManage, isEmployee, user, queryClient, signalRAgentGroupId]);

  useEffect(() => {
    if (!isEmployee) return;
    if (!user?.canReceiveTaskRequests) return;
    setPushReady(typeof Notification !== 'undefined' && Notification.permission === 'granted');
  }, [isEmployee, user?.canReceiveTaskRequests]);

  const createMutation = useMutation({
    mutationFn: (payload: EmployeeTaskCreateRequest) => apiService.createEmployeeTask(payload),
    onSuccess: (data) => {
      const batch = data as EmployeeTaskCreateBatchResponse;
      if (batch && Array.isArray(batch.tasks)) {
        showSuccess('تمت الإضافة', batch.message ?? `تم إنشاء ${batch.tasks.length} مهمة.`);
      } else {
        showSuccess('تمت الإضافة', 'تم إنشاء المهمة بنجاح.');
      }
      setShowCreateModal(false);
      setSubscriberSearch('');
      setSubscriberSearchDebounced('');
      setSubscriberPage(1);
      setSubscriberOptions([]);
      setSubscriberDebtOnly(false);
      setDebtCollection(false);
      setCreateForm({
        employeeUserId: '',
        taskType: EmployeeTaskType.SubscriberInstallation,
        subscriberId: '',
        newSubscriberName: '',
        newSubscriberPhone: '',
        newSubscriberAddress: '',
        maintenanceType: SubscriberMaintenanceKind.CableCut,
        amountReceived: undefined,
        taskTitle: '',
        note: '',
      });
      setAmountReceptionSubscriberIds([]);
      void queryClient.invalidateQueries({ queryKey: ['employee-tasks'], refetchType: 'all' });
    },
    onError: (err) => showError('خطأ', ApiService.showError(err)),
  });

  const buildUpdatePayload = (payload: EmployeeTaskCreateRequest): EmployeeTaskUpdateRequest => {
    const trimmed: EmployeeTaskUpdateRequest = {
      taskType: payload.taskType,
      note: payload.note?.trim() || undefined,
    };
    const empId = payload.employeeUserId?.trim();
    if (empId) trimmed.employeeUserId = empId;

    if (payload.taskType === EmployeeTaskType.SubscriberInstallation) {
      trimmed.newSubscriberName = payload.newSubscriberName?.trim();
      trimmed.newSubscriberPhone = payload.newSubscriberPhone?.trim();
      trimmed.newSubscriberAddress = payload.newSubscriberAddress?.trim();
      return trimmed;
    }
    if (payload.taskType === EmployeeTaskType.SubscriberMaintenance) {
      const subscriberId = payload.subscriberId?.trim();
      if (subscriberId) trimmed.subscriberId = subscriberId;
      trimmed.maintenanceType = payload.maintenanceType;
      return trimmed;
    }
    if (payload.taskType === EmployeeTaskType.Other) {
      const taskTitle = payload.taskTitle?.trim();
      if (taskTitle) trimmed.taskTitle = taskTitle;
      return trimmed;
    }
    if (payload.taskType === EmployeeTaskType.AmountReception) {
      const subscriberId = payload.subscriberId?.trim();
      if (subscriberId) trimmed.subscriberId = subscriberId;
      if (payload.amountReceived != null && !Number.isNaN(payload.amountReceived)) {
        trimmed.amountReceived = payload.amountReceived;
      }
      return trimmed;
    }
    return trimmed;
  };


  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EmployeeTaskUpdateRequest }) =>
      apiService.updateEmployeeTask(id, payload),
    onSuccess: () => {
      showSuccess('تم التعديل', 'تم تعديل المهمة بنجاح.');
      setShowEditModal(false);
      setSelectedTask(null);
      setSubscriberSearch('');
      setSubscriberSearchDebounced('');
      setSubscriberPage(1);
      setSubscriberOptions([]);
      void queryClient.invalidateQueries({ queryKey: ['employee-tasks'], refetchType: 'all' });
    },
    onError: (err) => showError('خطأ', ApiService.showError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteEmployeeTask(id),
    onSuccess: () => {
      showSuccess('تم الحذف', 'تم حذف المهمة بنجاح.');
      void queryClient.invalidateQueries({ queryKey: ['employee-tasks'], refetchType: 'all' });
    },
    onError: (err) => showError('خطأ', ApiService.showError(err)),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => apiService.acceptEmployeeTask(id),
    onSuccess: async (updated, taskId) => {
      showSuccess('تم القبول', 'تم قبول المهمة.');
      if (updated?.id) mergeEmployeeTaskIntoQueryCaches(queryClient, updated);
      setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, ...updated } : prev));
      await queryClient.invalidateQueries({ queryKey: ['employee-tasks'], refetchType: 'all' });
    },
    onError: (err) => showError('خطأ', ApiService.showError(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EmployeeTaskRejectRequest }) =>
      apiService.rejectEmployeeTask(id, payload),
    onSuccess: async (updated, { id }) => {
      showSuccess('تم الرفض', 'سُجّلت المهمة كمرفوضة.');
      if (updated?.id) mergeEmployeeTaskIntoQueryCaches(queryClient, updated);
      setRejectModalTask(null);
      setRejectReasonDraft('');
      setSelectedTask((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev));
      await queryClient.invalidateQueries({ queryKey: ['employee-tasks'], refetchType: 'all' });
    },
    onError: (err) => showError('خطأ', ApiService.showError(err)),
  });

  const completeInstallationMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EmployeeTaskCompleteInstallationRequest }) =>
      apiService.completeEmployeeInstallationTask(id, payload),
    onSuccess: (updated) => {
      showSuccess('تم الإكمال', 'تم إكمال مهمة التنصيب بنجاح.');
      if (updated?.id) mergeEmployeeTaskIntoQueryCaches(queryClient, updated);
      setShowCompleteModal(false);
      setSelectedTask(null);
      void queryClient.invalidateQueries({ queryKey: ['employee-tasks'], refetchType: 'all' });
    },
    onError: (err) => showError('خطأ', ApiService.showError(err)),
  });

  const completeMaintenanceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EmployeeTaskCompleteMaintenanceRequest }) =>
      apiService.completeEmployeeMaintenanceTask(id, payload),
    onSuccess: (updated) => {
      showSuccess('تم الإكمال', 'تم إكمال مهمة الصيانة بنجاح.');
      if (updated?.id) mergeEmployeeTaskIntoQueryCaches(queryClient, updated);
      setShowCompleteModal(false);
      setSelectedTask(null);
      void queryClient.invalidateQueries({ queryKey: ['employee-tasks'], refetchType: 'all' });
    },
    onError: (err) => showError('خطأ', ApiService.showError(err)),
  });

  const completeAmountReceptionMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: EmployeeTaskCompleteAmountReceptionRequest;
    }) => apiService.completeEmployeeAmountReceptionTask(id, payload),
    onSuccess: (updated) => {
      showSuccess('تم الإكمال', 'تم إكمال مهمة استلام المبلغ بنجاح.');
      if (updated?.id) mergeEmployeeTaskIntoQueryCaches(queryClient, updated);
      setShowCompleteModal(false);
      setSelectedTask(null);
      void queryClient.invalidateQueries({ queryKey: ['employee-tasks'], refetchType: 'all' });
    },
    onError: (err) => showError('خطأ', ApiService.showError(err)),
  });

  const rows = tasksResponse?.data ?? [];
  const currentPage = tasksResponse?.currentPage ?? tasksResponse?.pageNumber ?? 1;
  const totalItems = tasksResponse?.totalItems ?? tasksResponse?.totalCount ?? 0;
  const totalPages = tasksResponse?.totalPages ?? 1;
  const hasNextPage = tasksResponse?.hasNextPage ?? currentPage < totalPages;
  const hasPreviousPage = tasksResponse?.hasPreviousPage ?? currentPage > 1;

  const validateCreatePayload = (payload: EmployeeTaskCreateRequest): string | null => {
    if (!payload.employeeUserId?.trim()) return 'اختر الموظف.';
    /** استلام مبلغ عند الإنشاء: المشتركون من checkboxes → amountReceptionSubscriberIds وليس subscriberId */
    const skipGenericSubscriberCheck =
      payload.taskType === EmployeeTaskType.AmountReception && showCreateModal;
    if (
      !payload.subscriberId?.trim() &&
      payload.taskType !== EmployeeTaskType.Other &&
      payload.taskType !== EmployeeTaskType.SubscriberInstallation &&
      !skipGenericSubscriberCheck
    ) {
      return 'اختر المشترك.';
    }
    if (payload.taskType === EmployeeTaskType.SubscriberInstallation) {
      if (!(payload.newSubscriberName || '').trim()) return 'اسم المشترك الجديد مطلوب.';
      if (!(payload.newSubscriberPhone || '').trim()) return 'هاتف المشترك الجديد مطلوب.';
      if (!(payload.newSubscriberAddress || '').trim()) return 'عنوان المشترك الجديد مطلوب.';
    }
    if (payload.taskType === EmployeeTaskType.SubscriberMaintenance) {
      if (!payload.subscriberId?.trim()) return 'صيانة مشترك تتطلب SubscriberId.';
      if (!payload.maintenanceType) return 'صيانة مشترك تتطلب MaintenanceType.';
    }
    if (payload.taskType === EmployeeTaskType.AmountReception) {
      if (showCreateModal) {
        if (amountReceptionSubscriberIds.length === 0) return 'اختر مشتركاً واحداً على الأقل.';
      } else if (!payload.subscriberId?.trim()) {
        return 'استلام مبلغ يتطلب SubscriberId.';
      }
    }
    if (payload.taskType === EmployeeTaskType.Other && !payload.taskTitle?.trim()) return 'أخرى تتطلب TaskTitle.';
    return null;
  };

  const normalizeTaskPayload = (payload: EmployeeTaskCreateRequest): EmployeeTaskCreateRequest => {
    const trimmed: EmployeeTaskCreateRequest = {
      employeeUserId: payload.employeeUserId?.trim(),
      taskType: payload.taskType,
      note: payload.note?.trim() || undefined,
    };

    if (payload.taskType === EmployeeTaskType.SubscriberInstallation) {
      trimmed.newSubscriberName = payload.newSubscriberName?.trim();
      trimmed.newSubscriberPhone = payload.newSubscriberPhone?.trim();
      trimmed.newSubscriberAddress = payload.newSubscriberAddress?.trim();
      return trimmed;
    }

    if (payload.taskType === EmployeeTaskType.SubscriberMaintenance) {
      const subscriberId = payload.subscriberId?.trim();
      if (subscriberId) trimmed.subscriberId = subscriberId;
      trimmed.maintenanceType = payload.maintenanceType;
      return trimmed;
    }

    if (payload.taskType === EmployeeTaskType.Other) {
      const taskTitle = payload.taskTitle?.trim();
      if (taskTitle) trimmed.taskTitle = taskTitle;
      return trimmed;
    }

    if (payload.taskType === EmployeeTaskType.AmountReception) {
      const subscriberId = payload.subscriberId?.trim();
      if (subscriberId) trimmed.subscriberId = subscriberId;
      if (payload.amountReceived != null && !Number.isNaN(payload.amountReceived)) {
        trimmed.amountReceived = payload.amountReceived;
      }
      return trimmed;
    }

    return trimmed;
  };

  if (!user) return null;

  const showAgentStatsStrip = canManage && !isEmployee && (isLoading || !!tasksResponse?.taskTypeStatistics);
  const stats = tasksResponse?.taskTypeStatistics;

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
        <div
          className={`flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5 ${
            showAgentStatsStrip ? 'border-b border-gray-100 dark:border-gray-700' : ''
          }`}
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">مهام الموظفين</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isEmployee ? 'مهامي الشخصية' : 'إدارة مهام الموظفين'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isEmployee && user?.canReceiveTaskRequests && (
              <button
                type="button"
                onClick={async () => {
                  setPushBusy(true);
                  try {
                    const res = await ensureWebPushSubscribed();
                    if (res.ok) {
                      setPushReady(true);
                      showSuccess('تم', 'تم تفعيل إشعارات المهام على الجهاز.');
                    } else {
                      showError('تعذر التفعيل', res.reason);
                    }
                  } finally {
                    setPushBusy(false);
                  }
                }}
                disabled={pushBusy || pushReady}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 text-sm"
              >
                {pushReady ? 'الإشعارات مفعّلة' : pushBusy ? 'جاري التفعيل...' : 'تفعيل إشعارات المهام'}
              </button>
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(true);
                  setShowEditModal(false);
                  setSelectedTask(null);
                  setSubscriberSearch('');
                  setSubscriberSearchDebounced('');
                  setSubscriberPage(1);
                  setSubscriberOptions([]);
                  setSubscriberDebtOnly(false);
                  setDebtCollection(false);
                  setCreateForm({
                    employeeUserId: '',
                    taskType: EmployeeTaskType.SubscriberInstallation,
                    subscriberId: '',
                    newSubscriberName: '',
                    newSubscriberPhone: '',
                    newSubscriberAddress: '',
                    maintenanceType: SubscriberMaintenanceKind.CableCut,
                    amountReceived: undefined,
                    taskTitle: '',
                    note: '',
                  });
                  setAmountReceptionSubscriberIds([]);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm"
              >
                <Plus className="h-4 w-4" />
                مهمة جديدة
              </button>
            )}
          </div>
        </div>

        {showAgentStatsStrip && (
          <div className="px-4 py-4 sm:px-5 sm:py-5 bg-gradient-to-b from-slate-50 to-white dark:from-gray-900/60 dark:to-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-right leading-relaxed">
              إحصائيات أنواع المهام وفق الوكيل والبحث وفلتر الحالة الحاليين (تشمل كل النتائج وليس الصفحة المعروضة فقط).
            </p>
            {stats ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <article className="rounded-xl border border-violet-200/90 bg-white p-3 sm:p-4 shadow-sm ring-1 ring-violet-100/80 dark:border-violet-800/45 dark:bg-violet-950/20 dark:ring-violet-900/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 text-right flex-1">
                      <p className="text-xs font-bold text-violet-700 dark:text-violet-300">تنصيب مشترك</p>
                      <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-violet-900 dark:text-violet-100">
                        {stats.subscriberInstallation}
                      </p>
                    </div>
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200"
                      aria-hidden
                    >
                      <Package className="h-5 w-5" strokeWidth={2} />
                    </div>
                  </div>
                </article>
                <article className="rounded-xl border border-sky-200/90 bg-white p-3 sm:p-4 shadow-sm ring-1 ring-sky-100/80 dark:border-sky-800/45 dark:bg-sky-950/20 dark:ring-sky-900/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 text-right flex-1">
                      <p className="text-xs font-bold text-sky-700 dark:text-sky-300">صيانة مشترك</p>
                      <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-sky-900 dark:text-sky-100">
                        {stats.subscriberMaintenance}
                      </p>
                    </div>
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200"
                      aria-hidden
                    >
                      <Wrench className="h-5 w-5" strokeWidth={2} />
                    </div>
                  </div>
                </article>
                <article className="rounded-xl border border-emerald-200/90 bg-white p-3 sm:p-4 shadow-sm ring-1 ring-emerald-100/80 dark:border-emerald-800/45 dark:bg-emerald-950/20 dark:ring-emerald-900/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 text-right flex-1">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">استلام مبلغ</p>
                      <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-100">
                        {stats.amountReception}
                      </p>
                    </div>
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"
                      aria-hidden
                    >
                      <Banknote className="h-5 w-5" strokeWidth={2} />
                    </div>
                  </div>
                </article>
                <article className="rounded-xl border border-amber-200/90 bg-white p-3 sm:p-4 shadow-sm ring-1 ring-amber-100/80 dark:border-amber-800/45 dark:bg-amber-950/20 dark:ring-amber-900/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 text-right flex-1">
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300">أخرى</p>
                      <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-amber-950 dark:text-amber-100">
                        {stats.other}
                      </p>
                    </div>
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                      aria-hidden
                    >
                      <ClipboardList className="h-5 w-5" strokeWidth={2} />
                    </div>
                  </div>
                </article>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[0, 1, 2, 3].map((k) => (
                  <div
                    key={k}
                    className="h-[5.25rem] sm:h-24 rounded-xl border border-gray-200/80 bg-gray-100/80 animate-pulse dark:border-gray-600 dark:bg-gray-700/50"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 p-4 sm:p-5">
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 text-right">بحث وتصفية القائمة</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isAdmin && (
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 text-right">
                معرّف الوكيل (Admin)
              </label>
              <input
                type="text"
                value={agentId}
                onChange={(e) => {
                  setAgentId(e.target.value);
                  setPage(1);
                }}
                placeholder="Agent ID — مطلوب"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}
          <div className={isAdmin ? '' : 'sm:col-span-2'}>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 text-right">
              بحث في المهام
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث في المهام..."
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 text-right">
              حالة المهمة
            </label>
            <select
              value={status}
              onChange={(e) => {
                const v = e.target.value;
                setStatus(v === '' ? '' : (parseInt(v, 10) as EmployeeTaskStatus));
                setPage(1);
              }}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">كل الحالات</option>
              <option value={EmployeeTaskStatus.Pending}>معلقة</option>
              <option value={EmployeeTaskStatus.Accepted}>مقبولة</option>
              <option value={EmployeeTaskStatus.Completed}>مكتملة</option>
              <option value={EmployeeTaskStatus.Rejected}>مرفوضة</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => refetch()}
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-800 dark:text-gray-100 text-sm font-medium"
            >
              تحديث القائمة
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isEmployee ? (
          <div className="p-3 sm:p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-10 w-10 animate-spin text-primary-500" aria-hidden />
                <p className="text-sm font-medium">جاري تحميل المهام...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center dark:border-gray-700 dark:bg-gray-800/30">
                <ClipboardList className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" aria-hidden />
                <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">لا توجد مهام حالياً</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((task) => (
                  <EmployeeTaskCard
                    key={task.id}
                    task={task}
                    variant="employee"
                    canManage={false}
                    formatNumber={formatNumber}
                    onAccept={() => acceptMutation.mutate(task.id)}
                    onReject={() => {
                      setRejectModalTask(task);
                      setRejectReasonDraft('');
                    }}
                    onDetails={() => {
                      setSelectedTask(task);
                      setShowDetailsModal(true);
                    }}
                    onCompleteInstallation={() => {
                      setSelectedTask(task);
                      setCompleteForm({ amountReceived: 0, note: '' });
                      setShowCompleteModal(true);
                    }}
                    onCompleteMaintenance={() => {
                      setSelectedTask(task);
                      setCompleteMaintenanceForm({ note: task.note || '' });
                      setShowCompleteModal(true);
                    }}
                    onCompleteAmount={() => {
                      setSelectedTask(task);
                      setCompleteAmountReceptionForm({
                        amountReceived: 0,
                        note: task.note || '',
                      });
                      setShowCompleteModal(true);
                    }}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-10 w-10 animate-spin text-primary-500" aria-hidden />
                <p className="text-sm font-medium">جاري تحميل المهام...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center dark:border-gray-700 dark:bg-gray-800/30">
                <ClipboardList className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" aria-hidden />
                <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">لا توجد مهام</p>
                {canManage && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">أنشئ مهمة جديدة من الزر أعلاه</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((task) => (
                  <EmployeeTaskCard
                    key={task.id}
                    task={task}
                    variant="manager"
                    canManage={canManage}
                    formatNumber={formatNumber}
                    onAccept={() => {}}
                    onReject={() => {}}
                    onDetails={() => {
                      setSelectedTask(task);
                      setShowDetailsModal(true);
                    }}
                    onCompleteInstallation={() => {}}
                    onCompleteMaintenance={() => {}}
                    onCompleteAmount={() => {}}
                    onEdit={() => {
                      setSelectedTask(task);
                      setSubscriberSearch('');
                      setSubscriberSearchDebounced('');
                      setSubscriberPage(1);
                      setSubscriberOptions([]);
                      setCreateForm({
                        employeeUserId: task.employeeUserId || '',
                        taskType: task.taskType,
                        subscriberId: task.subscriberId || '',
                        newSubscriberName: installationNewSubscriberName(task),
                        newSubscriberPhone: installationNewSubscriberPhone(task),
                        newSubscriberAddress: installationNewSubscriberAddress(task),
                        maintenanceType: task.maintenanceType ?? SubscriberMaintenanceKind.CableCut,
                        amountReceived: task.amountReceived ?? undefined,
                        taskTitle: task.taskTitle || '',
                        note: task.note || '',
                      });
                      setAmountReceptionSubscriberIds(task.subscriberId ? [task.subscriberId] : []);
                      setShowEditModal(true);
                    }}
                    onDelete={() => {
                      if (window.confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
                        deleteMutation.mutate(task.id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={Math.max(1, totalPages)}
          totalItems={totalItems}
          pageSize={pageSize}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onPageChange={setPage}
        />
      </div>

      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {showEditModal ? 'تعديل مهمة' : 'إضافة مهمة'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedTask(null);
                  setSubscriberSearch('');
                  setSubscriberSearchDebounced('');
                  setSubscriberPage(1);
                  setSubscriberOptions([]);
                  setAmountReceptionSubscriberIds([]);
                }}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <select
                  value={createForm.employeeUserId}
                  onChange={(e) => setCreateForm((p) => ({ ...p, employeeUserId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">اختر الموظف</option>
                  {employeesOptions.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} (@{emp.username})
                    </option>
                  ))}
                </select>
                {showEditModal && selectedTask?.status === EmployeeTaskStatus.Pending && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    يمكنك تغيير الموظف المكلّف؛ المهمة تبقى معلّقة ويُرسل إشعار للموظف الجديد.
                  </p>
                )}
              </div>

              <select
                value={createForm.taskType}
                onChange={(e) => {
                  setAmountReceptionSubscriberIds([]);
                  setSubscriberDebtOnly(false);
                  setDebtCollection(false);
                  setCreateForm((p) => ({
                    ...p,
                    taskType: parseInt(e.target.value, 10) as EmployeeTaskType,
                    subscriberId: '',
                    newSubscriberName: '',
                    newSubscriberPhone: '',
                    newSubscriberAddress: '',
                    maintenanceType: SubscriberMaintenanceKind.CableCut,
                    amountReceived: undefined,
                    taskTitle: '',
                  }));
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value={EmployeeTaskType.SubscriberInstallation}>تنصيب مشترك جديد</option>
                <option value={EmployeeTaskType.SubscriberMaintenance}>صيانة مشترك</option>
                <option value={EmployeeTaskType.Other}>اخرى</option>
                <option value={EmployeeTaskType.AmountReception}>استلام مبلغ</option>
              </select>

              {createForm.taskType === EmployeeTaskType.SubscriberInstallation && (
                <div className="space-y-2 rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    بيانات المشترك الجديد (تُحفظ مع المهمة؛ عند الإكمال يُرسل المبلغ المستلم والملاحظة فقط).
                  </p>
                  <input
                    type="text"
                    value={createForm.newSubscriberName ?? ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, newSubscriberName: e.target.value }))}
                    placeholder="اسم المشترك الجديد *"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="text"
                    value={createForm.newSubscriberPhone ?? ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, newSubscriberPhone: e.target.value }))}
                    placeholder="رقم الهاتف *"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    dir="ltr"
                  />
                  <textarea
                    value={createForm.newSubscriberAddress ?? ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, newSubscriberAddress: e.target.value }))}
                    rows={2}
                    placeholder="العنوان *"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
              {createForm.taskType === EmployeeTaskType.SubscriberMaintenance && (
                <div className="space-y-2">
                  <div className="space-y-2 rounded-md border border-gray-200 dark:border-gray-700 p-3">
                    <input
                      type="text"
                      value={subscriberSearch}
                      onChange={(e) => {
                        setSubscriberSearch(e.target.value);
                        setSubscriberPage(1);
                      }}
                      placeholder="ابحث عن المشترك..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                    <select
                      value={createForm.subscriberId ?? ''}
                      onChange={(e) => setCreateForm((p) => ({ ...p, subscriberId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">اختر المشترك *</option>
                      {createForm.subscriberId &&
                        !subscriberOptions.some((s) => s.id === createForm.subscriberId) &&
                        selectedTask?.subscriberDisplayName && (
                          <option value={createForm.subscriberId}>
                            {selectedTask.subscriberDisplayName}
                          </option>
                        )}
                      {subscriberOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.displayName} {s.phoneNumber ? `- ${s.phoneNumber}` : ''}
                          {s.totalDebt != null && s.totalDebt > 0
                            ? ` (${formatNumber(s.totalDebt, { suffix: ' د.ع' })})`
                            : ''}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {subscribersLoading ? 'جاري تحميل المشتركين...' : `عدد العناصر المحملة: ${subscriberOptions.length}`}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSubscriberPage((p) => p + 1)}
                        disabled={subscribersLoading || !(subscribersResponse?.hasNextPage ?? false)}
                        className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                      >
                        تحميل المزيد
                      </button>
                    </div>
                  </div>

                  <select
                    value={createForm.maintenanceType ?? SubscriberMaintenanceKind.CableCut}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        maintenanceType: parseInt(e.target.value, 10) as SubscriberMaintenanceKind,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value={SubscriberMaintenanceKind.CableCut}>قطع كيبل</option>
                    <option value={SubscriberMaintenanceKind.ServiceProblem}>مشكلة في الخدمة</option>
                    <option value={SubscriberMaintenanceKind.RouterPasswordChange}>تغيير رمز الراوتر</option>
                    <option value={SubscriberMaintenanceKind.Other}>اخرى</option>
                    <option value={SubscriberMaintenanceKind.PathSwitch}>تبديل مسار</option>
                    <option value={SubscriberMaintenanceKind.RouterReplacement}>استبدال راوتر</option>
                  </select>
                </div>
              )}
              {createForm.taskType === EmployeeTaskType.AmountReception && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={subscriberDebtOnly}
                        disabled={debtCollection}
                        onChange={(e) => {
                          setSubscriberDebtOnly(e.target.checked);
                          setSubscriberPage(1);
                          setSubscriberOptions([]);
                          setAmountReceptionSubscriberIds([]);
                        }}
                      />
                      ذوو الدين فقط (ترتيب حسب الدين)
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={debtCollection}
                        onChange={(e) => {
                          setDebtCollection(e.target.checked);
                          if (e.target.checked) {
                            setSubscriberDebtOnly(true);
                            setSubscriberPage(1);
                            setSubscriberOptions([]);
                            setAmountReceptionSubscriberIds([]);
                          }
                        }}
                      />
                      استلام ديون (استلام ديون اخرى)
                    </label>
                  </div>
                  {debtCollection && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      في وضع استلام الديون يتم طلب أصحاب الديون أولاً، وإذا لم يوجد ديون يعرض النظام كل المشتركين تلقائياً.
                    </p>
                  )}
                  <div className="space-y-2 rounded-md border border-gray-200 dark:border-gray-700 p-3">
                    <input
                      type="text"
                      value={subscriberSearch}
                      onChange={(e) => {
                        setSubscriberSearch(e.target.value);
                        setSubscriberPage(1);
                      }}
                      placeholder="ابحث عن المشترك..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />

                    {showEditModal ? (
                      <select
                        value={createForm.subscriberId ?? ''}
                        onChange={(e) => setCreateForm((p) => ({ ...p, subscriberId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">اختر المشترك *</option>
                        {createForm.subscriberId &&
                          !subscriberOptions.some((s) => s.id === createForm.subscriberId) &&
                          selectedTask?.subscriberDisplayName && (
                            <option value={createForm.subscriberId}>
                              {selectedTask.subscriberDisplayName}
                            </option>
                          )}
                        {subscriberOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.displayName} {s.phoneNumber ? `- ${s.phoneNumber}` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="max-h-52 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                        {subscriberOptions.map((s) => {
                          const checked = amountReceptionSubscriberIds.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setAmountReceptionSubscriberIds((prev) => {
                                    if (e.target.checked) return prev.includes(s.id) ? prev : [...prev, s.id];
                                    return prev.filter((id) => id !== s.id);
                                  });
                                }}
                              />
                              <span className="text-sm text-gray-800 dark:text-gray-200">
                                {s.displayName} {s.phoneNumber ? `- ${s.phoneNumber}` : ''}
                                {s.totalDebt != null && s.totalDebt > 0
                                  ? ` — دين: ${formatNumber(s.totalDebt, { suffix: ' د.ع' })}`
                                  : s.totalDebt != null && s.totalDebt === 0
                                    ? ' — بدون دين'
                                    : ''}
                              </span>
                            </label>
                          );
                        })}
                        {subscriberOptions.length === 0 && (
                          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                            {subscribersLoading ? 'جاري تحميل المشتركين...' : 'لا توجد نتائج.'}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {showEditModal
                          ? subscribersLoading
                            ? 'جاري تحميل المشتركين...'
                            : `عدد العناصر المحملة: ${subscriberOptions.length}`
                          : `المحددون: ${amountReceptionSubscriberIds.length}`}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSubscriberPage((p) => p + 1)}
                        disabled={subscribersLoading || !(subscribersResponse?.hasNextPage ?? false)}
                        className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                      >
                        تحميل المزيد
                      </button>
                    </div>
                  </div>
                  {amountReceptionSubscriberIds.length <= 1 && (
                    <input
                      type="number"
                      value={createForm.amountReceived ?? ''}
                      onChange={(e) =>
                        setCreateForm((p) => ({
                          ...p,
                          amountReceived: e.target.value === '' ? undefined : Number(e.target.value),
                        }))
                      }
                      placeholder="المبلغ (اختياري — لمشترك واحد فقط؛ عند عدة مشتركين يُسجَّل عند إكمال المهمة)"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                  )}
                  {amountReceptionSubscriberIds.length > 1 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      عند اختيار أكثر من مشترك لا يُرسل المبلغ عند الإنشاء؛ يسجّله الموظف لكل مهمة عند الإكمال.
                    </p>
                  )}
                </div>
              )}
              {createForm.taskType === EmployeeTaskType.Other && (
                <input
                  type="text"
                  value={createForm.taskTitle ?? ''}
                  onChange={(e) => setCreateForm((p) => ({ ...p, taskTitle: e.target.value }))}
                  placeholder="عنوان المهمة *"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              )}
              <textarea
                value={createForm.note ?? ''}
                onChange={(e) => setCreateForm((p) => ({ ...p, note: e.target.value }))}
                rows={2}
                placeholder="ملاحظة"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedTask(null);
                  setSubscriberSearch('');
                  setSubscriberSearchDebounced('');
                  setSubscriberPage(1);
                  setSubscriberOptions([]);
                  setAmountReceptionSubscriberIds([]);
                  setSubscriberDebtOnly(false);
                  setDebtCollection(false);
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const error = validateCreatePayload(createForm);
                  if (error) {
                    showError('خطأ', error);
                    return;
                  }
                  if (showEditModal && selectedTask) {
                    const updatePayload = buildUpdatePayload(createForm);
                    updateMutation.mutate({ id: selectedTask.id, payload: updatePayload });
                    return;
                  }
                  const normalized = normalizeTaskPayload(createForm);

                  if (normalized.taskType === EmployeeTaskType.AmountReception && showCreateModal) {
                    const selectedIds = amountReceptionSubscriberIds;
                    if (selectedIds.length === 0) {
                      showError('خطأ', 'اختر مشتركاً واحداً على الأقل.');
                      return;
                    }
                    const note = createForm.note?.trim();
                    const payload: EmployeeTaskCreateRequest = {
                      employeeUserId: createForm.employeeUserId.trim(),
                      taskType: EmployeeTaskType.AmountReception,
                      note: note || undefined,
                      taskDetails: note || undefined,
                      debtCollection: debtCollection ? true : undefined,
                    };
                    if (debtCollection) payload.taskTitle = 'استلام ديون';
                    if (selectedIds.length === 1) {
                      payload.subscriberId = selectedIds[0];
                      const amt = createForm.amountReceived;
                      if (amt != null && !Number.isNaN(amt) && amt > 0) payload.amountReceived = amt;
                    } else {
                      payload.subscriberIds = selectedIds;
                    }
                    createMutation.mutate(payload);
                    return;
                  }

                  createMutation.mutate(normalized);
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {showEditModal ? 'حفظ التعديل' : createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء المهمة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {selectedTask.taskType === EmployeeTaskType.SubscriberInstallation
                  ? 'إكمال مهمة تنصيب'
                  : selectedTask.taskType === EmployeeTaskType.SubscriberMaintenance
                    ? 'إكمال مهمة صيانة'
                    : 'إكمال مهمة استلام مبلغ'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedTask(null);
                }}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              {selectedTask.taskType === EmployeeTaskType.SubscriberInstallation && (
                <>
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 space-y-2 text-sm bg-gray-50/80 dark:bg-gray-700/30">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">المشترك الجديد (من المهمة)</p>
                    <p>
                      <span className="text-gray-500 dark:text-gray-400">الاسم: </span>
                      <span className="text-gray-900 dark:text-white">{installationNewSubscriberName(selectedTask) || '—'}</span>
                    </p>
                    <p>
                      <span className="text-gray-500 dark:text-gray-400">الهاتف: </span>
                      <span className="text-gray-900 dark:text-white" dir="ltr">
                        {installationNewSubscriberPhone(selectedTask) || '—'}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500 dark:text-gray-400">العنوان: </span>
                      <span className="text-gray-900 dark:text-white whitespace-pre-wrap">
                        {installationNewSubscriberAddress(selectedTask) || '—'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">المبلغ المستلم من المشترك (د.ع) *</label>
                    <input
                      type="number"
                      min={0}
                      value={completeForm.amountReceived === 0 ? '' : completeForm.amountReceived}
                      onChange={(e) =>
                        setCompleteForm((p) => ({
                          ...p,
                          amountReceived: e.target.value === '' ? 0 : Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <textarea
                    value={completeForm.note ?? ''}
                    onChange={(e) => setCompleteForm((p) => ({ ...p, note: e.target.value }))}
                    rows={3}
                    placeholder="ملاحظة عند الإكمال (اختياري)"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white w-full"
                  />
                </>
              )}

              {selectedTask.taskType === EmployeeTaskType.SubscriberMaintenance && (
                <textarea
                  value={completeMaintenanceForm.note ?? ''}
                  onChange={(e) => setCompleteMaintenanceForm((p) => ({ ...p, note: e.target.value }))}
                  rows={4}
                  placeholder="ملاحظة بعد التنفيذ"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              )}

              {selectedTask.taskType === EmployeeTaskType.AmountReception && (
                <>
                  <input
                    type="number"
                    value={completeAmountReceptionForm.amountReceived ?? 0}
                    onChange={(e) =>
                      setCompleteAmountReceptionForm((p) => ({
                        ...p,
                        amountReceived: Number(e.target.value || 0),
                      }))
                    }
                    placeholder="amountReceived"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                  <textarea
                    value={completeAmountReceptionForm.note ?? ''}
                    onChange={(e) => setCompleteAmountReceptionForm((p) => ({ ...p, note: e.target.value }))}
                    rows={3}
                    placeholder="ملاحظة (اختياري)"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedTask(null);
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-200"
              >
                إلغاء
              </button>
              {selectedTask.taskType === EmployeeTaskType.SubscriberInstallation && (
                <button
                  type="button"
                  onClick={() => {
                    const amt = completeForm.amountReceived;
                    if (typeof amt !== 'number' || Number.isNaN(amt) || amt < 0) {
                      showError('خطأ', 'أدخل المبلغ المستلم (رقم ≥ 0).');
                      return;
                    }
                    completeInstallationMutation.mutate({
                      id: selectedTask.id,
                      payload: {
                        amountReceived: amt,
                        note: (completeForm.note || '').trim() || undefined,
                      },
                    });
                  }}
                  disabled={completeInstallationMutation.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  حفظ الإكمال
                </button>
              )}

              {selectedTask.taskType === EmployeeTaskType.SubscriberMaintenance && (
                <button
                  type="button"
                  onClick={() => {
                    const note = (completeMaintenanceForm.note || '').trim();
                    if (!note) {
                      showError('خطأ', 'ملاحظة بعد التنفيذ مطلوبة.');
                      return;
                    }
                    const payload: EmployeeTaskCompleteMaintenanceRequest = { note };
                    completeMaintenanceMutation.mutate({ id: selectedTask.id, payload });
                  }}
                  disabled={completeMaintenanceMutation.isPending}
                  className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-md disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  حفظ الإكمال
                </button>
              )}

              {selectedTask.taskType === EmployeeTaskType.AmountReception && (
                <button
                  type="button"
                  onClick={() => {
                    if (!completeAmountReceptionForm.amountReceived || completeAmountReceptionForm.amountReceived <= 0) {
                      showError('خطأ', 'amountReceived مطلوب.');
                      return;
                    }
                    const payload: EmployeeTaskCompleteAmountReceptionRequest = {
                      amountReceived: completeAmountReceptionForm.amountReceived,
                      note: (completeAmountReceptionForm.note || '').trim() || undefined,
                    };
                    completeAmountReceptionMutation.mutate({ id: selectedTask.id, payload });
                  }}
                  disabled={completeAmountReceptionMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  حفظ الإكمال
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {rejectModalTask && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-3">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">رفض المهمة</h3>
              <button
                type="button"
                onClick={() => {
                  setRejectModalTask(null);
                  setRejectReasonDraft('');
                }}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3 text-sm">
              <p className="text-gray-600 dark:text-gray-300">
                أدخل سبب الرفض
              </p>
              <textarea
                value={rejectReasonDraft}
                onChange={(e) => setRejectReasonDraft(e.target.value.slice(0, 1000))}
                rows={5}
                placeholder="سبب الرفض…"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-left" dir="ltr">
                {rejectReasonDraft.length}/1000
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModalTask(null);
                  setRejectReasonDraft('');
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() => {
                  const reason = rejectReasonDraft.trim();
                  if (!reason) {
                    showError('خطأ', 'سبب الرفض مطلوب.');
                    return;
                  }
                  if (reason.length > 1000) {
                    showError('خطأ', 'السبب لا يتجاوز 1000 حرف.');
                    return;
                  }
                  rejectMutation.mutate({ id: rejectModalTask.id, payload: { reason } });
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Ban className="h-4 w-4" />
                {rejectMutation.isPending ? 'جاري التأكيد…' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">تفاصيل المهمة</h3>
              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTask(null);
                }}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3 text-sm">
              {selectedTask.taskType === EmployeeTaskType.SubscriberInstallation ? (
                <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                  <p className="text-gray-500 dark:text-gray-400">المشترك الجديد (من المهمة)</p>
                  <p className="text-gray-900 dark:text-white">
                    <span className="text-gray-500 dark:text-gray-400 text-xs block">الاسم</span>
                    {installationNewSubscriberName(selectedTask) || '—'}
                  </p>
                  <p className="text-gray-900 dark:text-white" dir="ltr">
                    <span className="text-gray-500 dark:text-gray-400 text-xs block text-right">الهاتف</span>
                    {installationNewSubscriberPhone(selectedTask) || '—'}
                  </p>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    <span className="text-gray-500 dark:text-gray-400 text-xs block">العنوان</span>
                    {installationNewSubscriberAddress(selectedTask) || '—'}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-gray-500 dark:text-gray-400">اسم المشترك</p>
                  <p className="text-gray-900 dark:text-white mt-1">
                    {selectedTask.subscriberDisplayName || selectedTask.subscriberName || '—'}
                  </p>
                </div>
              )}
              <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-gray-500 dark:text-gray-400">ملاحظة المهمة</p>
                <p className="text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">
                  {selectedTask.note || '—'}
                </p>
              </div>

              {(selectedTask.createdByUserName ||
                selectedTask.createdByUserId ||
                (selectedTask as { CreatedByUserName?: string }).CreatedByUserName ||
                (selectedTask as { CreatedByUserId?: string }).CreatedByUserId) && (
                <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-gray-500 dark:text-gray-400">أنشأ المهمة</p>
                  <p className="text-gray-900 dark:text-white mt-1">
                    {(selectedTask.createdByUserName ||
                      (selectedTask as { CreatedByUserName?: string }).CreatedByUserName ||
                      selectedTask.createdByUserId ||
                      (selectedTask as { CreatedByUserId?: string }).CreatedByUserId) ??
                      '—'}
                  </p>
                </div>
              )}

              {selectedTask.status === EmployeeTaskStatus.Rejected && (
                <div className="rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-3 space-y-2">
                  <p className="text-rose-800 dark:text-rose-200 font-semibold">رفض المهمة</p>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">سبب الرفض</p>
                    <p className="text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">
                      {selectedTask.rejectionReason ??
                        (selectedTask as { RejectionReason?: string | null }).RejectionReason ??
                        '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">تاريخ الرفض</p>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {formatTaskDate(
                        selectedTask.rejectedAt ?? (selectedTask as { RejectedAt?: string | null }).RejectedAt
                      )}
                    </p>
                  </div>
                </div>
              )}

              {(
                (selectedTask.status === EmployeeTaskStatus.Completed &&
                  selectedTask.taskType === EmployeeTaskType.SubscriberInstallation) ||
                !!selectedTask.completedSubscriberName ||
                !!selectedTask.completedPhoneNumber ||
                !!selectedTask.completedSignalNumber ||
                !!selectedTask.completedNote
              ) ? (
                <>
                  {selectedTask.taskType !== EmployeeTaskType.SubscriberMaintenance && (
                    <div className="pt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      تفاصيل إنجاز المهمة
                    </div>
                  )}
                  {selectedTask.taskType === EmployeeTaskType.SubscriberInstallation &&
                    selectedTask.status === EmployeeTaskStatus.Completed &&
                    selectedTask.amountReceived != null && (
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                        <p className="text-gray-500 dark:text-gray-400">المبلغ المستلم (د.ع)</p>
                        <p className="text-gray-900 dark:text-white mt-1">
                          {formatNumber(selectedTask.amountReceived, { suffix: ' د.ع' })}
                        </p>
                      </div>
                    )}
                  {(selectedTask.taskType === EmployeeTaskType.AmountReception ||
                    selectedTask.taskType === EmployeeTaskType.Other) && (
                    <>
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                        <p className="text-gray-500 dark:text-gray-400">اسم المشترك (منجز)</p>
                        <p className="text-gray-900 dark:text-white mt-1">
                          {selectedTask.completedSubscriberName || '—'}
                        </p>
                      </div>
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                        <p className="text-gray-500 dark:text-gray-400">رقم الهاتف</p>
                        <p className="text-gray-900 dark:text-white mt-1">{selectedTask.completedPhoneNumber || '—'}</p>
                      </div>
                      <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                        <p className="text-gray-500 dark:text-gray-400">رقم الإشارة</p>
                        <p className="text-gray-900 dark:text-white mt-1">{selectedTask.completedSignalNumber || '—'}</p>
                      </div>
                    </>
                  )}
                  {(selectedTask.completedNote ||
                    (selectedTask.taskType === EmployeeTaskType.SubscriberInstallation &&
                      selectedTask.status === EmployeeTaskStatus.Completed)) && (
                    <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                      <p className="text-gray-500 dark:text-gray-400">ملاحظة الإكمال</p>
                      <p className="text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">
                        {selectedTask.completedNote || '—'}
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTask(null);
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-200"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTasksPage;

