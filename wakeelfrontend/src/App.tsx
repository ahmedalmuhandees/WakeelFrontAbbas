import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthProvider } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DigitsProvider } from './contexts/DigitsContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { FeatureGuard } from './components/FeatureGuard';
import Layout from './components/Layout';
import NotificationContainer from './components/NotificationContainer';
import OfflineIndicator from './components/OfflineIndicator';
import { useAuth } from './contexts/AuthContext';
import { TenantPlanType, UserRole } from './types';

// Lazy load pages — تُحمّل فقط عند زيارة الصفحة (Code Splitting)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AgentRegistrationPage = lazy(() => import('./pages/AgentRegistrationPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const SystemPricingPage = lazy(() => import('./pages/SystemPricingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SubscribersPage = lazy(() => import('./pages/SubscribersPage'));
const SubscriberDetailsPage = lazy(() => import('./pages/SubscriberDetailsPage'));
const SubscriberInfoPage = lazy(() => import('./pages/SubscriberInfoPage'));
const PackagesPage = lazy(() => import('./pages/PackagesPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AccountsOtherDealerPage = lazy(() => import('./pages/AccountsOtherDealerPage'));
const SystemLogPage = lazy(() => import('./pages/SystemLogPage'));
const ReceiptsPage = lazy(() => import('./pages/ReceiptsPage'));
const BalancePage = lazy(() => import('./pages/BalancePage'));
const DebtsPage = lazy(() => import('./pages/DebtsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ExcelImportPage = lazy(() => import('./pages/ExcelImportPage'));
const ResellersPage = lazy(() => import('./pages/ResellersPage'));
const DealersPage = lazy(() => import('./pages/DealersPage'));
const DealerDebtsPage = lazy(() => import('./pages/DealerDebtsPage'));
const DealerBalanceTransfersPage = lazy(() => import('./pages/DealerBalanceTransfersPage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const EmployeeTasksPage = lazy(() => import('./pages/EmployeeTasksPage'));
const MaterialsPage = lazy(() => import('./pages/MaterialsPage'));
const MaterialsDisbursementPage = lazy(() => import('./pages/MaterialsDisbursementPage'));
const SystemMessagePage = lazy(() => import('./pages/SystemMessagePage'));
const OfficeExpensesPage = lazy(() => import('./pages/OfficeExpensesPage'));
const SalarySheetPage = lazy(() => import('./pages/SalarySheetPage'));
const MainAgentSubAgentsPage = lazy(() => import('./pages/MainAgentSubAgentsPage'));
const MainAgentSubAgentCreatePage = lazy(() => import('./pages/MainAgentSubAgentCreatePage'));
const MainAgentSubAgentEditPage = lazy(() => import('./pages/MainAgentSubAgentEditPage'));
const MainAgentSubAgentSubscribersPage = lazy(() => import('./pages/MainAgentSubAgentSubscribersPage'));
const MainAgentSubAgentRenewalsPage = lazy(() => import('./pages/MainAgentSubAgentRenewalsPage'));
const MainAgentSubAgentDebtsPage = lazy(() => import('./pages/MainAgentSubAgentDebtsPage'));
const MainAgentSubAgentDailyAccountPage = lazy(() => import('./pages/MainAgentSubAgentDailyAccountPage'));
const CustomerInvoicesPage = lazy(() => import('./pages/CustomerInvoicesPage'));
const AppSubscribersAccountsPage = lazy(() => import('./pages/AppSubscribersAccountsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** توجيه /admin إلى أول صفحة مسموح بها (للموظف بدون صلاحية لوحة التحكم → صفحة المشتركين) */
function AdminIndexRedirect() {
  const { user } = useAuth();
  if (user?.role === UserRole.Employee && !user?.canAccessSubscriberDashboard) {
    return <Navigate to="/admin/subscribers" replace />;
  }
  return <Navigate to="/admin/dashboard" replace />;
}

/** للموظف: إخفاء لوحة التحكم عند عدم الصلاحية — إعادة توجيه لصفحة المشتركين بدون رسالة */
function DashboardRoute() {
  const { user } = useAuth();
  if (user?.role === UserRole.Employee && !user?.canAccessSubscriberDashboard) {
    return <Navigate to="/admin/subscribers" replace />;
  }
  return <DashboardPage />;
}

/** للموظف بدون canAccessExpensesAndSalarySheet و canAccessSubscriberDashboard: إخفاء الباقات، موظفون، سجل الحركات، الحسابات، المصاريف، الإعدادات — إعادة توجيه بدون رسالة */
function RestrictedEmployeeRoute({ routePath, children }: { routePath: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const isRestricted =
    user?.role === UserRole.Employee &&
    user?.canAccessExpensesAndSalarySheet === false &&
    user?.canAccessSubscriberDashboard === false;
  const hiddenPaths = ['packages', 'employees', 'reports', 'settings'];
  const isHidden = hiddenPaths.includes(routePath) || routePath.startsWith('expenses');
  const allowEmployeesWithSalesPermission =
    routePath === 'employees' && !!user?.canManageMaterialsAndSales;
  const allowPackagesWithSubscriberActivation =
    routePath === 'packages' && !!user?.canActivateSubscriber;
  if (isRestricted && isHidden && !allowEmployeesWithSalesPermission && !allowPackagesWithSubscriberActivation) {
    return <Navigate to="/admin/subscribers" replace />;
  }
  return <>{children}</>;
}

/** صفحة مهام الموظفين: للموظف عند تفعيل استلام المهام أو إدارة مهام الموظفين */
function EmployeeTasksAccessRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (
    user?.role === UserRole.Employee &&
    !user?.canReceiveTaskRequests &&
    !user?.canManageEmployeeTasks &&
    !user?.canManageMaterialsAndSales
  ) {
    return <Navigate to="/admin/subscribers" replace />;
  }
  return <>{children}</>;
}

/** صفحات المواد والمبيعات: للموظف فقط عند تفعيل إدارة المبيعات والمواد */
function MaterialsAccessRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === UserRole.Employee && !user?.canManageMaterialsAndSales) {
    return <Navigate to="/admin/subscribers" replace />;
  }
  return <>{children}</>;
}

/** التجار وتحويلاتهم وديونهم: للموظف فقط عند تفعيل صلاحية التجار */
function EmployeeDealersAccessRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === UserRole.Employee && user?.canAccessDealers !== true) {
    return <Navigate to="/admin/subscribers" replace />;
  }
  return <>{children}</>;
}

/** تحويلات أرصدة التجار — مطابقة الباكند (أحد: حسابات، تجار، مواد/مبيعات) */
function EmployeeBalanceTransfersAccessRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== UserRole.Employee) return <>{children}</>;
  const ok =
    user.canAccessAccounts === true ||
    user.canAccessDealers === true ||
    user.canManageMaterialsAndSales === true;
  if (!ok) return <Navigate to="/admin/subscribers" replace />;
  return <>{children}</>;
}

/** فواتير العملاء: للموظف فقط عند تفعيل canAccessInvoices */
function EmployeeCustomerInvoicesAccessRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === UserRole.Employee && user?.canAccessInvoices !== true) {
    return <Navigate to="/admin/subscribers" replace />;
  }
  return <>{children}</>;
}

/** تطبيق كلاس ثيم VIP على مستوى الصفحة بالكامل */
function VipThemeClassManager() {
  const { user, features } = useAuth();
  const isVipRole =
    user?.role === UserRole.Agent || user?.role === UserRole.SubAgent || user?.role === UserRole.Employee;
  const isVipByFeature = features.includes('vip_test_api');
  const isVipByPlan = user?.tenantPlanType === TenantPlanType.Vip;
  const shouldEnableVipTheme = !!user && isVipRole && (isVipByFeature || isVipByPlan);

  React.useEffect(() => {
    const root = document.documentElement;
    if (shouldEnableVipTheme) root.classList.add('theme-vip');
    else root.classList.remove('theme-vip');
    return () => {
      root.classList.remove('theme-vip');
    };
  }, [shouldEnableVipTheme]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfirmationProvider>
          <DigitsProvider>
          <AuthProvider>
            <OfflineProvider>
            <VipThemeClassManager />
            <Router basename="/wakeel">
            <div className="App min-h-screen font-sans antialiased">
              <SpeedInsights />
              <OfflineIndicator />
              <NotificationContainer />
              <Suspense fallback={
                <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">جاري التحميل...</span>
                  </div>
                </div>
              }>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/system-pricing" element={<SystemPricingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register-agent" element={<AgentRegistrationPage />} />
                <Route path="/subscriber-info" element={<SubscriberInfoPage />} />
                
                {/* Redirect old dashboard route */}
                <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                
                {/* Protected Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<AdminIndexRedirect />} />
                  
                  {/* Dashboard - الوكيل الرئيسي يرى إحصائياته من getMainAgentDashboard؛ للموظف يظهر فقط بصلاحية canAccessSubscriberDashboard */}
                  <Route path="dashboard" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.MainAgent, UserRole.Employee, UserRole.Subscriber]}>
                      <DashboardRoute />
                    </ProtectedRoute>
                  } />
                  
                  {/* Subscribers - جميع الموظفين يرون الصفحة؛ من دون canViewAllSubscribers الـ API يرجع قائمة فارغة إلا مع البحث بالاسم */}
                  <Route path="subscribers/:subscriberId" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <SubscriberDetailsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="subscribers" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <SubscribersPage />
                    </ProtectedRoute>
                  } />
                  
                  
                  {/* Packages - مخفى عن الموظف المقيد (بدون صلاحية لوحة التحكم والمصاريف) */}
                  <Route path="packages" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <FeatureGuard hiddenWhenFeature="hide_subscription_pages" fallback={<Navigate to="/admin/subscribers" replace />}>
                        <RestrictedEmployeeRoute routePath="packages">
                          <PackagesPage />
                        </RestrictedEmployeeRoute>
                      </FeatureGuard>
                    </ProtectedRoute>
                  } />
                  {/* Materials - Admin, Agent, SubAgent، أو موظف بصلاحية المواد */}
                  <Route path="materials" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <MaterialsAccessRoute>
                        <MaterialsPage />
                      </MaterialsAccessRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="materials/disbursed" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <MaterialsAccessRoute>
                        <MaterialsDisbursementPage />
                      </MaterialsAccessRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="materials/sales-history" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <MaterialsAccessRoute>
                        <MaterialsDisbursementPage />
                      </MaterialsAccessRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="agents" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin]}>
                      <AgentsPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* Employees - مخفى عن الموظف المقيد */}
                  <Route path="employees" element={
                    <ProtectedRoute allowedRoles={[UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <RestrictedEmployeeRoute routePath="employees">
                        <EmployeesPage />
                      </RestrictedEmployeeRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="employees/tasks" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <EmployeeTasksAccessRoute>
                        <EmployeeTasksPage />
                      </EmployeeTasksAccessRoute>
                    </ProtectedRoute>
                  } />
                  
                  {/* Users - Available to Admin only */}
                  <Route path="users" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin]}>
                      <UsersPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* System Message - Admin only */}
                  <Route path="system-message" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin]}>
                      <SystemMessagePage />
                    </ProtectedRoute>
                  } />
                  
                  {/* SAS Sync - معطّل مؤقتاً
                  <Route path="sas-sync" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent]}>
                      <SasSyncPage />
                    </ProtectedRoute>
                  } />
                  */}
                  
                  {/* حسابات المشتركين + حسابات مشتركين الوكلاء */}
                  <Route path="reports/other-dealer" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <RestrictedEmployeeRoute routePath="reports">
                        <AccountsOtherDealerPage />
                      </RestrictedEmployeeRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="reports" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <RestrictedEmployeeRoute routePath="reports">
                        <ReportsPage />
                      </RestrictedEmployeeRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="reports/app-subscribers" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <RestrictedEmployeeRoute routePath="reports">
                        <AppSubscribersAccountsPage />
                      </RestrictedEmployeeRoute>
                    </ProtectedRoute>
                  } />

                  <Route path="activity-log" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent]}>
                      <SystemLogPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* Receipts - Admin, Agent, SubAgent, Employee */}
                  <Route path="receipts" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <ReceiptsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="balance" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <BalancePage />
                    </ProtectedRoute>
                  } />
                  <Route path="customer-invoices" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <EmployeeCustomerInvoicesAccessRoute>
                        <CustomerInvoicesPage />
                      </EmployeeCustomerInvoicesAccessRoute>
                    </ProtectedRoute>
                  } />

                  {/* Debts - Admin, Agent, SubAgent, Employee */}
                  <Route path="debts" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <DebtsPage />
                    </ProtectedRoute>
                  } />
                  {/* المصاريف - مخفى عن الموظف المقيد */}
                  <Route path="expenses/office" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <RestrictedEmployeeRoute routePath="expenses/office">
                        <OfficeExpensesPage />
                      </RestrictedEmployeeRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="expenses/salary-sheet" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <RestrictedEmployeeRoute routePath="expenses/salary-sheet">
                        <SalarySheetPage />
                      </RestrictedEmployeeRoute>
                    </ProtectedRoute>
                  } />
                  {/* الإعدادات (المظهر، الملف الشخصي، إلخ) - متاحة للوكيل الرئيسي أيضًا */}
                  <Route path="settings" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.MainAgent, UserRole.Employee]}>
                      <RestrictedEmployeeRoute routePath="settings">
                        <SettingsPage />
                      </RestrictedEmployeeRoute>
                    </ProtectedRoute>
                  } />
                  
                  {/* Excel Import - Available to Admin only */}
                  <Route path="excel-import" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin]}>
                      <ExcelImportPage />
                    </ProtectedRoute>
                  } />
                  {/* الرسيلرات (SAS credentials) - Admin only */}
                  <Route path="resellers" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin]}>
                      <ResellersPage />
                    </ProtectedRoute>
                  } />
                  <Route path="dealers" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <EmployeeDealersAccessRoute>
                        <DealersPage />
                      </EmployeeDealersAccessRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="dealers/debts" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <EmployeeDealersAccessRoute>
                        <DealerDebtsPage />
                      </EmployeeDealersAccessRoute>
                    </ProtectedRoute>
                  } />
                  <Route path="dealers/balance-transfers" element={
                    <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Agent, UserRole.SubAgent, UserRole.Employee]}>
                      <EmployeeBalanceTransfersAccessRoute>
                        <DealerBalanceTransfersPage />
                      </EmployeeBalanceTransfersAccessRoute>
                    </ProtectedRoute>
                  } />
                  {/* إدارة الوكلاء والأبراج — الوكيل الرئيسي فقط */}
                  <Route path="main-agent/sub-agents" element={
                    <ProtectedRoute allowedRoles={[UserRole.MainAgent]}>
                      <MainAgentSubAgentsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="main-agent/sub-agents/new" element={
                    <ProtectedRoute allowedRoles={[UserRole.MainAgent]}>
                      <MainAgentSubAgentCreatePage />
                    </ProtectedRoute>
                  } />
                  <Route path="main-agent/sub-agents/:id/edit" element={
                    <ProtectedRoute allowedRoles={[UserRole.MainAgent]}>
                      <MainAgentSubAgentEditPage />
                    </ProtectedRoute>
                  } />
                  <Route path="main-agent/sub-agents/subscribers" element={
                    <ProtectedRoute allowedRoles={[UserRole.MainAgent]}>
                      <MainAgentSubAgentSubscribersPage />
                    </ProtectedRoute>
                  } />
                  <Route path="main-agent/sub-agents/renewals" element={
                    <ProtectedRoute allowedRoles={[UserRole.MainAgent]}>
                      <MainAgentSubAgentRenewalsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="main-agent/sub-agents/debts" element={
                    <ProtectedRoute allowedRoles={[UserRole.MainAgent]}>
                      <MainAgentSubAgentDebtsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="main-agent/sub-agents/daily-account" element={
                    <ProtectedRoute allowedRoles={[UserRole.MainAgent]}>
                      <MainAgentSubAgentDailyAccountPage />
                    </ProtectedRoute>
                  } />
                </Route>
                
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
              </Suspense>
            </div>
            </Router>
            </OfflineProvider>
          </AuthProvider>
          </DigitsProvider>
        </ConfirmationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
