import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { TenantPlanType, UserRole } from '../types';
import { useMyAgent } from '../hooks/useMyAgent';
import { Clock } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Package,
  UserCheck,
  UserCog,
  UserPlus,
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  Settings,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Store,
  Wallet,
  Building2,
  Zap,
  CircleDollarSign,
  History,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void;
  isMobileOverlay?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse, onClose, isMobileOverlay }) => {
  const { user, logout, hasAnyRole, hasFeature, globalAccess } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [expandedByPath, setExpandedByPath] = useState<Record<string, boolean>>({});
  const loadAgentForSidebar =
    !!user &&
    (user.role === UserRole.Agent ||
      user.role === UserRole.SubAgent ||
      user.role === UserRole.Employee ||
      user.role === UserRole.MainAgent);
  const { data: agentInfo } = useMyAgent(loadAgentForSidebar);
  const daysLeft = useMemo(() => {
    if (!agentInfo?.subscriptionEndDate) return null;
    try {
      const end = new Date(agentInfo.subscriptionEndDate).getTime();
      const now = Date.now();
      const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  }, [agentInfo]);


  type SidebarMenuItem = {
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: UserRole[];
    children?: Array<{
      name: string;
      path: string;
      employeeRequiresTaskPermission?: boolean;
      /** للموظف: يُعرض فقط عند canAccessExpensesAndSalarySheet */
      employeeRequiresExpenseAccess?: boolean;
      /** للموظف: يُعرض فقط عند canAccessDealers */
      employeeRequiresDealerAccess?: boolean;
      /** يتطلب ميزة الخطة (مثل module_accounts) */
      requiredFeature?: string;
      /** إن وُجد: يُعرض فقط لهذه الأدوار */
      roles?: UserRole[];
      /** يتطلب canAccessInvoices وخطة Standard */
      requiresInvoiceAccess?: boolean;
    }>;
    requiredFeature?: string;
    hiddenWhenFeature?: string;
    /** يتطلب canAccessInvoices وخطة Standard (لعنصر رئيسي بدون أبناء) */
    requiresInvoiceAccess?: boolean;
  };

  const menuItems: SidebarMenuItem[] = [
    {
      name: 'لوحة التحكم',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      roles: [UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee, UserRole.Subscriber, UserRole.MainAgent]
    },
    {
      name: 'المكاتب الفرعية',
      path: '/admin/main-agent/sub-agents',
      icon: Building2,
      roles: [UserRole.MainAgent]
    },
    {
      name: 'المشتركين',
      path: '/admin/main-agent/sub-agents/subscribers',
      icon: Users,
      roles: [UserRole.MainAgent]
    },
    {
      name: 'التفعيلات',
      path: '/admin/main-agent/sub-agents/renewals',
      icon: Zap,
      roles: [UserRole.MainAgent]
    },
    {
      name: 'الديون',
      path: '/admin/main-agent/sub-agents/debts',
      icon: CreditCard,
      roles: [UserRole.MainAgent]
    },
    {
      name: 'الحسابات',
      path: '/admin/main-agent/sub-agents/daily-account',
      icon: BarChart3,
      roles: [UserRole.MainAgent]
    },
    {
      name: 'المشتركين',
      path: '/admin/subscribers',
      icon: Users,
      roles: [UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]
    },
    {
      name: 'التفعيلات',
      path: '/admin/receipts',
      icon: Zap,
      roles: [UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee],
    },
    {
      name: 'طلبات التفعيل',
      path: '/admin/activation-requests',
      icon: Clock,
      roles: [UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee],
    },
    {
      name: 'سجل النظام',
      path: '/admin/activity-log',
      icon: History,
      roles: [UserRole.Admin, UserRole.Agent, UserRole.SubAgent],
    },
    {
      name: 'الباقات',
      path: '/admin/packages',
      icon: Package,
      roles: [UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee],
      hiddenWhenFeature: 'hide_subscription_pages',
    },
    {
      name: 'إدارة الموظفين',
      path: '/admin/employees',
      icon: UserPlus,
      roles: [UserRole.Agent, UserRole.SubAgent, UserRole.Employee],
      children: [
        { name: 'عرض الموظفين', path: '/admin/employees' },
        { name: 'مهام الموظفين', path: '/admin/employees/tasks', employeeRequiresTaskPermission: true },
        {
          name: 'كشوفات الموظفين',
          path: '/admin/expenses/salary-sheet',
          employeeRequiresExpenseAccess: true,
        },
      ],
    },
    {
      name: 'المصاريف العامة',
      path: '/admin/expenses/office',
      icon: Wallet,
      roles: [UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee],
    },
    {
      name: 'الرصيد',
      path: '/admin/balance',
      icon: CircleDollarSign,
      roles: [UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee],
    },
    {
      name: 'الإعدادات',
      path: '/admin/settings',
      icon: Settings,
      roles: [UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.MainAgent, UserRole.Employee]
    },
    {
      name: 'الوكلاء',
      path: '/admin/agents',
      icon: UserCheck,
      roles: [UserRole.Admin]
    },
    {
      name: 'المستخدمين',
      path: '/admin/users',
      icon: UserCog,
      roles: [UserRole.Admin]
    },
    {
      name: 'رسالة النظام',
      path: '/admin/system-message',
      icon: MessageSquare,
      roles: [UserRole.Admin]
    },
    {
      name: 'الاستيراد',
      path: '/admin/excel-import',
      icon: FileSpreadsheet,
      roles: [UserRole.Admin]
    },
    {
      name: 'الرسيلرات',
      path: '/admin/resellers',
      icon: Store,
      roles: [UserRole.Admin]
    },
  ];

  /** الموظف بدون صلاحية لوحة التحكم والمصاريف: يُخفى عنه الباقات، إدارة الموظفين، سجل الحركات، الحسابات، المصاريف العامة، الإعدادات؛ ويُعرض له التفعيلات والديون */
  const isRestrictedEmployee =
    user?.role === UserRole.Employee &&
    user.canAccessExpensesAndSalarySheet === false &&
    user.canAccessSubscriberDashboard === false;
  const restrictedEmployeeHiddenPaths = [
    '/admin/packages',
    '/admin/reports',
    '/admin/reports/app-subscribers',
    '/admin/expenses/office',
    '/admin/settings',
  ];

  const normalizedMenuItems = menuItems.map((item) => {
    // الموظف: بدون صلاحية كشوفات/مصاريف — رابط مباشر «المهام» فقط (كالسابق)
    if (user?.role === UserRole.Employee && item.path === '/admin/employees') {
      const hasTasks = !!(
        user?.canReceiveTaskRequests ||
        user?.canManageEmployeeTasks ||
        user?.canManageMaterialsAndSales
      );
      const hasExpense = user?.canAccessExpensesAndSalarySheet === true;
      /** صلاحية المبيعات/المواد: إبقاء مجموعة «إدارة الموظفين» مع العرض والمهام (بدون طيّها إلى رابط مهام فقط). */
      if (user?.canManageMaterialsAndSales && item.children?.length) {
        const children = item.children.filter((c) => {
          if (c.path === '/admin/expenses/salary-sheet' && !hasExpense) return false;
          return true;
        });
        return { ...item, children };
      }
      if (hasTasks && !hasExpense) {
        return {
          ...item,
          name: 'المهام',
          path: '/admin/employees/tasks',
          children: undefined,
        };
      }
      if (hasExpense && item.children?.length) {
        const children = item.children.filter((c) => {
          if (c.path === '/admin/employees') return false;
          if (c.path === '/admin/employees/tasks' && !hasTasks) return false;
          if (c.path === '/admin/expenses/salary-sheet' && !hasExpense) return false;
          return true;
        });
        if (children.length === 1) {
          const only = children[0];
          if (only.path === '/admin/employees/tasks') {
            return { ...item, name: 'المهام', path: '/admin/employees/tasks', children: undefined };
          }
          if (only.path === '/admin/expenses/salary-sheet') {
            return {
              ...item,
              name: 'كشوفات الموظفين',
              path: '/admin/expenses/salary-sheet',
              children: undefined,
            };
          }
        }
        return { ...item, children };
      }
      return {
        ...item,
        name: 'المهام',
        path: '/admin/employees/tasks',
        children: undefined,
      };
    }
    return item;
  });

  const filteredMenuItems = normalizedMenuItems.filter((item) => {
    if (!hasAnyRole(item.roles)) return false;
    if (!globalAccess && item.requiredFeature && !hasFeature(item.requiredFeature)) return false;
    if (!globalAccess && item.hiddenWhenFeature && hasFeature(item.hiddenWhenFeature)) return false;
    if (user?.role === UserRole.Employee && item.path === '/admin/dashboard' && !user.canAccessSubscriberDashboard) return false;
    if (
      user?.role === UserRole.Employee &&
      item.path === '/admin/materials' &&
      !user?.canManageMaterialsAndSales
    ) {
      return false;
    }
    if (
      isRestrictedEmployee &&
      restrictedEmployeeHiddenPaths.includes(item.path) &&
      !(item.path === '/admin/packages' && user?.canActivateSubscriber)
    ) {
      return false;
    }
    if (
      item.requiresInvoiceAccess &&
      (user?.canAccessInvoices === false || user?.tenantPlanType === TenantPlanType.Vip)
    ) {
      return false;
    }
    return true;
  });

  // إذا كان الموظف يمتلك فقط صلاحية استلام المهام (بدون أي صلاحيات مشتركين):
  // نعرض له صفحة المهام فقط في الـ sidebar.
  const hasAnySubscriberPermission = !!(
    user?.canActivateSubscriber ||
    user?.canEditSubscriber ||
    user?.canDeleteSubscriber ||
    user?.canPayDebt ||
    user?.canViewAllSubscribers
  );
  const showOnlyEmployeeTasksInSidebar =
    user?.role === UserRole.Employee &&
    (!!user?.canReceiveTaskRequests || !!user?.canManageEmployeeTasks) &&
    !user?.canManageMaterialsAndSales &&
    !hasAnySubscriberPermission &&
    user?.canAccessExpensesAndSalarySheet !== true;
  const finalMenuItems = showOnlyEmployeeTasksInSidebar
    ? filteredMenuItems.filter((item) => item.path === '/admin/employees/tasks')
    : filteredMenuItems;

  const handleLogout = () => {
    logout();
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const cycleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <div className={`sidebar-shell bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 h-full flex flex-col ${
      !isMobileOverlay && (isCollapsed ? 'w-12 sm:w-16' : 'w-56 sm:w-64')
    } ${isMobileOverlay ? 'w-full' : ''}`}>
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="sidebar-header flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {isMobileOverlay ? (
            <>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">نظام الوكيل</h1>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="إغلاق القائمة"
              >
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 sm:p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>
              {!isCollapsed && (
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  نظام الوكيل
                </h1>
              )}
            </>
          )}
        </div>

        {/* User Info */}
        {!isCollapsed && user && (
          <div className="p-2 sm:p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-1 min-w-0 text-right">
                <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.fullName || 'مستخدم'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.role === UserRole.Admin ? 'مدير' :
                   user.role === UserRole.Agent ? 'وكيل' :
                   user.role === UserRole.SubAgent ? 'مدير ثانوي' :
                   user.role === UserRole.MainAgent ? 'وكيل رئيسي' :
                   user.role === UserRole.Employee ? 'موظف' : 'مشترك'}
                </p>
                {(user.role === UserRole.Agent || user.role === UserRole.SubAgent || user.role === UserRole.Employee) && daysLeft !== null && (
                  <div className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium
                    ${daysLeft <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : daysLeft <= 5 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                    <Clock className="h-3 w-3 ml-1" />
                    {daysLeft <= 0 ? 'انتهى الاشتراك' : `متبقي ${daysLeft} يوم`}
                  </div>
                )}
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <span className="text-primary-600 dark:text-primary-400 text-xs sm:text-sm font-semibold">
                  {user.fullName?.charAt(0) || '?'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <nav className="sidebar-nav flex-1 overflow-y-auto p-2 sm:p-4 space-y-1 sm:space-y-2 min-h-0">
          {finalMenuItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const isChildActive = hasChildren && item.children!.some((c) => location.pathname === c.path);
            const isExpanded = hasChildren && (expandedByPath[item.path] ?? isChildActive);

            if (hasChildren && (!isCollapsed || isMobileOverlay)) {
              return (
                <div key={item.path} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setExpandedByPath((prev) => ({ ...prev, [item.path]: !(prev[item.path] ?? isChildActive) }))}
                    className={`sidebar-menu-group w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-3 py-3 sm:py-2.5 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                      isChildActive ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {(!isCollapsed || isMobileOverlay) && (
                      <span className="text-sm font-medium flex-1 text-right">{item.name}</span>
                    )}
                    {isExpanded ? <ChevronUp className="h-5 w-5 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 flex-shrink-0" />}
                    <Icon className="h-5 w-5 flex-shrink-0" />
                  </button>
                  {isExpanded && item.children!
                    .filter((child) => {
                      /** تحويلات الرصيد: نفس شروط الباكند (حسابات / تجار / مواد) */
                      if (
                        user?.role === UserRole.Employee &&
                        child.path === '/admin/dealers/balance-transfers'
                      ) {
                        const ok =
                          user.canAccessAccounts === true ||
                          user.canAccessDealers === true ||
                          user.canManageMaterialsAndSales === true;
                        if (!ok) return false;
                      }
                      if (
                        child.path === '/admin/employees' &&
                        user?.role === UserRole.Employee &&
                        !user?.canManageMaterialsAndSales
                      ) {
                        return false;
                      }
                      if (
                        child.employeeRequiresTaskPermission &&
                        user?.role === UserRole.Employee &&
                        !user?.canReceiveTaskRequests &&
                        !user?.canManageEmployeeTasks &&
                        !user?.canManageMaterialsAndSales
                      ) {
                        return false;
                      }
                      if (
                        child.employeeRequiresExpenseAccess &&
                        user?.role === UserRole.Employee &&
                        !user?.canAccessExpensesAndSalarySheet
                      ) {
                        return false;
                      }
                      if (child.roles && !child.roles.includes(user?.role as UserRole)) {
                        return false;
                      }
                      if (
                        child.requiresInvoiceAccess &&
                        (user?.canAccessInvoices === false || user?.tenantPlanType === TenantPlanType.Vip)
                      ) {
                        return false;
                      }
                      if (child.requiredFeature && !globalAccess && !hasFeature(child.requiredFeature)) {
                        return false;
                      }
                      if (
                        child.employeeRequiresDealerAccess &&
                        user?.role === UserRole.Employee &&
                        user?.canAccessDealers !== true
                      ) {
                        return false;
                      }
                      if (isRestrictedEmployee && child.path === '/admin/reports/other-dealer') {
                        return false;
                      }
                      return true;
                    })
                    .map((child) => {
                    const isActive = location.pathname === child.path;
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={onClose}
                        className={`sidebar-menu-child flex items-center gap-2 sm:gap-3 px-3 sm:px-3 py-2 sm:py-2 rounded-lg transition-colors touch-manipulation min-h-[40px] mr-4 border-r-2 ${
                          isActive
                            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border-primary-500'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent'
                        }`}
                      >
                        {(!isCollapsed || isMobileOverlay) && (
                          <span className="text-sm font-medium flex-1 text-right">{child.name}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            }

            const isActive = !hasChildren && location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`sidebar-menu-link flex items-center gap-2 sm:gap-3 px-3 sm:px-3 py-3 sm:py-2.5 rounded-lg transition-colors touch-manipulation min-h-[44px] ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {(!isCollapsed || isMobileOverlay) && (
                  <span className="text-sm font-medium flex-1 text-right">{item.name}</span>
                )}
                <Icon className="h-5 w-5 flex-shrink-0" />
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="sidebar-footer p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 space-y-1 sm:space-y-2 flex-shrink-0">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={cycleTheme}
            className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-3 sm:py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation min-h-[44px] ${
              isCollapsed && !isMobileOverlay ? 'justify-center' : ''
            }`}
            title={`الثيم الحالي: ${theme === 'light' ? 'نهاري' : theme === 'dark' ? 'ليلي' : 'نظام'}`}
          >
            {(!isCollapsed || isMobileOverlay) && (
              <span className="text-sm flex-1 text-right">
                {theme === 'light' ? 'نهاري' : theme === 'dark' ? 'ليلي' : 'نظام'}
              </span>
            )}
            {getThemeIcon()}
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-3 sm:py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-manipulation min-h-[44px] ${
              isCollapsed && !isMobileOverlay ? 'justify-center' : ''
            }`}
          >
            {(!isCollapsed || isMobileOverlay) && (
              <span className="text-sm font-medium flex-1 text-right">تسجيل الخروج</span>
            )}
            <LogOut className="h-5 w-5 flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
